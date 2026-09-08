"use client";

import { AlertTriangle, Building2, ChevronDown, ChevronUp, Droplet, Package, Truck, Wallet, Wifi } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Badge, Card, Kpi, PageHeader, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Tooltip } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";
import { cn } from "@/shared/lib/cn";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatPercent } from "@/modules/zylo-liquid/utils/formatPercent";

import { KpiLabel } from "./KpiLabel";
import { useReportsData, type ReportsPeriod, type StationReportRow } from "./useReportsData";

const PERIODS: ReportsPeriod[] = ["today", "7d", "30d", "90d"];

type SortKey = "fillRate" | "alerts" | "deliveries" | "availability";
type SortDirection = "asc" | "desc";

function sortRows(rows: StationReportRow[], key: SortKey, direction: SortDirection): StationReportRow[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let av = 0;
    let bv = 0;
    if (key === "fillRate") {
      av = a.fillRatePct ?? -1;
      bv = b.fillRatePct ?? -1;
    } else if (key === "alerts") {
      av = a.activeAlertsCount;
      bv = b.activeAlertsCount;
    } else if (key === "deliveries") {
      av = a.deliveredVolumeLiters;
      bv = b.deliveredVolumeLiters;
    } else if (key === "availability") {
      av = a.tankCount > 0 ? a.onlineTankCount / a.tankCount : -1;
      bv = b.tankCount > 0 ? b.onlineTankCount / b.tankCount : -1;
    }
    return (av - bv) * sign;
  });
}

/** Espace Rapports & KPI — première version réelle, construite exactement
 * sur le périmètre validé dans `station_kpi.md` (racine `zylo-office/`) :
 * uniquement des indicateurs calculables avec les données Niveau 1
 * réellement en base (télémétrie de cuves, alertes, livraisons détectées,
 * tests de fuite) — jamais une estimation de vente/CA/marge, absentes du
 * backend (voir `station_kpi.md` §0.4/§17). Chaque information porte une
 * info-bulle au survol (`KpiLabel`/en-têtes de colonne) expliquant ce
 * qu'elle permet concrètement de savoir, conformément à la demande. */
