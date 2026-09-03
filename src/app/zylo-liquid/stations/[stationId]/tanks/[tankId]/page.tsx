"use client";

import { AlertTriangle, ChevronLeft, Droplet, Fuel, Gauge, Package } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import type { TankMeasurement } from "@/core/api/zyloLiquid";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { EmptyState } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { Kpi } from "../../../../_components/Kpi";
import { ModeSwitcher, TankFigures, TankLegend, TankVisual, TANK_VISUAL_MODES, type TankVisualMode, computeTankVisualData } from "../../../../_components/TankVisual";
import { TrendChart } from "../../../../_components/TrendChart";
import { useTankDetail } from "./_lib/useTankDetail";

const TABS = ["gauge", "history", "alerts", "gauging", "technical"] as const;

/** Reproduit fidèlement `pageCuve()` du prototype validé (prototype.html,
 * ~ligne 4138) : 5 KPI (volume mesuré, vendable, espace disponible,
 * couverture, valeur), 5 onglets, jauge + composition côte à côte, les
 * 4 représentations côte à côte. "Volume vendable" et "Couverture de
 * stock" restent désactivés : le prototype les calcule sur une hypothèse
 * déclarée (fond de cuve en %) ou un débit de vente que le Niveau 1 ne
 * fournit pas — jamais approximés avec une donnée inventée. "Jaugeage
 * manuel" reste un onglet désactivé : correction manuelle explicitement
 * hors périmètre de l'endpoint measurements (append-only Holykell
 * uniquement), nécessiterait un nouvel endpoint dédié (CAS 3). Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
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
  const [tab, setTab] = useState<(typeof TABS)[number]>("gauge");

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
    <>
      <Link href={`/zylo-liquid/stations/${stationId}`} className="btn sm no-print" style={{ width: "fit-content", marginBottom: 4 }}>
        <ChevronLeft width={14} height={14} strokeWidth={1.8} aria-hidden />
        {t("backLink", { station: station.name })}
      </Link>

      <div className="page-head">
        <div className="ph-text">
          <h1>
            {tank.displayName}
            <span className="badge b-info" style={{ marginLeft: 10, verticalAlign: "middle" }}>
              {fuelProduct?.name ?? "?"}
            </span>
          </h1>
          <div className="ph-sub">{t("subtitle", { capacity: formatVolume(tank.calibratedCapacityLiters ?? tank.capacityLiters), height: tank.tankHeightMm ? Math.round(tank.tankHeightMm) : "—" })}</div>
        </div>
        <div className="page-actions no-print">
          <ModeSwitcher mode={mode} onChange={setMode} />
        </div>
      </div>

      <div className="grid g5 kpi-scroll" style={{ marginBottom: 16 }}>
        <Kpi
          icon={Fuel}
          label={t("kpis.volume")}
          value={state.volumeLiters === null ? "—" : formatVolume(state.volumeLiters)}
          tone="brand"
          sub={visualData.pct === null ? "" : `${visualData.pct.toFixed(1)} %`}
        />
        <Kpi icon={Package} label={t("kpis.sellable")} disabled />
        <Kpi icon={Gauge} label={t("kpis.available")} value={formatVolume(visualData.emptyVolumeLiters)} />
        <Kpi icon={Droplet} label={t("kpis.coverage")} disabled />
        <Kpi
          icon={Package}
          label={t("kpis.value")}
          value={state.monetaryValue !== null && state.currencyCode ? formatMoney(state.monetaryValue, state.currencyCode) : "—"}
          tone="info"
        />
      </div>

      <span className={`badge ${state.sensorStatus === "online" ? "b-ok" : state.sensorStatus === "offline" ? "b-crit" : "b-idle"}`} style={{ marginBottom: 16, display: "inline-flex" }}>
        <span className="dot" />
        {t(`sensorStatus.${state.sensorStatus}`)}
      </span>

      <div className="tabs">
        {TABS.map((value) => (
          <button key={value} type="button" className={tab === value ? "on" : ""} onClick={() => setTab(value)}>
            {value === "alerts" ? t("tabs.alerts", { count: data.alerts.length }) : t(`tabs.${value}`)}
          </button>
        ))}
      </div>

      {tab === "gauge" && (
        <div className="stack">
          <div className="grid g2">
            <div className="card">
              <h2>{tVisual(`${mode}.label`)}</h2>
              <div className="ch-sub" style={{ marginBottom: 12 }}>
                {tVisual(`${mode}.desc`)}
              </div>
              <div className="row" style={{ justifyContent: "center", gap: 24 }}>
                <TankVisual tank={tank} state={state} mode={mode} big fuelColor={fuelProduct?.displayColor} />
                <TankFigures tank={tank} state={state} />
              </div>
              <div className="sep" />
              <TankLegend />
            </div>
            <div className="card">
              <h2>{t("composition.title")}</h2>
              <div className="row" style={{ gap: 24, marginTop: 12 }}>
                <TankVisual tank={tank} state={state} mode="anneau" big fuelColor={fuelProduct?.displayColor} />
                <table className="t" style={{ minWidth: 0 }}>
                  <tbody>
                    <tr>
                      <td>{t("composition.fuel")}</td>
                      <td className="r mono">{formatVolume(Math.max(0, (state.volumeLiters ?? 0) - visualData.waterVolumeLiters))}</td>
                    </tr>
                    <tr>
                      <td>{t("composition.water")}</td>
                      <td className="r mono">{formatVolume(visualData.waterVolumeLiters)}</td>
                    </tr>
                    <tr>
                      <td>{t("composition.available")}</td>
                      <td className="r mono">{formatVolume(visualData.emptyVolumeLiters)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="card">
            <h2>{t("allModes.title")}</h2>
            <div className="ch-sub" style={{ marginBottom: 14 }}>
              {t("allModes.subtitle")}
            </div>
            <div className="grid g4">
              {TANK_VISUAL_MODES.map((m) => (
                <div key={m} className="stack" style={{ alignItems: "center", gap: 8 }}>
                  <div className="small strong">{tVisual(`${m}.label`)}</div>
                  <TankVisual tank={tank} state={state} mode={m} fuelColor={fuelProduct?.displayColor} />
                  <div className="xsmall dim center">{tVisual(`${m}.desc`)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="card">
          <h2>{t("history.title")}</h2>
          <div className="ch-sub" style={{ marginBottom: 14 }}>
            {t("history.subtitle", { count: allMeasurementPoints.length })}
          </div>
          {measurementPoints.length < 2 ? (
            <div className="empty">
              <div className="e-t">{t("history.empty")}</div>
            </div>
          ) : (
            <TrendChart points={measurementPoints} formatValue={formatVolume} formatDate={formatChartTick} seriesLabel={t("history.title")} />
          )}
        </div>
      )}

      {tab === "alerts" && (
        <div className="card">
          {data.alerts.length === 0 ? (
            <p className="small dim">{t("alerts.empty")}</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {data.alerts.map((a) => (
                <div key={a.id} className={`alarm ${a.type === "leak" || a.type === "level_high" ? "sev-CRITIQUE" : "sev-MAJEUR"}${a.status === "resolved" ? " resolved" : ""}`}>
                  <div className="a-main">
                    <div className="a-title">{tAlerts(`types.${a.type}`)}</div>
                    <div className="a-meta">{formatDateTime(a.triggeredAt)}</div>
                  </div>
                  <span className={`badge ${a.status === "active" ? "b-crit" : "b-ok"}`}>
                    <span className="dot" />
                    {t(`alerts.status.${a.status}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "gauging" && (
        <div className="empty">
          <div className="e-t">{tCommon("states.comingSoon")}</div>
        </div>
      )}

      {tab === "technical" && (
        <div className="grid g2">
          <div className="card">
            <h2>{t("technical.characteristics")}</h2>
            <dl className="kv2" style={{ marginTop: 12 }}>
              <dt>{t("technical.product")}</dt>
              <dd>{fuelProduct?.name ?? "?"}</dd>
              <dt>{t("technical.capacity")}</dt>
              <dd className="mono">{formatVolume(tank.calibratedCapacityLiters ?? tank.capacityLiters)}</dd>
              <dt>{t("technical.height")}</dt>
              <dd className="mono">{tank.tankHeightMm ? `${Math.round(tank.tankHeightMm)} mm` : "—"}</dd>
              <dt>{t("technical.calibrationPoints")}</dt>
              <dd className="mono">{data.calibrationPoints.length}</dd>
              <dt>{t("technical.dataSource")}</dt>
              <dd>{tank.tankHeightMm ? "console" : "—"}</dd>
            </dl>
          </div>
          <div className="card">
            <h2>{t("technical.thresholds")}</h2>
            <table className="t" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>{t("technical.thresholdName")}</th>
                  <th className="r">{t("technical.thresholdValue")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t("technical.thresholdHigh")}</td>
                  <td className="r mono">{Math.round(tank.heightAlarmMm)} mm</td>
                </tr>
                <tr>
                  <td>{t("technical.thresholdPreAlarm")}</td>
                  <td className="r mono">{Math.round(tank.heightAlertMm)} mm</td>
                </tr>
                <tr>
                  <td>{t("technical.thresholdLow")}</td>
                  <td className="r mono">{Math.round(tank.lowAlarmMm)} mm</td>
                </tr>
                <tr>
                  <td>{t("technical.thresholdWater")}</td>
                  <td className="r mono">{Math.round(tank.alertWaterMaxMm)} mm</td>
                </tr>
              </tbody>
            </table>
            <div className="sep" />
            <h3 style={{ marginBottom: 8 }}>{t("technical.sensors")}</h3>
            {data.sensorMappings.length === 0 ? (
              <p className="small dim">{t("technical.noSensor")}</p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {data.sensorMappings.map((m) => (
                  <div key={m.id} className="row" style={{ justifyContent: "space-between" }}>
                    <span className="small">{t(`technical.measurementType.${m.measurementType}`)}</span>
                    <span className={`badge ${m.active ? "b-ok" : "b-idle"}`}>
                      <span className="dot" />
                      {m.active ? t("technical.active") : t("technical.inactive")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {data.error && (
        <div className="banner crit">
          <div>{data.error}</div>
        </div>
      )}
    </>
  );
}
