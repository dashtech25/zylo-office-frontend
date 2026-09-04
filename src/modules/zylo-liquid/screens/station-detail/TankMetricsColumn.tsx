"use client";

import { cn } from "@/shared/lib/cn";

export interface TankMetricsColumnProps {
  fuelColor: string;
  fuelVolume: number | null;
  fuelVolume15C: number | null;
  fuelPct: number | null;
  availablePctBand: "crit" | "warn" | "ok" | null;
  sellableVolume: number | null;
  sellablePct: number | null;
  sellablePctBand: "crit" | "warn" | "ok" | null;
  sellableValue: number | null;
  sellableValueCurrencyCode: string | null;
  temperatureC: number | null | undefined;
  offline: boolean;
  waterVolumeLiters: number | null | undefined;
  waterPct: number | null;
  waterAlert: boolean;
  emptyVolumeLiters: number | null | undefined;
  emptyPct: number | null;
  nfL: (v: number) => string;
  nfPct: (v: number) => string;
  labels: { available: string; raw: string; at15C: string; sellable: string; sellableValue: string; notCalculable: string; temperature: string; offlineLabel: string; water: string; empty: string };
}

const BAND_TEXT_CLASS = { crit: "text-error", warn: "text-warning", ok: "text-text-muted" } as const;

/** Colonne D de la référence : Carburant (+ mini-barre), Eau, Vide — une
 * colonne à PART de la colonne statut/actions (E). Toutes les valeurs sont
 * les informations phares de la cuve : taille de police large et noir
 * franc (`text-text`), sinon elles se noient visuellement — retour
 * explicite du commanditaire.
 *
 * "Valeur vendable" est dérivée du VOLUME VENDABLE (jamais du volume
 * disponible) × le prix unitaire RÉEL déjà appliqué par le backend
 * (`state.monetaryValue / state.volumeLiters` — le même prix que celui qui
 * sert à calculer `monetaryValue`, jamais un prix codé en dur ici). */
export function TankMetricsColumn({
  fuelColor,
  fuelVolume,
  fuelVolume15C,
  fuelPct,
  availablePctBand,
  sellableVolume,
  sellablePct,
  sellablePctBand,
  sellableValue,
  sellableValueCurrencyCode,
  temperatureC,
  offline,
  waterVolumeLiters,
  waterPct,
  waterAlert,
  emptyVolumeLiters,
  emptyPct,
  nfL,
  nfPct,
  labels,
}: TankMetricsColumnProps) {
  return (
    <div className="flex w-[200px] shrink-0 flex-col gap-3 p-4">
      <div>
        <div className="text-caption text-text-muted">{labels.available}</div>
        <div className="flex items-end gap-3.5">
          <div>
            <div className={cn("text-h4 font-extrabold leading-tight", fuelVolume === 0 ? "text-error" : "text-text")}>{fuelVolume === null ? "—" : `${nfL(fuelVolume)} L`}</div>
            <div className="text-caption font-semibold text-text-disabled">{labels.raw}</div>
          </div>
          <div>
            <div className="text-body-md font-extrabold leading-tight text-text-muted">{fuelVolume15C === null ? "—" : `${nfL(fuelVolume15C)} L`}</div>
            <div className="text-caption font-semibold text-text-disabled">{labels.at15C}</div>
          </div>
        </div>
        {fuelVolume !== null && fuelPct !== null && (
          <>
            <div className="mt-1 h-1 overflow-hidden rounded-pill bg-surface-muted">
              <div className="h-full rounded-pill" style={{ width: `${Math.min(100, fuelPct)}%`, background: fuelColor }} />
            </div>
            <div className={cn("text-body-sm font-semibold", availablePctBand && BAND_TEXT_CLASS[availablePctBand])}>{nfPct(fuelPct)}%</div>
          </>
        )}
      </div>
      <div>
        <div className="text-caption text-text-muted">{labels.sellable}</div>
        {sellableVolume === null || sellablePct === null ? (
          <div className="text-body-md font-bold italic text-text-disabled">{labels.notCalculable}</div>
        ) : (
          <>
            <div className={cn("text-h4 font-extrabold leading-tight", sellablePctBand ? BAND_TEXT_CLASS[sellablePctBand] : "text-text")}>{nfL(sellableVolume)} L</div>
            <div className={cn("text-body-sm font-semibold", sellablePctBand ? BAND_TEXT_CLASS[sellablePctBand] : "text-text-muted")}>{nfPct(sellablePct)}%</div>
          </>
        )}
        <div className="mt-1">
          <div className="text-caption text-text-muted">{labels.sellableValue}</div>
          {sellableValue === null || sellableValueCurrencyCode === null ? (
            <div className="text-body-sm font-bold italic text-text-disabled">{labels.notCalculable}</div>
          ) : (
            <div className="text-body-lg font-extrabold text-text">
              {nfL(sellableValue)} {sellableValueCurrencyCode}
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="text-caption text-text-muted">{labels.temperature}</div>
        <div
          className={cn(
            "text-h4 font-extrabold",
            offline || temperatureC === null || temperatureC === undefined ? "text-text-disabled" : temperatureC > 45 ? "text-warning" : temperatureC < 5 ? "text-info" : "text-text"
          )}
        >
          {offline ? labels.offlineLabel : temperatureC === null || temperatureC === undefined ? "-- °C" : `${temperatureC.toFixed(1)} °C`}
        </div>
      </div>
      <div>
        <div className="text-caption text-text-muted">{labels.water}</div>
        <div className={cn("text-h4 font-extrabold", waterAlert ? "text-error" : "text-text")}>{waterVolumeLiters === undefined || waterVolumeLiters === null ? "—" : `${nfL(waterVolumeLiters)} L`}</div>
        <div className={cn("text-caption font-semibold", waterAlert ? "text-error" : "text-text-muted")}>{waterPct !== null ? `${nfPct(waterPct)}%` : ""}</div>
      </div>
      <div>
        <div className="text-caption text-text-muted">{labels.empty}</div>
        <div className="text-h4 font-extrabold text-text">{emptyVolumeLiters === undefined || emptyVolumeLiters === null ? "—" : `${nfL(emptyVolumeLiters)} L`}</div>
        <div className="text-caption font-semibold text-text-muted">{emptyPct !== null ? `${nfPct(emptyPct)}%` : ""}</div>
      </div>
    </div>
  );
}
