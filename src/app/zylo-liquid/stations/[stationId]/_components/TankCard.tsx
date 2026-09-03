"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import type { Alert as AlertType, CalibrationPoint, FuelProduct, Tank, TankCurrentState } from "@/core/api/zyloLiquid";

import { interpolateHeightToVolume, productVisual } from "../_lib/tankCardHelpers";
import { TankCylinder } from "./TankCylinder";

function freshnessOf(lastMeasurementAt: string | null): "ok" | "warn" | "off" {
  if (!lastMeasurementAt) return "off";
  const ageMin = Math.max(0, (Date.now() - new Date(lastMeasurementAt).getTime()) / 60000);
  if (ageMin < 15) return "ok";
  if (ageMin <= 60) return "warn";
  return "off";
}

const THRESHOLD_LEGEND = [
  { key: "high", label: "Seuil haut", color: "#E74C3C" },
  { key: "preAlarm", label: "Pré-alarme", color: "#E67E22" },
  { key: "low", label: "Seuil bas", color: "#3498DB" },
  { key: "water", label: "Seuil eau", color: "#85C1E9" },
] as const;

export interface TankCardProps {
  tank: Tank;
  state: TankCurrentState | null;
  fuelProduct: FuelProduct | null;
  calibrationPoints: CalibrationPoint[];
  stationAlerts: AlertType[];
  stationId: string;
  onOpenCalibration: () => void;
}

/** Carte cuve conforme au "zoom complet" fourni par le commanditaire :
 * 4 zones (colonne gauche / cylindre / légende seuils / colonne droite),
 * 220px de haut. Volume vendable calculé en interpolant la table de
 * calibration réelle à la hauteur d'alarme basse (même algorithme que le
 * backend, voir tankCardHelpers) — jamais un pourcentage forfaitaire. */
