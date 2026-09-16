import type { useFormatter } from "next-intl";

/** Délai depuis la dernière mesure, lisible pour un utilisateur non
 * technique (P2 §5.1, audit module Stations 2026-09-16 : "Données à jour :
 * 2775 min" n'est pas compréhensible). Sous 24h, un format relatif
 * ("il y a 5 minutes", "il y a 2 heures", via `Intl.RelativeTimeFormat` —
 * même principe que l'horodatage des messages WhatsApp) ; au-delà, une date
 * complète plutôt qu'un nombre d'heures/minutes toujours croissant et
 * illisible. */
export function formatFreshness(iso: string, format: ReturnType<typeof useFormatter>): string {
  const date = new Date(iso);
  const ageMs = Date.now() - date.getTime();
  const ageMinutes = ageMs / 60000;

  if (ageMinutes < 60 * 24) {
    if (ageMinutes < 1) return format.relativeTime(date, { now: new Date(), unit: "second" });
    if (ageMinutes < 60) return format.relativeTime(date, { now: new Date(), unit: "minute" });
    return format.relativeTime(date, { now: new Date(), unit: "hour" });
  }
  return format.dateTime(date, { dateStyle: "short", timeStyle: "short" });
}
