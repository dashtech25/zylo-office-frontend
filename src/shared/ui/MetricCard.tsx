"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}

/** Petite carte de mesure clé (label en majuscule + icône + valeur en
 * grand) — distincte de `Kpi` (carte plus grande, icône+libellé en tête,
 * tendance/unité optionnelles, bordure de ton) : `MetricCard` est le format
 * compact utilisé pour une grille dense de 4 mesures côte à côte (ex.
 * panneau de détail d'une alerte), jamais un doublon de `Kpi` — deux
 * densités visuelles différentes pour deux usages différents. */
export function MetricCard({ icon: Icon, label, value, className }: MetricCardProps) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-card border border-border-subtle bg-surface p-4 shadow-card", className)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <p className="text-caption font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <p className="mt-0.5 truncate text-body-md font-semibold text-text">{value}</p>
      </div>
    </div>
  );
}
