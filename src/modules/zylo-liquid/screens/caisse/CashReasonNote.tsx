"use client";

import { useTranslations } from "next-intl";

/** Jamais un montant "non calculable" affiché sans explication (note
 * ajoutée par le commanditaire lors de la validation de page_caisse.md) —
 * un seul point de traduction des codes de raison, réutilisé à tous les
 * niveaux du drill-down plutôt que redupliqué. */
export function CashReasonNote({ reason }: { reason: string | null }) {
  const t = useTranslations("zyloLiquid.caisse.reasons");
  if (reason === null) return null;
  return <span className="text-caption text-text-muted">{t(reason)}</span>;
}
