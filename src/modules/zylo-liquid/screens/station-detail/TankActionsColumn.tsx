"use client";

import Link from "next/link";

import type { Alert } from "@/modules/zylo-liquid/services/zyloLiquidApi";

import { TankStatusBadge } from "@/modules/zylo-liquid/components/TankStatusBadge";
import { cn } from "@/shared/lib/cn";
import { Button, buttonVariants } from "@/shared/ui";

export interface TankActionsColumnProps {
  alerts: Alert[];
  offline: boolean;
  syncLabel: string | null;
  onOpenCalibration: () => void;
  detailHref: string;
  calibrationLabel: string;
  detailLabel: string;
}

/** Colonne E de la référence : statut sonde/alerte + sync, boutons
 * Calibration et Détail — SÉPARÉE de la colonne métriques (D). La fusion de
 * D et E dans une seule "colonne droite" était l'écart signalé avec la
 * référence (5 colonnes, pas 4). */
export function TankActionsColumn({ alerts, offline, syncLabel, onOpenCalibration, detailHref, calibrationLabel, detailLabel }: TankActionsColumnProps) {
  return (
    <div className="flex w-[150px] shrink-0 flex-col gap-2 border-l border-border-subtle p-4">
      <div className="flex flex-col gap-0.5">
        <TankStatusBadge alerts={alerts} offline={offline} variant="text" />
        {syncLabel && <span className="ml-3.5 text-caption text-text-disabled">{syncLabel}</span>}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onOpenCalibration}>
          {calibrationLabel}
        </Button>
        <Link className={cn(buttonVariants({ size: "sm" }), "w-full")} href={detailHref}>
          {detailLabel}
        </Link>
      </div>
    </div>
  );
}
