"use client";

import { AlertTriangle, ChevronRight, Circle, Truck, Wrench } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Badge, Card } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";
import { cn } from "@/shared/lib/cn";

import { ProductBreakdownModal, type ProductFilter } from "./_components/ProductBreakdownModal";
import { TrendChart } from "./_components/TrendChart";
import { useNetworkDashboard, type Period } from "./_lib/useNetworkDashboard";

const PERIODS: Period[] = ["now", "today", "7d", "30d", "custom"];

export default function ZyloLiquidDashboardPage() {
  const t = useTranslations("zyloLiquid");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization, loading: organizationLoading } = useOrganization();

  const [period, setPeriod] = useState<Period>("now");
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [breakdownFilter, setBreakdownFilter] = useState<ProductFilter | null>(null);

  const data = useNetworkDashboard(currentOrganization?.id ?? null, period, customDate);

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

  function formatDateShort(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "short" });
  }

  function formatRelativeTime(iso: string): string {
    return format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });
  }

  if (organizationLoading) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }

  const fuelProductNameById = new Map(data.fuelProducts.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-col gap-6">
      {/* Zone A — barre de statut réseau */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border-subtle bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-5 text-body-sm">
          <span className="flex items-center gap-2 text-text">
            <Circle className="size-2 fill-success text-success" aria-hidden />
            {t("statusBar.stationsActive", { count: data.stationsActiveCount })}
          </span>
          <span className="flex items-center gap-2 text-text-muted">
            <Circle className="size-2 fill-text-disabled text-text-disabled" aria-hidden />
            {t("statusBar.stationsOffline", { count: data.stationsOfflineCount })}
          </span>
          <span className="flex items-center gap-2 text-warning">
            <AlertTriangle className="size-4" aria-hidden />
            {t("statusBar.alertsActive", { count: data.activeAlertsCount })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={cn(
                "rounded-pill px-3 py-1.5 text-body-sm font-medium transition-colors",
                period === value ? "bg-primary-muted text-primary" : "text-text-muted hover:bg-surface-muted"
              )}
            >
              {t(`statusBar.periods.${value}`)}
            </button>
          ))}
          {period === "custom" && (
            <input
              type="datetime-local"
              value={customDate ?? ""}
              onChange={(e) => setCustomDate(e.target.value)}
              className="ml-2 rounded-button border border-border px-2 py-1 text-body-sm"
            />
          )}
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
          {/* Zone B — synthèse stock réseau */}
          <section>
            <h2 className="mb-3 text-h2 font-semibold text-text">{t("stockSynthesis.title")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.products.map((product) => {
                const rate = product.capacityLiters > 0 ? Math.round((product.volumeLiters / product.capacityLiters) * 100) : 0;
                return (
                  <Card
                    key={product.fuelProductId}
                    className="cursor-pointer transition-shadow hover:shadow-elevated"
                    onClick={() => setBreakdownFilter({ fuelProductId: product.fuelProductId, name: product.name })}
                  >
                    <div className="flex items-center gap-2 text-body-sm font-semibold text-text-muted">
                      <Circle className="size-2.5" style={{ fill: product.displayColor ?? "var(--color-text-muted)", color: product.displayColor ?? undefined }} aria-hidden />
                      {product.name.toUpperCase()}
                    </div>
                    <p className="mt-2 text-h1 font-bold tabular-nums text-text">{formatVolume(product.volumeLiters)}</p>
                    <p className="text-body-sm text-text-muted">{t("stockSynthesis.ofCapacity", { capacity: formatVolume(product.capacityLiters) })}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-muted">
                        <div className="h-full rounded-pill" style={{ width: `${Math.min(100, rate)}%`, background: product.displayColor ?? "var(--color-primary)" }} />
                      </div>
                      <span className="tabular-nums text-body-sm text-text-muted">{rate}%</span>
                    </div>
                    <button
                      type="button"
                      className="mt-3 flex items-center gap-1 text-body-sm text-primary hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBreakdownFilter({ fuelProductId: product.fuelProductId, name: product.name });
                      }}
                    >
                      {t("stockSynthesis.stationsConcerned", { count: product.stationCount })}
                      <ChevronRight className="size-4" aria-hidden />
                    </button>
                    <div className="mt-3 border-t border-border-subtle pt-3">
                      <p className="text-caption text-text-muted">{t("stockSynthesis.stockValue")}</p>
                      <p className="text-body-lg font-semibold text-text">
                        {product.monetaryValue !== null && product.currencyCode
                          ? formatMoney(product.monetaryValue, product.currencyCode)
                          : t("stockSynthesis.valueUnavailable")}
                      </p>
                    </div>
                  </Card>
                );
              })}

              <Card
                className="cursor-pointer border-secondary/20 bg-secondary text-white transition-shadow hover:shadow-elevated"
                onClick={() => setBreakdownFilter({ fuelProductId: null, name: t("stockSynthesis.totalNetwork") })}
              >
                <p className="text-body-sm font-semibold text-white/70">{t("stockSynthesis.totalNetwork").toUpperCase()}</p>
                <p className="mt-2 text-h1 font-bold tabular-nums">{formatVolume(data.networkSummary?.totalVolumeLiters ?? 0)}</p>
                <p className="text-body-sm text-white/60">{t("stockSynthesis.ofCapacity", { capacity: formatVolume(data.totalCapacityLiters) })}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-pill bg-white/10">
                    <div
                      className="h-full rounded-pill bg-primary"
                      style={{
                        width: `${data.totalCapacityLiters > 0 ? Math.min(100, Math.round(((data.networkSummary?.totalVolumeLiters ?? 0) / data.totalCapacityLiters) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="tabular-nums text-body-sm text-white/70">
                    {data.totalCapacityLiters > 0 ? Math.round(((data.networkSummary?.totalVolumeLiters ?? 0) / data.totalCapacityLiters) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="text-caption text-white/60">{t("stockSynthesis.stockValue")}</p>
                  <p className="text-body-lg font-semibold">
                    {data.totalMonetaryValue !== null && data.totalMonetaryCurrencyCode
                      ? formatMoney(data.totalMonetaryValue, data.totalMonetaryCurrencyCode)
                      : t("stockSynthesis.valueUnavailable")}
                  </p>
                </div>
              </Card>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Zone C — graphique de tendance */}
            <Card className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-h3 font-semibold text-text">{t("chart.title")}</h3>
                <span className="text-caption text-text-muted">{t("chart.unit")}</span>
              </div>
              {data.chartLoading ? (
                <PageSpinner label={tCommon("states.loading")} />
              ) : data.chartPoints.length < 2 ? (
                <p className="text-body-sm text-text-muted">{t("chart.insufficientData")}</p>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    <TrendChart points={data.chartPoints} formatVolume={formatVolume} formatDate={formatDateShort} seriesLabel={t("chart.seriesLabel")} />
                  </div>
                  <div className="flex shrink-0 flex-col gap-3 sm:w-40">
                    <div>
                      <p className="text-caption text-text-muted">{t("chart.currentStock")}</p>
                      <p className="text-body-lg font-semibold tabular-nums text-text">{formatVolume(data.networkSummary?.totalVolumeLiters ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-caption text-text-muted">{t("chart.totalCapacity")}</p>
                      <p className="text-body-md tabular-nums text-text">{formatVolume(data.totalCapacityLiters)}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Alertes actives */}
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-h3 font-semibold text-text">{t("alerts.title")}</h3>
              </div>
              {data.activeAlerts.length === 0 ? (
                <p className="text-body-sm text-text-muted">{t("alerts.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.activeAlerts.slice(0, 6).map((alert) => {
                    const station = data.stations.find((s) => s.id === alert.stationId);
                    const tone = alert.type === "leak" || alert.type === "sensor_offline" ? "error" : "warning";
                    return (
                      <li key={alert.id} className="flex items-start gap-2">
                        <AlertTriangle className={cn("mt-0.5 size-4", tone === "error" ? "text-error" : "text-warning")} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-body-sm font-medium text-text">{t(`alerts.types.${alert.type}`)}</p>
                          <p className="truncate text-caption text-text-muted">{station?.name}</p>
                        </div>
                        <span className="shrink-0 text-caption text-text-muted">{formatRelativeTime(alert.triggeredAt)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Stations du réseau */}
            <Card className="lg:col-span-2" padding="none">
              <div className="flex items-center justify-between p-5 pb-0">
                <h3 className="text-h3 font-semibold text-text">{t("stations.title")}</h3>
              </div>
              <div className="overflow-x-auto p-5">
                <table className="w-full border-collapse text-body-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-caption font-semibold uppercase tracking-wide text-text-muted">
                      <th className="py-2 text-left">{t("stations.columns.station")}</th>
                      <th className="py-2 text-left">{t("stations.columns.status")}</th>
                      <th className="py-2 text-left">{t("stations.columns.mainProduct")}</th>
                      <th className="py-2 text-right">{t("stations.columns.currentStock")}</th>
                      <th className="py-2 text-right">{t("stations.columns.capacity")}</th>
                      <th className="py-2 pl-4 text-left">{t("stations.columns.rate")}</th>
                      <th className="py-2 text-right">{t("stations.columns.value")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stationAggregates.map(({ station, online, volumeLiters, capacityLiters, monetaryValue, currencyCode, mainProductName }) => {
                      const rate = capacityLiters > 0 ? Math.round((volumeLiters / capacityLiters) * 100) : 0;
                      return (
                        <tr key={station.id} className="border-b border-border-subtle/60">
                          <td className="py-2 text-text">{station.name}</td>
                          <td className="py-2">
                            <Badge tone={online ? "success" : "neutral"} size="sm" dot>
                              {online ? t("stations.status.online") : t("stations.status.offline")}
                            </Badge>
                          </td>
                          <td className="py-2 text-text-muted">{mainProductName ?? "—"}</td>
                          <td className="py-2 text-right tabular-nums text-text">{formatVolume(volumeLiters)}</td>
                          <td className="py-2 text-right tabular-nums text-text-muted">{formatVolume(capacityLiters)}</td>
                          <td className="py-2 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-pill bg-surface-muted">
                                <div className="h-full rounded-pill bg-primary" style={{ width: `${Math.min(100, rate)}%` }} />
                              </div>
                              <span className="tabular-nums text-caption text-text-muted">{rate}%</span>
                            </div>
                          </td>
                          <td className="py-2 text-right tabular-nums text-text">
                            {monetaryValue !== null && currencyCode ? formatMoney(monetaryValue, currencyCode) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {data.stationAggregates.length === 0 && <p className="py-4 text-body-sm text-text-muted">{t("stations.empty")}</p>}
                <p className="mt-3 text-caption text-text-muted">{t("stations.totalStations", { count: data.stations.length })}</p>
              </div>
            </Card>

            {/* Activité récente */}
            <Card>
              <h3 className="mb-3 text-h3 font-semibold text-text">{t("activity.title")}</h3>
              {data.recentActivity.length === 0 ? (
                <p className="text-body-sm text-text-muted">{t("activity.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.recentActivity.map((event, index) => (
                    <li key={index} className="flex items-start gap-2">
                      {event.kind === "delivery" && <Truck className="mt-0.5 size-4 text-success" aria-hidden />}
                      {event.kind === "alert" && <AlertTriangle className="mt-0.5 size-4 text-warning" aria-hidden />}
                      {event.kind === "measurement" && <Wrench className="mt-0.5 size-4 text-info" aria-hidden />}
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-medium text-text">{t(`activity.events.${event.kind}`)}</p>
                        <p className="truncate text-caption text-text-muted">
                          {event.kind === "delivery" && `${event.stationName} — ${t("activity.deliveryDetails", { volume: formatVolume(event.delivery.volumeLiters ?? 0) })}`}
                          {event.kind === "alert" && `${event.stationName} — ${t(`alerts.types.${event.alert.type}`)}`}
                          {event.kind === "measurement" &&
                            t("activity.measurementDetails", { tank: `${event.stationName} / ${event.tankName}`, height: `${Math.round(event.heightMm)} mm` })}
                        </p>
                      </div>
                      <span className="shrink-0 text-caption text-text-muted">{formatRelativeTime(event.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      {breakdownFilter && (
        <ProductBreakdownModal
          open={breakdownFilter !== null}
          onOpenChange={(open) => !open && setBreakdownFilter(null)}
          product={breakdownFilter}
          tanks={data.tanks}
          stations={data.stations}
          stationStates={data.stationStates}
          fuelProductNameById={fuelProductNameById}
          formatVolume={formatVolume}
          formatMoney={formatMoney}
        />
      )}
    </div>
  );
}
