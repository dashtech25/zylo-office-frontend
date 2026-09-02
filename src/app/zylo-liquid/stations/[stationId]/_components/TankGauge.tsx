"use client";

import type { Tank, TankCurrentState } from "@/core/api/zyloLiquid";

export interface TankGaugeProps {
  tank: Tank;
  state: TankCurrentState;
  fuelProductName: string;
  displayColor: string | null;
  formatVolume: (liters: number) => string;
  labels: {
    empty: string;
    fuel: string;
    water: string;
  };
}

/** Cylindre horizontal — les trois couches physiques réelles d'une cuve
 * (eau au fond, carburant au-dessus, air en haut) empilées de bas en haut
 * selon les hauteurs mesurées réelles (heightMm/waterHeightMm de
 * TankCurrentState), jamais des proportions inventées. Les seuils
 * (Tank.heightAlarmMm/heightAlertMm/lowAlarmMm) sont des lignes pointillées
 * positionnées à leur hauteur réelle, comme dans la maquette Page 4/3. */
export function TankGauge({ tank, state, fuelProductName, displayColor, formatVolume, labels }: TankGaugeProps) {
  const tankHeight = tank.tankHeightMm ?? 0;
  const toPct = (mm: number) => (tankHeight > 0 ? Math.max(0, Math.min(100, (mm / tankHeight) * 100)) : 0);

  const waterHeightMm = state.waterHeightMm ?? 0;
  const fuelTopMm = state.heightMm ?? 0;

  const waterPct = toPct(waterHeightMm);
  const fuelTopPct = toPct(fuelTopMm);
  const fuelPct = Math.max(0, fuelTopPct - waterPct);
  const emptyPct = Math.max(0, 100 - fuelTopPct);

  const emptyVolume = state.emptyVolumeLiters ?? 0;
  const fuelVolume = state.volumeLiters ?? 0;
  const waterVolume = state.waterVolumeLiters ?? 0;

  const thresholds = [
    { value: tank.heightAlarmMm, tone: "var(--color-error)" },
    { value: tank.heightAlertMm, tone: "var(--color-warning)" },
    { value: tank.lowAlarmMm, tone: "var(--color-warning)" },
  ];

  return (
    <div className="relative h-36 w-full overflow-hidden rounded-card border border-border bg-surface-muted">
      {emptyPct > 0.5 && (
        <div
          className="absolute inset-x-0 top-0 flex items-center justify-center text-caption font-medium text-text-muted"
          style={{ height: `${emptyPct}%` }}
        >
          {labels.empty} {formatVolume(emptyVolume)} ({Math.round(emptyPct)}%)
        </div>
      )}
      {fuelPct > 0.5 && (
        <div
          className="absolute inset-x-0 flex items-center justify-center text-caption font-semibold text-white"
          style={{ bottom: `${waterPct}%`, height: `${fuelPct}%`, background: displayColor ?? "var(--color-primary)" }}
        >
          {labels.fuel.toUpperCase()} {formatVolume(fuelVolume)} ({Math.round(fuelPct)}%)
        </div>
      )}
      {waterPct > 0.5 && (
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-center text-caption font-medium text-white"
          style={{ height: `${waterPct}%`, background: "var(--color-info)" }}
        >
          {labels.water} {formatVolume(waterVolume)} ({waterPct.toFixed(2)}%)
        </div>
      )}
      {thresholds.map((threshold, i) => (
        <div
          key={i}
          className="absolute inset-x-0 border-t border-dashed"
          style={{ bottom: `${toPct(threshold.value)}%`, borderColor: threshold.tone }}
          title={`${Math.round(threshold.value)} mm`}
        />
      ))}
      <span className="sr-only">{fuelProductName}</span>
    </div>
  );
}
