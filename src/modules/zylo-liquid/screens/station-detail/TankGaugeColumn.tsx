"use client";

import { useFormatter } from "next-intl";

import type { Tank, TankCurrentState } from "@/modules/zylo-liquid/services/zyloLiquidApi";

import { TankGauge } from "@/modules/zylo-liquid/components/TankGauge";

export interface TankGaugeColumnProps {
  tank: Tank;
  state: TankCurrentState | null;
  offline: boolean;
  fuelColor: string;
  notCalculableLabel: string;
}

/** Colonne B de la référence : le cylindre — délègue entièrement à
 * `TankGauge` (source unique, voir modules/zylo-liquid/components/TankGauge),
 * ne gère que les états de repli (hors ligne / pas de mesure) qui n'ont pas
 * de sens pour `TankGauge` lui-même. */
export function TankGaugeColumn({ tank, state, offline, fuelColor, notCalculableLabel }: TankGaugeColumnProps) {
  const format = useFormatter();
  return (
    <div className="flex min-w-[320px] flex-1 items-center px-3 py-4">
      {offline ? (
        <div className="flex w-full items-center justify-center text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-text-disabled">-- L</span>
            {state?.lastMeasurementAt && (
              <span className="text-caption italic text-text-disabled">
                Dernière mesure : {format.dateTime(new Date(state.lastMeasurementAt), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      ) : state ? (
        <TankGauge tank={tank} state={state} fuelColor={fuelColor} size="detailed" />
      ) : (
        <span className="text-caption text-text-muted">{notCalculableLabel}</span>
      )}
    </div>
  );
}
