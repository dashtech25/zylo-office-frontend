"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import {
  createGrant,
  listPermissionsCatalog,
  listUserGrants,
  revokeGrant,
  type OrganizationMember,
  type Permission,
  type PermissionGrant,
} from "@/core/api/rbac";
import { Badge, Button, EmptyState, Input, Modal, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";
import { ShieldAlert } from "lucide-react";

/** Modale dédiée aux grants individuels (allow/deny) d'un utilisateur —
 * distincte de l'attribution de rôle (page Utilisateurs) : c'est ici que se
 * matérialise le principe central de `formation/role_permission.md` §0
 * ("un rôle n'est qu'un point de départ, jamais une prison") — un refus ou
 * un octroi posé ici prime toujours sur ce que le rôle de l'utilisateur
 * accorde par ailleurs (§5.4 du document d'architecture RBAC). Colocalisée
 * dans `screens/users/` : un seul écran l'utilise aujourd'hui. */
export function GrantsModal({
  organizationId,
  member,
  onClose,
}: {
  organizationId: string;
  member: OrganizationMember;
  onClose: () => void;
}) {
  const t = useTranslations("administration.grants");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const [grants, setGrants] = useState<PermissionGrant[]>([]);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [permissionCode, setPermissionCode] = useState("");
  const [effect, setEffect] = useState<"allow" | "deny">("deny");
  const [resourceType, setResourceType] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [auditNote, setAuditNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [grantsList, catalogList] = await Promise.all([
        listUserGrants(organizationId, member.userId),
        listPermissionsCatalog(organizationId),
      ]);
      setGrants(grantsList);
      setCatalog(catalogList);
    } finally {
      setLoading(false);
    }
  }, [organizationId, member.userId]);

  useEffect(() => {
    load();
  }, [load]);

  const codeById = new Map(catalog.map((p) => [p.id, p.code]));

  async function handleCreate() {
    if (!permissionCode) return;
    setError(null);
    setSaving(true);
    try {
      await createGrant(organizationId, {
        userId: member.userId,
        permissionCode,
        effect,
        resourceType: resourceType || null,
        resourceId: resourceType ? resourceId || null : null,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        auditNote: auditNote || null,
      });
      setPermissionCode("");
      setResourceType("");
      setResourceId("");
      setValidUntil("");
      setAuditNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(grant: PermissionGrant) {
    if (!window.confirm(t("revokeConfirm"))) return;
    await revokeGrant(organizationId, grant.id);
    await load();
  }

  function formatDate(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const activeGrants = grants.filter((g) => !g.revokedAt);

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} size="xl" closeLabel={tCommon("actions.close")} title={t("title", { user: member.fullName })}>
      <Stack>
        <p className="text-body-sm text-text-muted">{t("subtitle")}</p>

        {loading ? (
          <PageSpinner label={tCommon("states.loading")} />
        ) : activeGrants.length === 0 ? (
          <EmptyState icon={ShieldAlert} title={t("empty")} />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("columns.permission")}</TableHeaderCell>
                <TableHeaderCell>{t("columns.effect")}</TableHeaderCell>
                <TableHeaderCell>{t("columns.scope")}</TableHeaderCell>
                <TableHeaderCell>{t("columns.validUntil")}</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {activeGrants.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell className="font-mono text-caption">{codeById.get(grant.permissionId) ?? grant.permissionId}</TableCell>
                  <TableCell>
                    <Badge tone={grant.effect === "deny" ? "error" : "success"} size="sm">
                      {t(`effect.${grant.effect}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-caption text-text-muted">
                    {grant.resourceType ? `${grant.resourceType} = ${grant.resourceId}` : t("scopeOrgWide")}
                  </TableCell>
                  <TableCell className="text-caption text-text-muted">{grant.validUntil ? formatDate(grant.validUntil) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleRevoke(grant)}>
                      {t("revoke")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-2 border-t border-border-subtle pt-4">
          <p className="mb-2 text-body-sm font-semibold text-text">{t("addTitle")}</p>
          {error && <p className="mb-2 text-body-sm text-error">{error}</p>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select
              aria-label={t("columns.permission")}
              value={permissionCode || "__none__"}
              onValueChange={(v) => setPermissionCode(v === "__none__" ? "" : v)}
              options={[{ value: "__none__", label: t("selectPermission") }, ...catalog.map((p) => ({ value: p.code, label: p.description ?? p.code }))]}
            />
            <Select
              aria-label={t("columns.effect")}
              value={effect}
              onValueChange={(v) => setEffect(v as "allow" | "deny")}
              options={[
                { value: "deny", label: t("effect.deny") },
                { value: "allow", label: t("effect.allow") },
              ]}
            />
            <Input placeholder={t("resourceTypePlaceholder")} aria-label={t("resourceTypePlaceholder")} value={resourceType} onChange={(e) => setResourceType(e.target.value)} />
            <Input
              placeholder={t("resourceIdPlaceholder")}
              aria-label={t("resourceIdPlaceholder")}
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              disabled={!resourceType}
            />
            <Input type="date" aria-label={t("validUntilLabel")} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            <Input placeholder={t("auditNotePlaceholder")} aria-label={t("auditNotePlaceholder")} value={auditNote} onChange={(e) => setAuditNote(e.target.value)} />
          </div>
          <div className="mt-3">
            <Button onClick={handleCreate} loading={saving} disabled={!permissionCode}>
              {t("add")}
            </Button>
          </div>
        </div>
      </Stack>
    </Modal>
  );
}
