"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface DiscrepancyListItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  timeLabel: string;
}

/** Une seule définition de la ligne d'écart (stock ou caisse) pour les
 * widgets compacts du tableau de bord — réutilisée par
 * `DashboardStockDiscrepanciesWidget` et `DashboardCashDiscrepanciesWidget`,
 * jamais deux présentations différentes de la même donnée
 * `ReconciliationRecord` (même principe que `AlertCard` côté alertes,
 * refonte 2026-09-20). Purement présentationnel : label/valeur/date déjà
 * formatés par l'appelant, qui choisit aussi l'icône (le type d'écart
 * diffère : `Scale` pour caisse, `AlertTriangle` pour stock). */
export function DiscrepancyListItem({ href, icon: Icon, label, value, timeLabel }: DiscrepancyListItemProps) {
  return (
    <Link href={href} className="flex w-full items-start gap-2 rounded-card px-1 py-2 text-left transition-colors hover:bg-surface-muted">
      <Icon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-medium text-text">{label}</p>
        <p className="truncate text-caption text-text-muted">{value}</p>
      </div>
      <span className="shrink-0 text-caption text-text-muted">{timeLabel}</span>
    </Link>
  );
}
