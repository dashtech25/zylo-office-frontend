"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { getRole, listPermissionsCatalog, updateRolePermissions, type Permission, type RoleDetail } from "@/core/api/rbac";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { usePermissions } from "@/core/rbac/PermissionContext";
import { Alert, Button, Card, Checkbox, Skeleton, Stack } from "@/shared/ui";

const ROLE_MANAGE = "rbac.role.manage";

interface RoleDetailData {
  role: RoleDetail;
  catalog: Permission[];
}

async function fetchRoleDetail(organizationId: string, roleId: string): Promise<RoleDetailData> {
  const [role, catalog] = await Promise.all([
    getRole(organizationId, roleId),
    listPermissionsCatalog(organizationId),
  ]);
  return { role, catalog };
}

export default function RoleDetailPage() {
  const params = useParams<{ roleId: string }>();
  const t = useTranslations("administration.roles");
  const { currentOrganization } = useOrganization();
  const { can } = usePermissions();
  const organizationId = currentOrganization?.id ?? null;

  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = can(ROLE_MANAGE);

  // Migré vers React Query (audit performance/cache, cf. `QueryProvider`).
  const roleQuery = useQuery({
    queryKey: ["roles", "detail", organizationId, params.roleId],
    queryFn: () => fetchRoleDetail(organizationId as string, params.roleId),
    enabled: !!organizationId,
  });
  const role = roleQuery.data?.role ?? null;
  const catalog = roleQuery.data?.catalog ?? [];
  const loading = !!organizationId && roleQuery.isPending;

  // La sélection locale part de `role.permissionCodes` dès que la donnée
  // arrive (ou change de rôle), puis vit indépendamment pendant l'édition.
  useEffect(() => {
    if (role) setSelectedCodes(new Set(role.permissionCodes));
  }, [role]);

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
      await updateRolePermissions(currentOrganization.id, role.id, [...selectedCodes]);
      await roleQuery.refetch();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !role) {
    return (
      <div>
        <Skeleton className="h-4 w-32" />
        <div className="mt-2 mb-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-1 h-3 w-40" />
        </div>
        <Card className="mt-4">
          <Skeleton className="mb-3 h-4 w-48" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
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