export function TankCard({ tank, state, fuelProduct, calibrationPoints, stationAlerts, stationId, onOpenCalibration }: TankCardProps) {
  const t = useTranslations("zyloLiquid.stationDetail.tankCard");

  const hasLeak = stationAlerts.some((a) => a.tankId === tank.id && a.type === "leak");
  const hasAlert = stationAlerts.some((a) => a.tankId === tank.id);
  const offline = !state || state.sensorStatus !== "online";

  const capacity = tank.calibratedCapacityLiters ?? tank.capacityLiters;
  const visual = productVisual(fuelProduct?.name ?? "", fuelProduct?.displayColor ?? null);
  const fresh = state ? freshnessOf(state.lastMeasurementAt) : "off";

  const fuelVolume = state?.volumeLiters !== null && state?.volumeLiters !== undefined ? Math.max(0, state.volumeLiters - (state.waterVolumeLiters ?? 0)) : null;
  const pct = (v: number) => (capacity > 0 ? (v / capacity) * 100 : 0);

  const volumeAtLowAlarm = calibrationPoints.length > 0 ? interpolateHeightToVolume(calibrationPoints, tank.lowAlarmMm) : null;
  const sellableVolume =
    state?.volumeLiters !== null && state?.volumeLiters !== undefined && volumeAtLowAlarm !== null
      ? Math.max(0, state.volumeLiters - volumeAtLowAlarm)
      : null;

  const availablePctBand = fuelVolume === null ? null : pct(fuelVolume) < 10 ? "crit" : pct(fuelVolume) < 20 ? "warn" : "ok";
  const sellablePctBand = sellableVolume === null ? null : sellableVolume === 0 ? "crit" : pct(sellableVolume) < 10 ? "warn" : "ok";

  const waterAlert = state?.waterHeightMm !== null && state?.waterHeightMm !== undefined && state.waterHeightMm >= tank.alertWaterMaxMm;

  const cardStateStyle = hasLeak
    ? { borderLeft: "4px solid #E74C3C", background: "rgba(231,76,60,0.04)" }
    : hasAlert
      ? { borderLeft: "4px solid #E67E22", background: "rgba(230,126,34,0.04)" }
      : offline
        ? { background: "rgba(149,165,166,0.06)" }
        : {};

  return (
    <div className="card" style={{ minHeight: 220, display: "flex", gap: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", ...cardStateStyle }}>
      {/* Colonne gauche */}
      <div style={{ width: 140, flexShrink: 0, padding: 16, borderRight: "1px solid var(--border)" }}>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              flexShrink: 0,
              background: offline ? "#9CA3AF" : fresh === "ok" ? "#27AE60" : fresh === "warn" ? "#E67E22" : "#E74C3C",
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>{tank.displayName}</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              background: visual.badge.bg,
              color: visual.badge.text,
              border: `1px solid ${visual.badge.border}`,
            }}
          >
            {(fuelProduct?.name ?? "?").toUpperCase()}
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "#687280" }}>{t("capacity")}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>{Math.round(capacity).toLocaleString("fr-FR")} L</div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "#687280" }}>{t("product")}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>{fuelProduct?.name ?? "?"}</div>
        </div>
      </div>

      {/* Cylindre */}
      <div style={{ flex: 1, minWidth: 320, display: "flex", alignItems: "center", padding: "0 12px" }}>
        {offline ? (
          <div style={{ width: "100%", textAlign: "center" }}>
            <div className="stack" style={{ gap: 4, alignItems: "center" }}>
              <span style={{ color: "#9CA3AF" }}>-- L</span>
              {state?.lastMeasurementAt && (
                <span style={{ fontSize: 11, fontStyle: "italic", color: "#9CA3AF" }}>
                  Dernière mesure : {new Date(state.lastMeasurementAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        ) : state ? (
          <TankCylinder tank={tank} state={state} fillColor={visual.fill} />
        ) : (
          <span className="xsmall dim">{t("notCalculable")}</span>
        )}
      </div>

      {/* Légende des seuils */}
      <div style={{ width: 130, flexShrink: 0, padding: "16px 12px", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", color: "#687280", marginBottom: 8 }}>Niveaux (mm)</div>
        <div className="stack" style={{ gap: 8 }}>
          {THRESHOLD_LEGEND.map((th) => (
            <div key={th.key} className="row" style={{ gap: 8, justifyContent: "space-between", alignItems: "center" }}>
              <div className="row" style={{ gap: 6, alignItems: "center" }}>
                <span style={{ width: 16, height: 0, borderTop: `2px dashed ${th.color}` }} />
                <span style={{ fontSize: 11, color: "#687280" }}>{th.label}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1F2937" }}>
                {Math.round(th.key === "high" ? tank.heightAlarmMm : th.key === "preAlarm" ? tank.heightAlertMm : th.key === "low" ? tank.lowAlarmMm : tank.alertWaterMaxMm)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Colonne droite */}
      <div style={{ width: 160, flexShrink: 0, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: "#687280" }}>Volume disponible</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: fuelVolume === 0 ? "#E74C3C" : "#1F2937" }}>{fuelVolume === null ? "—" : `${Math.round(fuelVolume).toLocaleString("fr-FR")} L`}</div>
          {fuelVolume !== null && (
            <div style={{ fontSize: 12, color: availablePctBand === "crit" ? "#E74C3C" : availablePctBand === "warn" ? "#E67E22" : "#687280" }}>{pct(fuelVolume).toFixed(0)}%</div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#687280" }}>Volume vendable</div>
          {sellableVolume === null ? (
            <div style={{ fontSize: 16, fontWeight: 600, color: "#9CA3AF", fontStyle: "italic" }}>Non calculable</div>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 600, color: sellablePctBand === "crit" ? "#E74C3C" : sellablePctBand === "warn" ? "#E67E22" : "#3498DB" }}>
                {Math.round(sellableVolume).toLocaleString("fr-FR")} L
              </div>
              <div style={{ fontSize: 11, color: sellablePctBand === "crit" ? "#E74C3C" : sellablePctBand === "warn" ? "#E67E22" : "#3498DB" }}>{pct(sellableVolume).toFixed(1)}%</div>
            </>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#687280" }}>Température</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: offline ? "#9CA3AF" : state?.temperatureC === null || state?.temperatureC === undefined ? "#9CA3AF" : state.temperatureC > 45 ? "#E67E22" : state.temperatureC < 5 ? "#2980B9" : "#1F2937",
            }}
          >
            {offline ? "Hors ligne" : state?.temperatureC === null || state?.temperatureC === undefined ? "-- °C" : `${state.temperatureC.toFixed(1)} °C`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#687280" }}>Eau</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: waterAlert ? "#E74C3C" : "#1F2937" }}>{state?.waterVolumeLiters === undefined || state?.waterVolumeLiters === null ? "—" : `${Math.round(state.waterVolumeLiters)} L`}</div>
          <div style={{ fontSize: 11, color: waterAlert ? "#E74C3C" : "#687280" }}>{state?.waterVolumeLiters !== null && state?.waterVolumeLiters !== undefined ? `${pct(state.waterVolumeLiters).toFixed(2)}%` : ""}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#687280" }}>Vide</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>{state?.emptyVolumeLiters !== undefined && state?.emptyVolumeLiters !== null ? `${Math.round(state.emptyVolumeLiters).toLocaleString("fr-FR")} L` : "—"}</div>
          <div style={{ fontSize: 11, color: "#687280" }}>{state?.emptyVolumeLiters !== undefined && state?.emptyVolumeLiters !== null ? `${pct(state.emptyVolumeLiters).toFixed(0)}%` : ""}</div>
        </div>

        <div className="row" style={{ gap: 6, alignItems: "center", marginTop: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: offline ? "#E74C3C" : fresh === "ok" ? "#27AE60" : "#E67E22" }} />
          <span style={{ fontSize: 11, color: offline ? "#E74C3C" : fresh === "ok" ? "#27AE60" : "#E67E22" }}>
            {offline ? t("sensorDisconnected") : t("sensorConnected")}
          </span>
        </div>

        <div className="stack" style={{ gap: 8, marginTop: "auto" }}>
          <button type="button" className="btn sm" style={{ width: "100%" }} onClick={onOpenCalibration}>
            {t("calibration")}
          </button>
          <Link className="btn sm primary" style={{ width: "100%", justifyContent: "center" }} href={`/zylo-liquid/stations/${stationId}/tanks/${tank.id}`}>
            {t("detail")}
          </Link>
        </div>
      </div>
    </div>
  );
}