export default function RapportsScreen() {
  const t = useTranslations("zyloLiquid.rapports");
  const tStationsStatus = useTranslations("zyloLiquid.stations.status");
  const tAlertTypes = useTranslations("zyloLiquid.alerts.types");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization, loading: organizationLoading } = useOrganization();

  const [period, setPeriod] = useState<ReportsPeriod>("today");
  const [sortKey, setSortKey] = useState<SortKey>("fillRate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const data = useReportsData(currentOrganization?.id ?? null, period);

  function formatVolume(liters: number): string {
    return `${formatLiters(liters)} L`;
  }

  function formatMoney(value: number, currencyCode: string): string {
    try {
      return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
    } catch {
      return `${format.number(Math.round(value))} ${currencyCode}`;
    }
  }

  const sortedRows = useMemo(() => sortRows(data.stationRows, sortKey, sortDirection), [data.stationRows, sortKey, sortDirection]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function SortHeader({ sortKeyValue, label, help }: { sortKeyValue: SortKey; label: string; help: string }) {
    const active = sortKey === sortKeyValue;
    return (
      <button type="button" onClick={() => toggleSort(sortKeyValue)} className="inline-flex items-center gap-1 hover:text-text">
        <KpiLabel label={label} help={help} />
        {active && (sortDirection === "asc" ? <ChevronUp className="size-3" aria-hidden /> : <ChevronDown className="size-3" aria-hidden />)}
      </button>
    );
  }

  if (organizationLoading) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }

  const totalRatePct = data.totalCapacityLiters > 0 ? ((data.networkSummary?.totalVolumeLiters ?? 0) / data.totalCapacityLiters) * 100 : null;
  const atgAvailabilityPct = data.activeTankCount > 0 ? (data.onlineTankCount / data.activeTankCount) * 100 : null;

  const productCurrencies = new Set((data.networkSummary?.products ?? []).map((p) => p.currencyCode).filter((c): c is string => c !== null));
  const totalMonetaryValue =
    productCurrencies.size === 1
      ? (data.networkSummary?.products ?? []).reduce((sum, p) => sum + (p.totalMonetaryValue ?? 0), 0)
      : null;
  const totalMonetaryCurrency = productCurrencies.size === 1 ? [...productCurrencies][0] : null;

  const lowestStockRow = [...data.stationRows]
    .filter((r) => r.station.status === "active" && r.fillRatePct !== null)
    .sort((a, b) => (a.fillRatePct ?? 0) - (b.fillRatePct ?? 0))[0];

  const totalDeliveredVolume = data.deliveries.reduce((sum, d) => sum + (d.volumeLiters ?? 0), 0);
  const anomalyLeaks = data.leakEvents.filter((e) => e.result === "anomaly");

  const ALERT_ICON_TONE: Record<string, "error" | "warning" | "info"> = {
    leak: "error",
    sensor_offline: "error",
    level_high: "warning",
    level_high_pre_alarm: "warning",
    level_low: "warning",
    water: "info",
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubtitle")}
        actions={
          <div className="flex items-center gap-1 rounded-pill border border-border-subtle p-1">
            {PERIODS.map((value) => (
              <Tooltip key={value} content={<span>{t(`periodTooltips.${value}`)}</span>}>
                <button
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={cn(
                    "rounded-pill px-3 py-1.5 text-body-sm font-medium transition-colors",
                    period === value ? "bg-primary-muted text-primary" : "text-text-muted hover:bg-surface-muted"
                  )}
                >
                  {t(`periods.${value}`)}
                </button>
              </Tooltip>
            ))}
          </div>
        }
      />

      {data.error && (
        <Card variant="default" className="border-error/30 bg-error-muted text-error">
          {data.error}
        </Card>
      )}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : (
        <>
          {/* Vue d'ensemble réseau — station_kpi.md §2, priorité Critique */}
          <section>
            <h2 className="mb-3 text-h2 font-semibold text-text">{t("sections.overview")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                icon={Building2}
                label={<KpiLabel label={t("kpis.activeStations.label")} help={t("kpis.activeStations.help")} />}
                value={data.stationsActiveCount}
                sub={t("kpis.activeStations.sub", { online: data.stationsOnlineCount })}
              />
              <Kpi
                icon={Package}
                label={<KpiLabel label={t("kpis.networkStock.label")} help={t("kpis.networkStock.help")} />}
                value={formatVolume(data.networkSummary?.totalVolumeLiters ?? 0)}
                sub={totalRatePct !== null ? t("kpis.networkStock.sub", { pct: formatPercent(totalRatePct), capacity: formatVolume(data.totalCapacityLiters) }) : undefined}
                tone={totalRatePct !== null && totalRatePct < 20 ? "warning" : "neutral"}
              />
              <Kpi
                icon={Wallet}
                label={<KpiLabel label={t("kpis.stockValue.label")} help={t("kpis.stockValue.help")} />}
                value={totalMonetaryValue !== null && totalMonetaryCurrency ? formatMoney(totalMonetaryValue, totalMonetaryCurrency) : "—"}
                sub={totalMonetaryValue === null ? t("kpis.stockValue.partial") : undefined}
                tone="primary"
              />
              <Kpi
                icon={AlertTriangle}
                label={<KpiLabel label={t("kpis.activeAlerts.label")} help={t("kpis.activeAlerts.help")} />}
                value={data.activeAlerts.length}
                tone={data.activeAlerts.length > 0 ? "error" : "success"}
                sub={t("kpis.activeAlerts.sub")}
              />
              <Kpi
                icon={Wifi}
                label={<KpiLabel label={t("kpis.atgAvailability.label")} help={t("kpis.atgAvailability.help")} />}
                value={atgAvailabilityPct !== null ? `${formatPercent(atgAvailabilityPct)}%` : "—"}
                sub={t("kpis.atgAvailability.sub", { online: data.onlineTankCount, total: data.activeTankCount })}
                tone={atgAvailabilityPct !== null && atgAvailabilityPct < 100 ? "warning" : "success"}
              />
              <Kpi
                icon={Droplet}
                label={<KpiLabel label={t("kpis.lowestStock.label")} help={t("kpis.lowestStock.help")} />}
                value={lowestStockRow ? `${formatPercent(lowestStockRow.fillRatePct ?? 0)}%` : "—"}
                sub={lowestStockRow ? lowestStockRow.station.name : t("kpis.lowestStock.empty")}
                tone={lowestStockRow && (lowestStockRow.fillRatePct ?? 100) < 20 ? "error" : "neutral"}
              />
              <Kpi
                icon={Truck}
                label={<KpiLabel label={t("kpis.deliveredVolume.label")} help={t("kpis.deliveredVolume.help")} />}
                value={formatVolume(totalDeliveredVolume)}
                sub={t("kpis.deliveredVolume.sub", { count: data.deliveries.length })}
              />
              <Kpi
                icon={Droplet}
                label={<KpiLabel label={t("kpis.leakTests.label")} help={t("kpis.leakTests.help")} />}
                value={data.leakEvents.length}
                sub={t("kpis.leakTests.sub", { anomalies: anomalyLeaks.length })}
                tone={anomalyLeaks.length > 0 ? "error" : "success"}
              />
            </div>
          </section>

          {/* Alertes par type — station_kpi.md §10 */}
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-h3 font-semibold text-text">
                <KpiLabel label={t("alertBreakdown.title")} help={t("alertBreakdown.titleHelp")} />
              </h3>
            </div>
            {data.allAlerts.length === 0 ? (
              <p className="text-body-sm text-text-muted">{t("alertBreakdown.empty")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {data.alertBreakdown.map((row) => (
                  <Tooltip key={row.type} content={<span>{t(`alertBreakdown.typeHelp.${row.type}`)}</span>}>
                    <div className="cursor-help rounded-card border border-border-subtle p-3 text-center">
                      <AlertTriangle
                        className={cn(
                          "mx-auto mb-1 size-4",
                          ALERT_ICON_TONE[row.type] === "error" ? "text-error" : ALERT_ICON_TONE[row.type] === "warning" ? "text-warning" : "text-info"
                        )}
                        aria-hidden
                      />
                      <p className="text-h3 font-semibold tabular-nums text-text">{row.activeCount}</p>
                      <p className="text-caption text-text-muted">{tAlertTypes(row.type)}</p>
                      {row.totalCount > row.activeCount && (
                        <p className="text-caption text-text-disabled">{t("alertBreakdown.totalOverPeriod", { total: row.totalCount })}</p>
                      )}
                    </div>
                  </Tooltip>
                ))}
              </div>
            )}
          </Card>

          {/* Classement des stations — station_kpi.md §15 */}
          <Card padding="none">
            <div className="flex items-center justify-between p-5 pb-0">
              <h3 className="text-h3 font-semibold text-text">
                <KpiLabel label={t("ranking.title")} help={t("ranking.titleHelp")} />
              </h3>
              <span className="text-caption text-text-muted">{t("ranking.clickToSort")}</span>
            </div>
            <div className="p-5">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("ranking.columns.station")}</TableHeaderCell>
                    <TableHeaderCell>{t("ranking.columns.status")}</TableHeaderCell>
                    <TableHeaderCell>
                      <SortHeader sortKeyValue="fillRate" label={t("ranking.columns.fillRate")} help={t("ranking.columns.fillRateHelp")} />
                    </TableHeaderCell>
                    <TableHeaderCell>
                      <SortHeader sortKeyValue="alerts" label={t("ranking.columns.alerts")} help={t("ranking.columns.alertsHelp")} />
                    </TableHeaderCell>
                    <TableHeaderCell>
                      <SortHeader sortKeyValue="deliveries" label={t("ranking.columns.delivered")} help={t("ranking.columns.deliveredHelp")} />
                    </TableHeaderCell>
                    <TableHeaderCell>
                      <SortHeader sortKeyValue="availability" label={t("ranking.columns.availability")} help={t("ranking.columns.availabilityHelp")} />
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">{t("ranking.columns.value")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedRows.map((row) => {
                    const availabilityPct = row.tankCount > 0 ? (row.onlineTankCount / row.tankCount) * 100 : null;
                    return (
                      <TableRow key={row.station.id}>
                        <TableCell className="font-medium">{row.station.name}</TableCell>
                        <TableCell>
                          <Badge tone={row.online ? "success" : "neutral"} size="sm" dot>
                            {row.online ? tStationsStatus("online") : tStationsStatus("offline")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.fillRatePct === null ? (
                            "—"
                          ) : (
                            <span className={cn("tabular-nums font-medium", row.fillRatePct < 20 && "text-error")}>{formatPercent(row.fillRatePct)}%</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.activeAlertsCount > 0 ? (
                            <Badge tone="error" size="sm">
                              {row.activeAlertsCount}
                            </Badge>
                          ) : (
                            <span className="text-text-muted">0</span>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{formatVolume(row.deliveredVolumeLiters)}</TableCell>
                        <TableCell>
                          {availabilityPct === null ? "—" : <span className="tabular-nums">{formatPercent(availabilityPct)}%</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.monetaryValue !== null && row.currencyCode ? formatMoney(row.monetaryValue, row.currencyCode) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {sortedRows.length === 0 && <p className="py-4 text-body-sm text-text-muted">{t("ranking.empty")}</p>}
            </div>
          </Card>

          {/* Fuites — station_kpi.md §2.7 */}
          <Card padding="none">
            <div className="p-5 pb-0">
              <h3 className="text-h3 font-semibold text-text">
                <KpiLabel label={t("leaks.title")} help={t("leaks.titleHelp")} />
              </h3>
            </div>
            <div className="p-5">
              {data.leakEvents.length === 0 ? (
                <p className="text-body-sm text-text-muted">{t("leaks.empty")}</p>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t("leaks.columns.station")}</TableHeaderCell>
                      <TableHeaderCell>{t("leaks.columns.period")}</TableHeaderCell>
                      <TableHeaderCell>
                        <KpiLabel label={t("leaks.columns.rate")} help={t("leaks.columns.rateHelp")} />
                      </TableHeaderCell>
                      <TableHeaderCell>{t("leaks.columns.result")}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.leakEvents.slice(0, 20).map((event) => {
                      const stationName = data.stations.find((s) => s.id === event.stationId)?.name ?? "—";
                      return (
                        <TableRow key={event.id}>
                          <TableCell>{stationName}</TableCell>
                          <TableCell className="text-caption text-text-muted">
                            {format.dateTime(new Date(event.startTime), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} →{" "}
                            {format.dateTime(new Date(event.endTime), { hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="tabular-nums">{event.leakRateLph !== null ? `${format.number(event.leakRateLph, { maximumFractionDigits: 2 })} L/h` : "—"}</TableCell>
                          <TableCell>
                            <Badge tone={event.result === "anomaly" ? "error" : "success"} size="sm">
                              {t(`leaks.result.${event.result}`)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </>
      )}
    </Stack>
  );
}
