"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/shared/ui";
import type { AlertSeverity } from "@/modules/zylo-liquid/services/zyloLiquidApi";

// Exportée pour que tout autre composant affichant une couleur de sévérité
// (ex. les pastilles du panneau de filtres) réutilise le même mapping — ne
// jamais redéfinir sévérité→couleur une deuxième fois ailleurs.
export const SEVERITY_TONE: Record<AlertSeverity, "error" | "warning" | "info" | "low"> = {
  critical: "error",
  high: "warning",
  medium: "info",
  low: "low",
};

export const SEVERITY_DOT_CLASS: Record<AlertSeverity, string> = {
  critical: "bg-error",
  high: "bg-warning",
  medium: "bg-info",
  low: "bg-low",
};

// Accent de bordure gauche par sévérité (cartes/lignes d'alerte pleine
// largeur) — même mapping que `SEVERITY_TONE`/`SEVERITY_DOT_CLASS`, jamais
// une quatrième redéfinition locale (ex. AlertRow avant refonte 2026-09-20).
export const SEVERITY_BORDER_CLASS: Record<AlertSeverity, string> = {
  critical: "border-l-4 border-l-error",
  high: "border-l-4 border-l-warning",
  medium: "border-l-4 border-l-info",
  low: "border-l-4 border-l-low",
};

export interface SeverityBadgeProps {
  severity: AlertSeverity;
  className?: string;
}

/** Pastille de sévérité d'alerte — seule source de mapping sévérité→couleur
 * du Centre d'alertes (2026-09-20). Composée sur `Badge` (jamais un style
 * recomposé à la main), réutilisée par `AlertCard` et le panneau de détail
 * plutôt que dupliquée à chaque endroit qui affiche une sévérité. Réutilise
 * les libellés déjà traduits de la page Alertes historique
 * (`zyloLiquid.alerts.page.severity.*`) — jamais un second jeu de clés. */
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const t = useTranslations("zyloLiquid.alerts.page.severity");
  return (
    <Badge tone={SEVERITY_TONE[severity]} className={className}>
      {t(severity)}
    </Badge>
  );
}
