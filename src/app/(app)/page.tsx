"use client";

import { ArrowRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { listOrganizationModules } from "@/core/api/modules";
import { getModuleIcon } from "@/core/modules/moduleIcons";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { Card, CardSkeleton, EmptyState, Skeleton } from "@/shared/ui";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { currentOrganization, loading: organizationLoading } = useOrganization();
  const organizationId = currentOrganization?.id ?? null;

  // Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
  // revenir sur le tableau de bord après l'avoir quitté affiche
  // instantanément la dernière donnée connue au lieu de tout recharger.
  const modulesQuery = useQuery({
    queryKey: ["dashboard", "organization-modules", organizationId],
    queryFn: () => listOrganizationModules(organizationId as string),
    enabled: !!organizationId,
  });
  const modules = modulesQuery.data ?? [];
  const loading = !!organizationId && modulesQuery.isPending;

  if (organizationLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <EmptyState icon={LayoutGrid} title={t("noOrganization.title")} description={t("noOrganization.description")} />
    );
  }

  const activeModules = modules.filter((module) => module.status === "active");

  return (
    <div>
      <h1 className="text-h1 font-bold text-text">{t("title")}</h1>
      <p className="mt-1 text-body-md text-text-muted">{t("subtitle")}</p>

      <h2 className="mt-8 text-h2 font-semibold text-text">{t("sectionTitle")}</h2>

      {loading ? (
        <div className="mt-4 flex flex-wrap gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[300px]">
              <CardSkeleton />
            </div>
          ))}
        </div>
      ) : activeModules.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={LayoutGrid}
            title={t("emptyState.title")}
            description={t("emptyState.description")}
            actionLabel={t("emptyState.action")}
            onAction={() => {
              window.location.href = "/applications";
            }}
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-4">
          {activeModules.map((module) => {
            const Icon = getModuleIcon(module.moduleCode);
            return (
              <Card key={module.moduleCode} className="flex w-[300px] flex-col" padding="none">
                <div className="flex flex-col p-5">
                  <span className="flex size-10 items-center justify-center rounded-[8px] bg-primary-muted text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-body-lg font-semibold text-text">{module.name}</h3>
                  {module.description && (
                    <p className="mt-1.5 text-body-sm text-text-muted">{module.description}</p>
                  )}
                  <Link
                    href={`/${module.moduleCode.replace(/_/g, "-")}`}
                    className="mt-4 inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
                  >
                    {t("openLink")}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
