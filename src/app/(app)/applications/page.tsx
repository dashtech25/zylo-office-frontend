"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { activateModule, deactivateModule, listOrganizationModules } from "@/core/api/modules";
import { ApiError } from "@/core/api/client";
import { getModuleIcon } from "@/core/modules/moduleIcons";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert, Badge, Button, Card, CardSkeleton, EmptyState, Modal } from "@/shared/ui";
import { LayoutGrid } from "lucide-react";

const STATUS_TONE = { active: "success", inactive: "neutral", trial: "info" } as const;

export default function ApplicationsPage() {
  const t = useTranslations("applications");
  const tCommon = useTranslations("common");
  const { currentOrganization, loading: organizationLoading } = useOrganization();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [confirmingCode, setConfirmingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const organizationId = currentOrganization?.id ?? null;

  // Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
  // revenir sur cette page après l'avoir quittée affiche instantanément la
  // dernière donnée connue au lieu de tout recharger.
  const modulesQuery = useQuery({
    queryKey: ["applications", "organization-modules", organizationId],
    queryFn: () => listOrganizationModules(organizationId as string),
    enabled: !!organizationId,
  });
  const loading = !!organizationId && modulesQuery.isPending;
  const modules = useMemo(() => modulesQuery.data ?? [], [modulesQuery.data]);

  const confirmingModule = useMemo(
    () => modules.find((module) => module.moduleCode === confirmingCode) ?? null,
    [modules, confirmingCode]
  );

  async function handleInstall(moduleCode: string) {
    if (!currentOrganization) return;
    setError(null);
    setPendingCode(moduleCode);
    try {
      await activateModule(currentOrganization.id, moduleCode);
      await modulesQuery.refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("states.error"));
    } finally {
      setPendingCode(null);
    }
  }

  async function handleUninstall(moduleCode: string) {
    if (!currentOrganization) return;
    setError(null);
    setPendingCode(moduleCode);
    try {
      await deactivateModule(currentOrganization.id, moduleCode);
      await modulesQuery.refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("states.error"));
    } finally {
      setPendingCode(null);
      setConfirmingCode(null);
    }
  }

  if (organizationLoading || loading) {
    return (
      <div>
        <h1 className="text-h1 font-bold text-text">{t("title")}</h1>
        <p className="mt-1 text-body-md text-text-muted">{t("subtitle")}</p>
        <div className="mt-6 flex flex-wrap gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[300px]">
              <CardSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return <EmptyState icon={LayoutGrid} title={t("title")} description={t("subtitle")} />;
  }

  return (
    <div>
      <h1 className="text-h1 font-bold text-text">{t("title")}</h1>
      <p className="mt-1 text-body-md text-text-muted">{t("subtitle")}</p>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      {modules.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={LayoutGrid} title={tCommon("states.empty")} />
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-4">
          {modules.map((module) => {
            const Icon = getModuleIcon(module.moduleCode);
            const isPending = pendingCode === module.moduleCode;
            return (
              <Card key={module.moduleCode} className="flex w-[300px] flex-col" padding="none">
                <div className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-10 items-center justify-center rounded-[8px] bg-primary-muted text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <Badge tone={STATUS_TONE[module.status]}>{t(`status.${module.status}`)}</Badge>
                  </div>
                  <h3 className="mt-3 text-body-lg font-semibold text-text">{module.name}</h3>
                  {module.description && (
                    <p className="mt-1.5 text-body-sm text-text-muted">{module.description}</p>
                  )}
                  <p className="mt-2 text-caption text-text-muted">{t("version", { version: module.version })}</p>
                  <div className="mt-4">
                    {module.status === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={isPending}
                        onClick={() => setConfirmingCode(module.moduleCode)}
                      >
                        {t("actions.uninstall")}
                      </Button>
                    ) : (
                      <Button size="sm" loading={isPending} onClick={() => handleInstall(module.moduleCode)}>
                        {t("actions.install")}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={confirmingModule !== null}
        onOpenChange={(open) => !open && setConfirmingCode(null)}
        title={confirmingModule?.name ?? ""}
        description={t("confirmUninstall")}
        closeLabel={tCommon("actions.close")}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirmingCode(null)}>
              {tCommon("actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={pendingCode === confirmingCode}
              onClick={() => confirmingCode && handleUninstall(confirmingCode)}
            >
              {t("actions.uninstall")}
            </Button>
          </>
        }
      />
    </div>
  );
}
