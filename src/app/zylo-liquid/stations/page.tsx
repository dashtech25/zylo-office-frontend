"use client";

import { AlertTriangle, Circle, Download, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Badge, Button, Card, EmptyState, Input, Select } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { CreateStationModal } from "./_components/CreateStationModal";
import { useStationsList } from "./_lib/useStationsList";

const STATUS_VALUES = ["all", "active", "maintenance", "inactive"] as const;

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function StationsListPage() {
  const t = useTranslations("zyloLiquid.stations");
  const tStatus = useTranslations("zyloLiquid.statusBar");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const data = useStationsList(currentOrganization?.id ?? null);

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_VALUES)[number]>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  function formatVolume(liters: number): string {
    return `${format.number(Math.round(liters))} L`;
  }

  function formatMoney(value: number, currencyCode: string): string {
    try {
      return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
    } catch {
      return `${format.number(Math.round(value))} ${currencyCode}`;
    }
  }

  const filteredRows = useMemo(() => {
    return data.rows.filter((row) => {
      if (statusFilter !== "all" && row.station.status !== statusFilter) return false;
      if (search.trim() && !row.station.name.toLowerCase().includes(search.trim().toLowerCase()) && !row.station.code.toLowerCase().includes(search.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [data.rows, statusFilter, search]);

  function handleExport() {
    const header = [t("columns.station"), t("columns.status"), t("columns.products"), t("columns.value")];
    const rows = filteredRows.map((row) => [
      row.station.name,
      t(`status.${row.station.status}`),
      row.products.map((p) => `${p.fuelProductName}: ${formatVolume(p.volumeLiters)}/${formatVolume(p.capacityLiters)}`).join(" | "),
      row.totalValue !== null && row.totalCurrencyCode ? formatMoney(row.totalValue, row.totalCurrencyCode) : "",
    ]);
    downloadCsv("stations.csv", [header, ...rows]);
  }

  const totalCapacityLiters = data.tanks.filter((t) => t.active).reduce((sum, t) => sum + (t.calibratedCapacityLiters ?? t.capacityLiters), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">{t("list.pageTitle")}</h1>
          <p className="mt-1 text-body-md text-text-muted">{t("list.pageSubtitle", { count: data.stations.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" aria-hidden />
            {t("list.export")}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("list.add")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border-subtle bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-5 text-body-sm">
          <span className="flex items-center gap-2 text-text">
            <Circle className="size-2 fill-success text-success" aria-hidden />
            {tStatus("stationsActive", { count: data.stationsActiveCount })}
          </span>
          <span className="flex items-center gap-2 text-text-muted">
            <Circle className="size-2 fill-text-disabled text-text-disabled" aria-hidden />
            {tStatus("stationsOffline", { count: data.stationsOfflineCount })}
          </span>
          <span className="flex items-center gap-2 text-warning">
            <AlertTriangle className="size-4" aria-hidden />
            {tStatus("alertsActive", { count: data.activeAlertsCount })}
          </span>
        </div>
      </div>

      {data.error && (
        <Card variant="default" className="border-error/30 bg-error-muted text-error">
          {data.error}
        </Card>
      )}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-40">
              <Select
                aria-label={t("list.filterStatus")}
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                options={STATUS_VALUES.map((value) => ({
                  value,
                  label: value === "all" ? t("list.filterAll") : t(`status.${value}`),
                }))}
              />
            </div>
            <div className="w-64">
              <Input icon={<Search className="size-4" aria-hidden />} placeholder={t("list.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <Card padding="none">
            <div className="overflow-x-auto p-5">
              <table className="w-full border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-caption font-semibold uppercase tracking-wide text-text-muted">
                    <th className="py-2 text-left">{t("columns.station")}</th>
                    <th className="py-2 text-left">{t("columns.status")}</th>
                    <th className="py-2 text-left">{t("columns.products")}</th>
                    <th className="py-2 text-right">{t("columns.value")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.station.id}
                      className="cursor-pointer border-b border-border-subtle/60 align-top hover:bg-surface-muted"
                      onClick={() => router.push(`/zylo-liquid/stations/${row.station.id}`)}
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/zylo-liquid/stations/${row.station.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-text hover:text-primary hover:underline"
                        >
                          {row.station.name}
                        </Link>
                        <p className="text-caption text-text-muted">{row.station.code}</p>
                      </td>
                      <td className="py-3 pr-4">
                        {row.station.status === "active" ? (
                          <Badge tone={row.online ? "success" : "neutral"} size="sm" dot>
                            {row.online ? t("status.online") : t("status.offline")}
                          </Badge>
                        ) : (
                          <Badge tone={row.station.status === "maintenance" ? "warning" : "neutral"} size="sm">
                            {t(`status.${row.station.status}`)}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col gap-1.5">
                          {row.products.length === 0 ? (
                            <span className="text-text-muted">—</span>
                          ) : (
                            row.products.map((p) => {
                              const rate = p.capacityLiters > 0 ? Math.round((p.volumeLiters / p.capacityLiters) * 100) : 0;
                              return (
                                <div key={p.fuelProductId} className="flex items-center gap-2">
                                  <Circle className="size-2 shrink-0" style={{ fill: p.displayColor ?? "var(--color-text-muted)", color: p.displayColor ?? undefined }} aria-hidden />
                                  <span className="w-16 shrink-0 font-medium text-text">{p.fuelProductName}</span>
                                  <span className="tabular-nums text-text-muted">
                                    {formatVolume(p.volumeLiters)} / {formatVolume(p.capacityLiters)}
                                  </span>
                                  <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-pill bg-surface-muted">
                                    <div className="h-full rounded-pill" style={{ width: `${Math.min(100, rate)}%`, background: p.displayColor ?? "var(--color-primary)" }} />
                                  </div>
                                  <span className="shrink-0 tabular-nums text-caption text-text-muted">{rate}%</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums text-text">
                        {row.totalValue !== null && row.totalCurrencyCode ? formatMoney(row.totalValue, row.totalCurrencyCode) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {data.networkSummary && (
                  <tfoot>
                    <tr className="bg-surface-muted font-semibold">
                      <td className="py-3 pl-2" colSpan={2}>
                        {t("list.totalNetwork")}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col gap-1">
                          {data.networkSummary.products.map((p) => {
                            const rate = totalCapacityLiters > 0 ? Math.round((p.totalVolumeLiters / totalCapacityLiters) * 100) : 0;
                            return (
                              <span key={p.fuelProductId} className="tabular-nums text-text-muted">
                                {p.fuelProductName}: {formatVolume(p.totalVolumeLiters)} ({rate}%)
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-right tabular-nums text-text">
                        {(() => {
                          const currencies = new Set(data.networkSummary.products.map((p) => p.currencyCode).filter((c): c is string => c !== null));
                          const total = data.networkSummary.products.reduce((sum, p) => sum + (p.totalMonetaryValue ?? 0), 0);
                          return currencies.size === 1 ? formatMoney(total, [...currencies][0]) : "—";
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {filteredRows.length === 0 && (
                <div className="py-6">
                  <EmptyState
                    icon={search || statusFilter !== "all" ? Search : AlertTriangle}
                    title={search || statusFilter !== "all" ? t("list.noResults") : t("empty")}
                    actionLabel={search ? t("list.clearSearch") : undefined}
                    onAction={search ? () => setSearch("") : undefined}
                  />
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {currentOrganization && (
        <CreateStationModal organizationId={currentOrganization.id} open={createOpen} onOpenChange={setCreateOpen} onCreated={data.reload} />
      )}
    </div>
  );
}
