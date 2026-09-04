"use client";

import type { Alert, Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";

import { TankStatusBadge } from "@/modules/zylo-liquid/components/TankStatusBadge";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui";

export interface TankCardIdentityColumnProps {
  tank: Tank;
  badge: { bg: string; text: string };
  capacityLabel: string;
  productLabel: string;
  capacityText: string;
  productText: string;
  offline: boolean;
  fresh: "ok" | "warn" | "off";
  alerts: Alert[];
}

const DOT_CLASS = { ok: "bg-success", warn: "bg-warning", off: "bg-error" } as const;

/** Colonne A de la référence : statut + nom de la cuve (+ icône d'alerte),
 * badge produit, capacité, produit — jamais de logique de calcul ici, tout
 * arrive déjà dérivé depuis `TankCard`. */
export function TankCardIdentityColumn({ tank, badge, capacityLabel, productLabel, capacityText, productText, offline, fresh, alerts }: TankCardIdentityColumnProps) {
  return (
    <div className="w-[140px] shrink-0 border-r border-border-subtle p-4">
      <div className="flex items-center gap-2">
        <span className={cn("size-2.5 shrink-0 rounded-full", offline ? "bg-text-disabled" : DOT_CLASS[fresh])} />
        <span className="text-body-md font-semibold text-text">{tank.displayName}</span>
        <TankStatusBadge alerts={alerts} offline={offline} variant="icon" />
      </div>
      <div className="mt-2">
        <Badge tone="secondary" style={{ background: badge.bg, color: badge.text }}>
          {productText}
        </Badge>
      </div>
      <div className="mt-3">
        <div className="text-caption text-text-muted">{capacityLabel}</div>
        <div className="text-h3 font-extrabold leading-tight text-text">{capacityText}</div>
      </div>
      <div className="mt-2.5">
        <div className="text-caption text-text-muted">{productLabel}</div>
        <div className="text-body-sm font-bold text-text">{productText}</div>
      </div>
    </div>
  );
}
