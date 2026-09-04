"use client";

import { useTranslations } from "next-intl";

import type { Alert as AlertType, CalibrationPoint, FuelProduct, Tank, TankCurrentState } from "@/modules/zylo-liquid/services/zyloLiquidApi";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatPercent } from "@/modules/zylo-liquid/utils/formatPercent";
import { cn } from "@/shared/lib/cn";
import { Card } from "@/shared/ui";

import { interpolateHeightToVolume, productVisual } from "./tankCardHelpers";
import { TankActionsColumn } from "./TankActionsColumn";
import { TankCardIdentityColumn } from "./TankCardIdentityColumn";
import { TankGaugeColumn } from "./TankGaugeColumn";
import { TankMetricsColumn } from "./TankMetricsColumn";
import { TankThresholdLegendColumn } from "./TankThresholdLegendColumn";

function freshnessOf(lastMeasurementAt: string | null): "ok" | "warn" | "off" {
  if (!lastMeasurementAt) return "off";
  const ageMin = Math.max(0, (Date.now() - new Date(lastMeasurementAt).getTime()) / 60000);
  if (ageMin < 15) return "ok";
  if (ageMin <= 60) return "warn";
  return "off";
}

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export interface TankCardProps {
  tank: Tank;
  state: TankCurrentState | null;
  fuelProduct: FuelProduct | null;
  calibrationPoints: CalibrationPoint[];
  stationAlerts: AlertType[];
  stationId: string;
  onOpenCalibration: () => void;
}

/** Carte cuve — 5 colonnes distinctes conformes à la référence validée :
 * A) identité, B) cylindre, C) légende des seuils, D) métriques
 * (carburant/eau/vide), E) statut & actions. D et E sont deux colonnes
 * séparées (pas une seule "colonne droite" fusionnée — c'était l'écart
 * signalé). Chaque colonne est un composant à part, réutilisable et
 * indépendamment testable ; `TankCard` ne fait que calculer les valeurs
 * dérivées réelles et les répartir.
 *
 * Volume vendable calculé en interpolant la table de calibration réelle à la
 * hauteur d'alarme basse (même algorithme que le backend, voir
 * tankCardHelpers) — jamais un pourcentage forfaitaire. */
