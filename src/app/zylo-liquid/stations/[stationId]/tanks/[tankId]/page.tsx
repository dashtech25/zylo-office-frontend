"use client";

import { AlertTriangle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import type { TankMeasurement } from "@/core/api/zyloLiquid";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert as AlertBox, Badge, Card, EmptyState, Tabs } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { ModeSwitcher, TankFigures, TankLegend, TankVisual, TANK_VISUAL_MODES, type TankVisualMode, computeTankVisualData } from "../../../../_components/TankVisual";
import { TrendChart } from "../../../../_components/TrendChart";
import { useTankDetail } from "./_lib/useTankDetail";

export default function TankDetailPage() {
  const params = useParams<{ stationId: string; tankId: string }>();
  const { stationId, tankId } = params;
  const t = useTranslations("zyloLiquid.tankDetail");
  const tVisual = useTranslations("zyloLiquid.tankVisual.modes");
  const tAlerts = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useTankDetail(currentOrganization?.id ?? null, stationId, tankId);
  const [mode, setMode] = useState<TankVisualMode>("vertical");

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

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function formatChartTick(iso: string): string {
    return format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });
  }

  if (data.loading) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }

  if (!data.tank || !data.state || !data.station) {
    return <EmptyState icon={AlertTriangle} title={tCommon("states.error")} description={data.error ?? undefined} />;
  }

  const { tank, state, station, fuelProduct } = data;
  const visualData = computeTankVisualData(tank, state);
  const allMeasurementPoints = data.measurements
    .filter((m: TankMeasurement) => m.volumeLiters !== null)
    .map((m: TankMeasurement) => ({ at: m.measuredAt, value: m.volumeLiters as number }));
  const MAX_CHART_POINTS = 8;
  const sampleStep = Math.max(1, Math.ceil(allMeasurementPoints.length / MAX_CHART_POINTS));
  const measurementPoints = allMeasurementPoints.filter((_, i) => i % sampleStep === 0);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/zylo-liquid/stations/${stationId}`}
        className="inline-flex w-fit items-center gap-1 text-body-sm text-text-muted hover:text-primary"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("backLink", { station: station.name })}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-h1 font-bold text-text">{tank.displayName}</h1>
            <Badge tone="primary" size="sm">
              {fuelProduct?.name ?? "?"}
            </Badge>
          </div>
          <p className="mt-1 text-body-sm text-text-muted">
            {t("subtitle", { capacity: formatVolume(tank.calibratedCapacityLiters ?? tank.capacityLiters), height: tank.tankHeightMm ? Math.round(tank.tankHeightMm) : "—" })}
          </p>
        </div>
        <ModeSwitcher mode={mode} onChange={setMode} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card padding="sm">
          <p className="text-caption text-text-muted">{t("kpis.volume")}</p>
          <p className="mt-1 text-h3 font-semibold tabular-nums text-text">{state.volumeLiters === null ? "—" : formatVolume(state.volumeLiters)}</p>
          <p className="text-caption text-text-muted">{visualData.pct === null ? "" : `${visualData.pct.toFixed(1)} %`}</p>
        </Card>
        <Card padding="sm">
          <p className="text-caption text-text-muted">{t("kpis.available")}</p>
          <p className="mt-1 text-h3 font-semibold tabular-nums text-text">{formatVolume(visualData.emptyVolumeLiters)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-caption text-text-muted">{t("kpis.water")}</p>
          <p className="mt-1 text-h3 font-semibold tabular-nums text-text">{state.waterHeightMm === null ? "—" : `${Math.round(state.waterHeightMm)} mm`}</p>
          <p className="text-caption text-text-muted">{formatVolume(visualData.waterVolumeLiters)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-caption text-text-muted">{state.monetaryValue !== null && state.currencyCode ? t("kpis.value") : t("kpis.temperature")}</p>
          <p className="mt-1 text-h3 font-semibold tabular-nums text-text">
            {state.monetaryValue !== null && state.currencyCode
              ? formatMoney(state.monetaryValue, state.currencyCode)
              : state.temperatureC === null
                ? "—"
                : `${state.temperatureC.toFixed(1)} °C`}
          </p>
        </Card>
      </div>

      <Badge tone={state.sensorStatus === "online" ? "success" : state.sensorStatus === "offline" ? "error" : "neutral"} size="sm" dot>
        {t(`sensorStatus.${state.sensorStatus}`)}
      </Badge>

      <Tabs
        items={[
          {
            value: "jauge",
            label: t("tabs.gauge"),
            content: (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <div className="flex items-center justify-between">
                      <h3 className="text-h3 font-semibold text-text">{tVisual(`${mode}.label`)}</h3>
                    </div>
                    <p className="mb-4 text-body-sm text-text-muted">{tVisual(`${mode}.desc`)}</p>
                    <div className="flex items-center justify-center gap-6">
                      <TankVisual tank={tank} state={state} mode={mode} big fuelColor={fuelProduct?.displayColor} />
                      <TankFigures tank={tank} state={state} />
                    </div>
                    <div className="mt-4 border-t border-border-subtle pt-3">
                      <TankLegend />
                    </div>
                  </Card>
                  <Card>
                    <h3 className="mb-3 text-h3 font-semibold text-text">{t("composition.title")}</h3>
                    <div className="flex items-center gap-6">
                      <TankVisual tank={tank} state={state} mode="anneau" big fuelColor={fuelProduct?.displayColor} />
                      <table className="w-full text-body-sm">
                        <tbody>
                          <tr className="border-b border-border-subtle/60">
                            <td className="py-1.5 text-text-muted">{t("composition.fuel")}</td>
                            <td className="py-1.5 text-right tabular-nums text-text">{formatVolume(Math.max(0, (state.volumeLiters ?? 0) - visualData.waterVolumeLiters))}</td>
                          </tr>
                          <tr className="border-b border-border-subtle/60">
                            <td className="py-1.5 text-text-muted">{t("composition.water")}</td>
                            <td className="py-1.5 text-right tabular-nums text-text">{formatVolume(visualData.waterVolumeLiters)}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 text-text-muted">{t("composition.available")}</td>
                            <td className="py-1.5 text-right tabular-nums text-text">{formatVolume(visualData.emptyVolumeLiters)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
                <Card>
                  <h3 className="mb-1 text-h3 font-semibold text-text">{t("allModes.title")}</h3>
                  <p className="mb-4 text-body-sm text-text-muted">{t("allModes.subtitle")}</p>
                  <div className="grid grid-cols-2 items-end gap-6 md:grid-cols-4">
                    {TANK_VISUAL_MODES.map((m) => (
                      <div key={m} className="flex flex-col items-center gap-2">
                        <p className="text-body-sm font-semibold text-text">{tVisual(`${m}.label`)}</p>
                        <TankVisual tank={tank} state={state} mode={m} fuelColor={fuelProduct?.displayColor} />
                        <p className="text-center text-caption text-text-muted">{tVisual(`${m}.desc`)}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ),
          },
          {
            value: "historique",
            label: t("tabs.history"),
            content: (
              <Card>
                <h3 className="mb-1 text-h3 font-semibold text-text">{t("history.title")}</h3>
                <p className="mb-4 text-body-sm text-text-muted">{t("history.subtitle", { count: allMeasurementPoints.length })}</p>
                {measurementPoints.length < 2 ? (
                  <EmptyState title={t("history.empty")} />
                ) : (
                  <TrendChart points={measurementPoints} formatValue={formatVolume} formatDate={formatChartTick} seriesLabel={t("history.title")} />
                )}
              </Card>
            ),
          },
          {
            value: "alarmes",
            label: t("tabs.alerts", { count: data.alerts.length }),
            content: (
              <Card>
                {data.alerts.length === 0 ? (
                  <p className="text-body-sm text-text-muted">{t("alerts.empty")}</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {data.alerts.map((a) => (
                      <li key={a.id} className="flex items-start gap-3 border-b border-border-subtle/60 pb-3 last:border-0">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-body-sm font-medium text-text">{tAlerts(`types.${a.type}`)}</p>
                          <p className="text-caption text-text-muted">{formatDateTime(a.triggeredAt)}</p>
                        </div>
                        <Badge tone={a.status === "active" ? "error" : "neutral"} size="sm">
                          {t(`alerts.status.${a.status}`)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ),
          },
          {
            value: "technique",
            label: t("tabs.technical"),
            content: (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-3 text-h3 font-semibold text-text">{t("technical.characteristics")}</h3>
                  <dl className="flex flex-col gap-2 text-body-sm">
                    <div className="flex justify-between border-b border-border-subtle/60 py-1.5">
                      <dt className="text-text-muted">{t("technical.product")}</dt>
                      <dd className="text-text">{fuelProduct?.name ?? "?"}</dd>
                    </div>
                    <div className="flex justify-between border-b border-border-subtle/60 py-1.5">
                      <dt className="text-text-muted">{t("technical.capacity")}</dt>
                      <dd className="tabular-nums text-text">{formatVolume(tank.calibratedCapacityLiters ?? tank.capacityLiters)}</dd>
                    </div>
                    <div className="flex justify-between border-b border-border-subtle/60 py-1.5">
                      <dt className="text-text-muted">{t("technical.height")}</dt>
                      <dd className="tabular-nums text-text">{tank.tankHeightMm ? `${Math.round(tank.tankHeightMm)} mm` : "—"}</dd>
                    </div>
                    <div className="flex justify-between border-b border-border-subtle/60 py-1.5">
                      <dt className="text-text-muted">{t("technical.calibrationPoints")}</dt>
                      <dd className="tabular-nums text-text">{data.calibrationPoints.length}</dd>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <dt className="text-text-muted">{t("technical.dataSource")}</dt>
                      <dd className="text-text">{tank.tankHeightMm ? "console" : "—"}</dd>
                    </div>
                  </dl>
                </Card>
                <Card>
                  <h3 className="mb-3 text-h3 font-semibold text-text">{t("technical.thresholds")}</h3>
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-border-subtle text-caption uppercase text-text-muted">
                        <th className="py-1.5 text-left">{t("technical.thresholdName")}</th>
                        <th className="py-1.5 text-right">{t("technical.thresholdValue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border-subtle/60">
                        <td className="py-1.5 text-text-muted">{t("technical.thresholdHigh")}</td>
                        <td className="py-1.5 text-right tabular-nums text-text">{Math.round(tank.heightAlarmMm)} mm</td>
                      </tr>
                      <tr className="border-b border-border-subtle/60">
                        <td className="py-1.5 text-text-muted">{t("technical.thresholdPreAlarm")}</td>
                        <td className="py-1.5 text-right tabular-nums text-text">{Math.round(tank.heightAlertMm)} mm</td>
                      </tr>
                      <tr className="border-b border-border-subtle/60">
                        <td className="py-1.5 text-text-muted">{t("technical.thresholdLow")}</td>
                        <td className="py-1.5 text-right tabular-nums text-text">{Math.round(tank.lowAlarmMm)} mm</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 text-text-muted">{t("technical.thresholdWater")}</td>
                        <td className="py-1.5 text-right tabular-nums text-text">{Math.round(tank.alertWaterMaxMm)} mm</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-5 border-t border-border-subtle pt-4">
                    <h4 className="mb-2 text-body-sm font-semibold text-text">{t("technical.sensors")}</h4>
                    {data.sensorMappings.length === 0 ? (
                      <p className="text-body-sm text-text-muted">{t("technical.noSensor")}</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {data.sensorMappings.map((m) => (
                          <li key={m.id} className="flex items-center justify-between text-body-sm">
                            <span className="text-text">{t(`technical.measurementType.${m.measurementType}`)}</span>
                            <Badge tone={m.active ? "success" : "neutral"} size="sm">
                              {m.active ? t("technical.active") : t("technical.inactive")}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>
              </div>
            ),
          },
        ]}
      />

      {data.error && <AlertBox tone="error">{data.error}</AlertBox>}
    </div>
  );
}
