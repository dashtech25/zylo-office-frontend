"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { assignRole, listMembers, listRoles, unassignRole, type OrganizationMember, type Role, type UserRoleAssignment } from "@/core/api/rbac";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { usePermissions } from "@/core/rbac/PermissionContext";
import { listStations, type Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, Button, Card, Modal, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableRowSkeleton } from "@/shared/ui";

import { GrantsModal } from "./GrantsModal";

const ROLE_MANAGE = "rbac.role.manage";
const GRANT_MANAGE = "rbac.grant.manage";

/** La portée d'attribution d'un rôle (§6/§7 de `processus-double-sources-
 * verite/{01,02}-*.md`) se limite aujourd'hui au type "station" — le seul
 * mécanisme concret et déjà câblé côté backend (require_permission_scoped*
 * sur Station/Tank/Alert/Delivery/LeakEvent, `list_visible_resource_ids`
 * pour le filtrage de listes). L'appel à `listStations` (module zylo-liquid)
 * depuis cette page globale est un couplage assumé et documenté, le temps
 * qu'un mécanisme générique de "ressources scopables par module" existe. */
interface UsersPageData {
  members: OrganizationMember[];
  roles: Role[];
  stations: Station[];
}

async function fetchUsersPage(organizationId: string): Promise<UsersPageData> {
  const [members, roles, stationsPage] = await Promise.all([
    listMembers(organizationId),
    listRoles(organizationId),
    listStations(organizationId).catch(() => ({ data: [], meta: { total: 0, limit: 0, offset: 0 } })),
  ]);
  return { members, roles, stations: stationsPage.data };
}

export default function UsersPage() {
  const t = useTranslations("administration.users");
  const tCommon = useTranslations("common");
  const { currentOrganization } = useOrganization();
  const { can } = usePermissions();
  const organizationId = currentOrganization?.id ?? null;

  const [assignTarget, setAssignTarget] = useState<OrganizationMember | null>(null);
  const [grantsTarget, setGrantsTarget] = useState<OrganizationMember | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedStationId, setSelectedStationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const canManage = can(ROLE_MANAGE);
  const canManageGrants = can(GRANT_MANAGE);

  // Migré vers React Query (audit performance/cache, cf. `QueryProvider`).
  const usersQuery = useQuery({
    queryKey: ["users", "list", organizationId],
    queryFn: () => fetchUsersPage(organizationId as string),
    enabled: !!organizationId,
  });
  const members = usersQuery.data?.members ?? [];
  const roles = usersQuery.data?.roles ?? [];
  const stations = usersQuery.data?.stations ?? [];
  const loading = !!organizationId && usersQuery.isPending;

  const stationNameById = new Map(stations.map((s) => [s.id, s.name]));

  function scopeLabel(role: UserRoleAssignment): string | null {
    if (!role.resourceType) return null;
    if (role.resourceType === "station") return stationNameById.get(role.resourceId ?? "") ?? role.resourceId;
    return `${role.resourceType} ${role.resourceId}`;
  }

  async function handleAssign() {
    if (!currentOrganization || !assignTarget || !selectedRoleId) return;
    setSaving(true);
    setAssignError(null);
    try {
      const scope = selectedStationId ? { resourceType: "station", resourceId: selectedStationId } : null;
      await assignRole(currentOrganization.id, assignTarget.userId, selectedRoleId, scope);
      setAssignTarget(null);
      setSelectedRoleId("");
      setSelectedStationId("");
      await usersQuery.refetch();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(member: OrganizationMember, role: UserRoleAssignment) {
    if (!currentOrganization) return;
    const label = scopeLabel(role);
    if (!window.confirm(t("removeRoleConfirm", { role: label ? `${role.name} (${label})` : role.name, user: member.fullName }))) return;
    await unassignRole(currentOrganization.id, role.assignmentId);
    await usersQuery.refetch();
  }

  return (
    <div>
      <h1 className="text-h1 font-bold text-text">{t("title")}</h1>
      <p className="mt-1 text-body-md text-text-muted">{t("subtitle")}</p>

      <Card className="mt-6" padding="none">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("columns.name")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.email")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.status")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.roles")}</TableHeaderCell>
              {(canManage || canManageGrants) && <TableHeaderCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={canManage || canManageGrants ? 5 : 4} />
              ))
            ) : (
            members.map((member) => (
              <TableRow key={member.userId}>
                <TableCell className="font-medium">{member.fullName}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Badge tone={member.status === "active" ? "success" : "neutral"} size="sm" dot>
                    {t(`status.${member.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {member.roles.length === 0 && <span className="text-caption text-text-muted">{t("noRoles")}</span>}
                    {member.roles.map((role) => {
                      const scope = scopeLabel(role);
                      return (
                        <Badge key={role.assignmentId} tone={scope ? "primary" : "secondary"} size="sm">
                          {role.name}
                          {scope && <span className="ml-1 opacity-80">· {scope}</span>}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRemove(member, role)}
                              className="ml-1.5 text-text-muted hover:text-error"
                              aria-label={t("removeRole")}
                            >
                              ×
                            </button>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                </TableCell>
                {(canManage || canManageGrants) && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canManageGrants && (
                        <Button variant="outline" size="sm" onClick={() => setGrantsTarget(member)}>
                          {t("grants")}
                        </Button>
                      )}
                      {canManage && (
                        <Button variant="outline" size="sm" onClick={() => setAssignTarget(member)}>
                          {t("assignRole")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </Card>

      {assignTarget && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) {
              setAssignTarget(null);
              setSelectedRoleId("");
              setSelectedStationId("");
              setAssignError(null);
            }
          }}
          closeLabel={tCommon("actions.close")}
          title={t("assignModalTitle", { user: assignTarget.fullName })}
          footer={
            <>
              <Button variant="outline" onClick={() => setAssignTarget(null)}>
                {tCommon("actions.cancel")}
              </Button>
              <Button onClick={handleAssign} loading={saving} disabled={!selectedRoleId}>
                {tCommon("actions.confirm")}
              </Button>
            </>
          }
        >
          <Stack gap="sm">
            {assignError && <p className="text-body-sm text-error">{assignError}</p>}
            <Select
              aria-label={t("selectRole")}
              value={selectedRoleId || "__none__"}
              onValueChange={(v) => setSelectedRoleId(v === "__none__" ? "" : v)}
              options={[{ value: "__none__", label: t("selectRole") }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
            />
            <div>
              <Select
                aria-label={t("selectScopeStation")}
                value={selectedStationId || "__all__"}
                onValueChange={(v) => setSelectedStationId(v === "__all__" ? "" : v)}
                options={[{ value: "__all__", label: t("scopeWholeOrganization") }, ...stations.map((s) => ({ value: s.id, label: s.name }))]}
              />
              <p className="mt-1 text-caption text-text-muted">{t("scopeHint")}</p>
            </div>
          </Stack>
        </Modal>
      )}

      {grantsTarget && currentOrganization && (
        <GrantsModal organizationId={currentOrganization.id} member={grantsTarget} onClose={() => setGrantsTarget(null)} />
      )}
    </div>
  );
}