export function TankCard({ tank, state, fuelProduct, calibrationPoints, stationAlerts, stationId, onOpenCalibration }: TankCardProps) {
  const t = useTranslations("zyloLiquid.stationDetail.tankCard");
  const tSync = useTranslations("zyloLiquid.sync");
  const tLegend = useTranslations("zyloLiquid.stationDetail.tankCard.thresholdLegend");

  const tankAlerts = stationAlerts.filter((a) => a.tankId === tank.id);
  const hasLeak = tankAlerts.some((a) => a.type === "leak");
  const hasAlert = tankAlerts.length > 0;
  const offline = !state || state.sensorStatus !== "online";

  const capacity = tank.calibratedCapacityLiters ?? tank.capacityLiters;
  const visual = productVisual(fuelProduct?.name ?? "", fuelProduct?.displayColor ?? null);
  const fresh = state ? freshnessOf(state.lastMeasurementAt) : "off";

  // state.volumeLiters est DÉJÀ net (carburant seul — le backend soustrait
  // déjà l'eau, voir service.py get_tank_current_state) : ne jamais
  // resoustraire waterVolumeLiters ici, sinon l'eau est comptée en moins
  // deux fois.
  const fuelVolume = state?.volumeLiters ?? null;
  const pct = (v: number) => (capacity > 0 ? (v / capacity) * 100 : 0);
  const nfL = formatLiters;
  const nfPct = formatPercent;

  const volumeAtLowAlarm = calibrationPoints.length > 0 ? interpolateHeightToVolume(calibrationPoints, tank.lowAlarmMm) : null;
  const sellableVolume =
    state?.volumeLiters !== null && state?.volumeLiters !== undefined && volumeAtLowAlarm !== null
      ? Math.max(0, state.volumeLiters - volumeAtLowAlarm)
      : null;

  const fuelPct = fuelVolume === null ? null : pct(fuelVolume);
  const sellablePct = sellableVolume === null ? null : pct(sellableVolume);
  const waterPct = state?.waterVolumeLiters !== null && state?.waterVolumeLiters !== undefined ? pct(state.waterVolumeLiters) : null;
  const emptyPct = state?.emptyVolumeLiters !== null && state?.emptyVolumeLiters !== undefined ? pct(state.emptyVolumeLiters) : null;

  const availablePctBand = fuelPct === null ? null : fuelPct < 10 ? "crit" : fuelPct < 20 ? "warn" : "ok";
  const sellablePctBand = sellableVolume === null ? null : sellableVolume === 0 ? "crit" : (sellablePct ?? 0) < 10 ? "warn" : "ok";

  // Valeur vendable = volume VENDABLE (jamais le volume disponible) × prix
  // unitaire réel déjà appliqué par le backend pour ce couple station/produit
  // (monetaryValue = volumeLiters × prix résolu depuis PriceHistory — voir
  // service.py _resolve_tank_monetary_value). On redérive juste le prix
  // unitaire à partir de ces deux valeurs réelles, jamais un prix en dur.
  const unitPrice =
    state?.monetaryValue !== null && state?.monetaryValue !== undefined && state?.volumeLiters !== null && state?.volumeLiters !== undefined && state.volumeLiters > 0
      ? state.monetaryValue / state.volumeLiters
      : null;
  const sellableValue = unitPrice !== null && sellableVolume !== null ? sellableVolume * unitPrice : null;
  const sellableValueCurrencyCode = sellableValue !== null ? (state?.currencyCode ?? null) : null;

  const waterAlert = state?.waterHeightMm !== null && state?.waterHeightMm !== undefined && state.waterHeightMm >= tank.alertWaterMaxMm;

  const cardStateClass = hasLeak ? "border-l-4 border-l-error bg-error-muted/40" : hasAlert ? "border-l-4 border-l-warning bg-warning-muted/40" : offline ? "bg-surface-muted/60" : "";

  return (
    <Card padding="none" className={cn("flex min-h-[220px] gap-0", cardStateClass)}>
      <TankCardIdentityColumn
        tank={tank}
        badge={visual.badge}
        capacityLabel={t("capacity")}
        productLabel={t("product")}
        capacityText={`${nfL(capacity)} L`}
        productText={fuelProduct?.name ?? "?"}
        offline={offline}
        fresh={fresh}
        alerts={tankAlerts}
      />

      <TankGaugeColumn tank={tank} state={state} offline={offline} fuelColor={visual.fill} notCalculableLabel={t("notCalculable")} />

      <TankThresholdLegendColumn tank={tank} title={tLegend("title")} />

      <TankMetricsColumn
        fuelColor={visual.fill}
        fuelVolume={fuelVolume}
        fuelVolume15C={state?.volumeLiters15C ?? null}
        fuelPct={fuelPct}
        availablePctBand={availablePctBand}
        sellableVolume={sellableVolume}
        sellablePct={sellablePct}
        sellablePctBand={sellablePctBand}
        sellableValue={sellableValue}
        sellableValueCurrencyCode={sellableValueCurrencyCode}
        temperatureC={state?.temperatureC}
        offline={offline}
        waterVolumeLiters={state?.waterVolumeLiters}
        waterPct={waterPct}
        waterAlert={Boolean(waterAlert)}
        emptyVolumeLiters={state?.emptyVolumeLiters}
        emptyPct={emptyPct}
        nfL={nfL}
        nfPct={nfPct}
        labels={{
          available: t("available"),
          raw: t("rawVolume"),
          at15C: t("volumeAt15C"),
          sellable: t("sellable"),
          sellableValue: t("sellableValue"),
          notCalculable: t("notCalculableShort"),
          temperature: t("temperature"),
          offlineLabel: t("offline"),
          water: t("water"),
          empty: t("empty"),
        }}
      />

      <TankActionsColumn
        alerts={tankAlerts}
        offline={offline}
        syncLabel={!offline && state?.lastMeasurementAt ? tSync("label", { minutes: minutesAgo(state.lastMeasurementAt) }) : null}
        onOpenCalibration={onOpenCalibration}
        detailHref={`/zylo-liquid/stations/${stationId}/tanks/${tank.id}`}
        calibrationLabel={t("calibration")}
        detailLabel={t("detail")}
      />
    </Card>
  );
}
