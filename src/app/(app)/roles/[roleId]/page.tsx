"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { getRole, listPermissionsCatalog, updateRolePermissions, type Permission, type RoleDetail } from "@/core/api/rbac";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { usePermissions } from "@/core/rbac/PermissionContext";
import { Alert, Button, Card, Checkbox, Stack } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

const ROLE_MANAGE = "rbac.role.manage";

export default function RoleDetailPage() {
  const params = useParams<{ roleId: string }>();
  const t = useTranslations("administration.roles");
  const tCommon = useTranslations("common");
  const { currentOrganization } = useOrganization();
  const { can } = usePermissions();

  const [role, setRole] = useState<RoleDetail | null>(null);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = can(ROLE_MANAGE);

  const load = useCallback(async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      const [roleDetail, permissionsList] = await Promise.all([
        getRole(currentOrganization.id, params.roleId),
        listPermissionsCatalog(currentOrganization.id),
      ]);
      setRole(roleDetail);
      setCatalog(permissionsList);
      setSelectedCodes(new Set(roleDetail.permissionCodes));
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, params.roleId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(code: string) {
    setSaved(false);
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleSave() {
    if (!currentOrganization || !role) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await updateRolePermissions(currentOrganization.id, role.id, [...selectedCodes]);
      setRole(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !role) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }

  const isOwnerRole = role.code === "owner";
  const editable = canManage && !isOwnerRole;

  const byModule = new Map<string, Permission[]>();
  for (const permission of catalog) {
    const list = byModule.get(permission.moduleCode) ?? [];
    list.push(permission);
    byModule.set(permission.moduleCode, list);
  }

  return (
    <div>
      <Link href="/roles" className="text-body-sm font-medium text-primary hover:underline">
        {t("backToList")}
      </Link>

      <div className="mt-2 mb-6">
        <h1 className="text-h1 font-bold text-text">{role.name}</h1>
        <p className="mt-1 text-body-sm text-text-muted">{role.code}</p>
      </div>

      {isOwnerRole && <Alert tone="info">{t("ownerImmutable")}</Alert>}
      {!isOwnerRole && !canManage && <Alert tone="warning">{t("noPermissionToManage")}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">{t("saved")}</Alert>}

      <Card className="mt-4">
        <p className="mb-3 text-body-sm font-medium text-text">{t("permissionsCount", { count: selectedCodes.size })}</p>
        <Stack gap="md">
          {[...byModule.entries()].map(([moduleCode, permissions]) => (
            <div key={moduleCode}>
              <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-text-muted">{moduleCode}</p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {permissions.map((permission) => (
                  <Checkbox
                    key={permission.code}
                    checked={selectedCodes.has(permission.code)}
                    disabled={!editable}
                    onChange={() => toggle(permission.code)}
                    label={<span className="text-body-sm">{permission.description ?? permission.code}</span>}
                  />
                ))}
              </div>
            </div>
          ))}
        </Stack>
      </Card>

      {editable && (
        <div className="mt-4">
          <Button onClick={handleSave} loading={saving}>
            {t("save")}
          </Button>
        </div>
      )}
    </div>
  );
}
