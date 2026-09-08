"use client";

import { Trash2, UserPlus, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { assignRole, listMembers, listRoles, unassignRole, type OrganizationMember, type Role } from "@/core/api/rbac";
import { Alert, Badge, Button, Card, CardSectionHeader, EmptyState, FormField, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

/** Domaine « Personnel » du Centre administratif — étend `StaffTab` (qui
 * reste la vue lecture seule utilisée dans la Vue d'ensemble) avec un
 * formulaire d'AFFECTATION scope-station : `assignRole` (RBAC) supporte déjà
 * `scope.resourceType="station"` — seule une UI pour l'appeler ainsi
 * manquait, aucun backend nouveau nécessaire. */
export function PersonnelSection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationAdmin.personnel");
  const tCommon = useTranslations("common");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const [members, roles] = await Promise.all([listMembers(organizationId), listRoles(organizationId)]);
    const stationMembers = members
      .map((m) => ({ member: m, stationRoles: m.roles.filter((r) => r.resourceType === "station" && r.resourceId === stationId) }))
      .filter((entry) => entry.stationRoles.length > 0);
    return { allMembers: members, roles, stationMembers };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, stationId, reloadKey]);
  const state = usePartData(load);

  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (!userId || !roleId) {
      setError(t("form.required"));
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      await assignRole(organizationId, userId, roleId, { resourceType: "station", resourceId: stationId });
      setUserId("");
      setRoleId("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(assignmentId: string) {
    await unassignRole(organizationId, assignmentId);
    setReloadKey((k) => k + 1);
  }

  return (
    <PartStateBox state={state}>
      {state.status === "ready" && (() => {
        const { allMembers, roles, stationMembers }: { allMembers: OrganizationMember[]; roles: Role[]; stationMembers: { member: OrganizationMember; stationRoles: OrganizationMember["roles"] }[] } = state.data;
        return (
          <div className="flex flex-col gap-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Card>
              <CardSectionHeader title={t("form.title")} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label={t("form.member")}>
                  {() => <Select aria-label={t("form.member")} value={userId || undefined} onValueChange={setUserId} placeholder={t("form.selectMember")} options={allMembers.map((m) => ({ value: m.userId, label: `${m.fullName} (${m.email})` }))} />}
                </FormField>
                <FormField label={t("form.role")}>
                  {() => <Select aria-label={t("form.role")} value={roleId || undefined} onValueChange={setRoleId} placeholder={t("form.selectRole")} options={roles.map((r) => ({ value: r.id, label: r.name }))} />}
                </FormField>
              </div>
              <Button className="mt-4" size="sm" onClick={handleAssign} loading={assigning}>
                <UserPlus className="size-4" aria-hidden />
                {t("form.submit")}
              </Button>
            </Card>

            {stationMembers.length === 0 ? (
              <EmptyState icon={Users} title={t("empty")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("table.member")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.roles")}</TableHeaderCell>
                    <TableHeaderCell></TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stationMembers.map(({ member, stationRoles }) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <p className="font-medium text-text">{member.fullName}</p>
                        <p className="text-caption text-text-muted">{member.email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {stationRoles.map((role) => (
                            <Badge key={role.assignmentId} tone="neutral">{role.name}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {stationRoles.map((role) => (
                            <button key={role.assignmentId} type="button" aria-label={t("table.unassign", { role: role.name })} onClick={() => handleUnassign(role.assignmentId)}>
                              <Trash2 className="size-3.5 text-text-muted hover:text-error" aria-hidden />
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })()}
    </PartStateBox>
  );
}
