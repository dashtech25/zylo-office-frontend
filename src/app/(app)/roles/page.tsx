"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";

import { createRole, listPermissionsCatalog, listRoles, type Permission, type Role } from "@/core/api/rbac";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { usePermissions } from "@/core/rbac/PermissionContext";
import { Button, Card, Checkbox, EmptyState, Input, Modal, Stack } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

const ROLE_MANAGE = "rbac.role.manage";

export default function RolesPage() {
  const t = useTranslations("administration.roles");
  const tCommon = useTranslations("common");
  const { currentOrganization } = useOrganization();
  const { can } = usePermissions();

  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = can(ROLE_MANAGE);

  const load = useCallback(async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      const [rolesList, permissionsList] = await Promise.all([
        listRoles(currentOrganization.id),
        listPermissionsCatalog(currentOrganization.id),
      ]);
      setRoles(rolesList);
      setCatalog(permissionsList);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(code: string) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleCreate() {
    if (!currentOrganization) return;
    setError(null);
    setSaving(true);
    try {
      await createRole(currentOrganization.id, { code, name, permissionCodes: [...selectedCodes] });
      setCreateOpen(false);
      setCode("");
      setName("");
      setSelectedCodes(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }

  const byModule = new Map<string, Permission[]>();
  for (const permission of catalog) {
    const list = byModule.get(permission.moduleCode) ?? [];
    list.push(permission);
    byModule.set(permission.moduleCode, list);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-body-md text-text-muted">{t("subtitle")}</p>
        </div>
        {canManage && <Button onClick={() => setCreateOpen(true)}>{t("create")}</Button>}
      </div>

      {roles.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={ShieldCheck} title={t("empty")} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Link key={role.id} href={`/roles/${role.id}`}>
              <Card className="h-full transition-shadow hover:shadow-elevated">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" aria-hidden />
                  <p className="font-semibold text-text">{role.name}</p>
                </div>
                <p className="mt-1 text-caption text-text-muted">{role.code}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        size="lg"
        closeLabel={tCommon("actions.close")}
        title={t("createModalTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tCommon("actions.cancel")}
            </Button>
            <Button onClick={handleCreate} loading={saving} disabled={!code || !name}>
              {tCommon("actions.confirm")}
            </Button>
          </>
        }
      >
        <Stack gap="sm">
          {error && <p className="text-body-sm text-error">{error}</p>}
          <Input placeholder={t("codeLabel")} aria-label={t("codeLabel")} value={code} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder={t("nameLabel")} aria-label={t("nameLabel")} value={name} onChange={(e) => setName(e.target.value)} />

          <div className="mt-2 max-h-96 overflow-y-auto">
            {[...byModule.entries()].map(([moduleCode, permissions]) => (
              <div key={moduleCode} className="mb-3">
                <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-text-muted">{moduleCode}</p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {permissions.map((permission) => (
                    <Checkbox
                      key={permission.code}
                      checked={selectedCodes.has(permission.code)}
                      onChange={() => toggle(permission.code)}
                      label={<span className="text-body-sm">{permission.description ?? permission.code}</span>}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-caption text-text-muted">{t("permissionsCount", { count: selectedCodes.size })}</p>
        </Stack>
      </Modal>
    </div>
  );
}
