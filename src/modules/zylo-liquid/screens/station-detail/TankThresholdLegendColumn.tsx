"use client";

import type { Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";

const THRESHOLD_LEGEND = [
  { key: "high", label: "Seuil haut", colorClass: "border-error" },
  { key: "preAlarm", label: "Pré-alarme", colorClass: "border-warning" },
  { key: "low", label: "Seuil bas", colorClass: "border-primary" },
  { key: "water", label: "Seuil eau", colorClass: "border-info" },
] as const;

export interface TankThresholdLegendColumnProps {
  tank: Tank;
  title: string;
}

/** Colonne C de la référence : légende des 4 seuils réels de la cuve
 * (hauteurs en mm, déjà en base — jamais de valeur par défaut inventée). */
export function TankThresholdLegendColumn({ tank, title }: TankThresholdLegendColumnProps) {
  return (
    <div className="w-[130px] shrink-0 border-x border-border-subtle px-3 py-4">
      <div className="mb-2 text-caption uppercase text-text-muted">{title}</div>
      <div className="flex flex-col gap-2">
        {THRESHOLD_LEGEND.map((th) => (
          <div key={th.key} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`h-0 w-4 border-t-2 border-dashed ${th.colorClass}`} />
              <span className="text-caption text-text-muted">{th.label}</span>
            </div>
            <span className="text-caption font-semibold text-text">
              {Math.round(th.key === "high" ? tank.heightAlarmMm : th.key === "preAlarm" ? tank.heightAlertMm : th.key === "low" ? tank.lowAlarmMm : tank.alertWaterMaxMm)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
