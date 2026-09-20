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
