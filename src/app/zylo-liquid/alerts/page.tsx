"use client";

import { AlertTriangle, Check } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Badge, Button, Card, EmptyState, Select } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useAlertsList, type AlertStatusFilter } from "./_lib/useAlertsList";

const STATUS_VALUES: AlertStatusFilter[] = ["active", "resolved", "all"];

export default function AlertsListPage() {
  const t = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>("active");
  const data = useAlertsList(currentOrganization?.id ?? null, statusFilter);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  async function handleResolve(alertId: string) {
    setResolvingId(alertId);
    try {
      await data.resolve(alertId);
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">{t("page.title")}</h1>
          <p className="mt-1 text-body-md text-text-muted">{t("page.subtitle", { count: data.activeCount })}</p>
        </div>
        <div className="w-44">
          <Select
            aria-label={t("page.filterStatus")}
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as AlertStatusFilter)}
            options={STATUS_VALUES.map((value) => ({
              value,
              label: t(`page.status.${value}`),
            }))}
          />
        </div>
      </div>

      {data.error && (
        <Card variant="default" className="border-error/30 bg-error-muted text-error">
          {data.error}
        </Card>
      )}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : data.rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={t("empty")} />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto p-5">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-border-subtle text-caption font-semibold uppercase tracking-wide text-text-muted">
                  <th className="py-2 text-left">{t("columns.type")}</th>
                  <th className="py-2 text-left">{t("columns.station")}</th>
                  <th className="py-2 text-left">{t("columns.tank")}</th>
                  <th className="py-2 text-left">{t("columns.triggeredAt")}</th>
                  <th className="py-2 text-right">{t("columns.value")}</th>
                  <th className="py-2 text-left">{t("columns.status")}</th>
                  <th className="py-2 text-right">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(({ alert, tank, station }) => (
                  <tr key={alert.id} className="border-b border-border-subtle/60 align-top">
                    <td className="py-3 pr-4 font-medium text-text">{t(`types.${alert.type}`)}</td>
                    <td className="py-3 pr-4">
                      {station ? (
                        <Link href={`/zylo-liquid/stations/${station.id}`} className="text-text hover:text-primary hover:underline">
                          {station.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {station && tank ? (
                        <Link href={`/zylo-liquid/stations/${station.id}/tanks/${tank.id}`} className="text-text hover:text-primary hover:underline">
                          {tank.displayName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-text-muted">{formatDateTime(alert.triggeredAt)}</td>
                    <td className="py-3 text-right tabular-nums text-text">
                      {alert.triggeredValue === null ? "—" : `${format.number(alert.triggeredValue, { maximumFractionDigits: 1 })} mm`}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={alert.status === "active" ? "error" : "neutral"} size="sm">
                        {t(`page.status.${alert.status}`)}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {alert.status === "active" && (
                        <Button variant="outline" size="sm" onClick={() => handleResolve(alert.id)} disabled={resolvingId === alert.id}>
                          <Check className="size-4" aria-hidden />
                          {t("page.resolve")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
