"use client";

import { useFormatter } from "next-intl";

import type { Tank, TankCurrentState } from "@/modules/zylo-liquid/services/zyloLiquidApi";

import { TankVisual, type TankVisualMode } from "@/modules/zylo-liquid/components/TankVisual";
import { formatFreshness } from "@/shared/lib/formatDateTime";

export type TankGaugeMode = TankVisualMode;

export interface TankGaugeColumnProps {
  tank: Tank;
  state: TankCurrentState | null;
  offline: boolean;
  fuelColor: string;
  notCalculableLabel: string;
  mode: TankGaugeMode;
}

/** Colonne B de la référence : le cylindre — délègue entièrement à
 * `TankVisual` (source unique des 4 modes de représentation, voir
 * components/TankVisual.tsx — réutilisée ici plutôt que dupliquée, cf.
 * TanksNetworkScreen.tsx/TankDetailScreen.tsx qui l'utilisent déjà), ne
 * gère que les états de repli (hors ligne / pas de mesure) communs aux 4
 * modes. `big` n'est activé qu'en mode horizontal : c'est le seul mode à
 * afficher les badges de seuil atteint (le plus riche des 4), les 3 autres
 * gardent leur taille compacte adaptée à une vignette. */
export function TankGaugeColumn({ tank, state, offline, fuelColor, notCalculableLabel, mode }: TankGaugeColumnProps) {
  const format = useFormatter();
  return (
    <div className="flex w-full items-center justify-center py-2">
      {offline ? (
        <div className="flex w-full items-center justify-center text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-text-disabled">-- L</span>
            {state?.lastMeasurementAt && (
              <span className="text-caption italic text-text-disabled">
                Dernière mesure : {formatFreshness(state.lastMeasurementAt, format)}
              </span>
            )}
          </div>
        </div>
      ) : state ? (
        <TankVisual tank={tank} state={state} mode={mode} big={mode === "horizontal"} fuelColor={fuelColor} />
      ) : (
        <span className="text-caption text-text-muted">{notCalculableLabel}</span>
      )}
    </div>
  );
}
