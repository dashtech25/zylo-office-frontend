"use client";

import { Building2, Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Button, Card, CardSkeleton, EmptyState } from "@/shared/ui";

export default function OrganizationsPage() {
  const t = useTranslations("organizations");
  const { organizations, currentOrganization, loading, selectOrganization } = useOrganization();

  return (
    <div>
      <h1 className="text-h1 font-bold text-text">{t("title")}</h1>
      <p className="mt-1 text-body-md text-text-muted">{t("subtitle")}</p>

      {loading ? (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : organizations.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={Building2} title={t("emptyState.title")} description={t("emptyState.description")} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {organizations.map((organization) => {
            const isCurrent = organization.id === currentOrganization?.id;
            return (
              <Card key={organization.id} className="flex items-center justify-between" padding="sm">
                <div>
                  <p className="text-body-md font-semibold text-text">{organization.name}</p>
                  <p className="text-body-sm text-text-muted">{organization.slug}</p>
                </div>
                {isCurrent ? (
                  <span className="flex items-center gap-1.5 text-body-sm font-medium text-primary">
                    <Check className="size-4" aria-hidden />
                    {t("current")}
                  </span>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => selectOrganization(organization.id)}>
                    {t("select")}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
