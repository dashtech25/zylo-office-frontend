"use client";

import { cn } from "@/shared/lib/cn";

/** Ligne label/valeur générique pour les cartes d'information (seuils,
 * capteur, calibration, valeur financière, caractéristiques techniques…).
 * Réutilisable partout où Zylo Liquid affiche une liste clé/valeur dans
 * une carte, sans dépendre d'un domaine métier précis. */
export function InfoRow({
  label,
  value,
  mono,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1.5 text-body-sm", className)}>
      <span className="text-text-muted">{label}</span>
      <span className={cn("font-medium text-text", mono && "font-mono tabular-nums")}>{value}</span>
    </div>
  );
}
