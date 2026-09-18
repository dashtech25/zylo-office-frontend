import type { useFormatter } from "next-intl";

/** Point UNIQUE de formatage des dates/durées pour tout Zylo Office (tous
 * modules — Liquid, Tanker, core). Avant ce fichier, chaque écran
 * réimplémentait sa propre version (`toLocaleString()`, `minutesAgo()`
 * locale, `format.dateTime` avec des options différentes partout) — jamais
 * deux écrans n'affichaient une même notion ("il y a combien de temps ?")
 * de la même façon. Toute nouvelle réimplémentation locale de ce genre de
 * logique est un bug par construction : importer d'ici, jamais dupliquer. */

/** Délai depuis un instant PASSÉ, lisible pour un utilisateur non technique
 * (P2 §5.1, audit module Stations 2026-09-16 : "Données à jour : 2775 min"
 * n'est pas compréhensible). Sous 24h, un format relatif ("il y a 5
 * minutes", "il y a 2 heures", via `Intl.RelativeTimeFormat` — même
 * principe que l'horodatage des messages WhatsApp) ; au-delà, une date
 * complète plutôt qu'un nombre d'heures/minutes toujours croissant et
 * illisible. */
export function formatFreshness(iso: string, format: ReturnType<typeof useFormatter>): string {
  const date = new Date(iso);
  // Clamp à 0 : une mesure "future" par rapport à l'horloge du navigateur
  // (dérive d'horloge, donnée de simulateur/démo mal générée) ne doit jamais
  // s'afficher comme un compte à rebours ("dans X secondes" — comportement
  // naturel d'Intl.RelativeTimeFormat pour un delta positif) — toujours "à
  // l'instant" au pire, jamais une projection dans le futur.
  const ageMs = Math.max(0, Date.now() - date.getTime());
  const ageMinutes = ageMs / 60000;

  if (ageMinutes < 60 * 24) {
    if (ageMinutes < 1) return format.relativeTime(date, { now: new Date(), unit: "second" });
    if (ageMinutes < 60) return format.relativeTime(date, { now: new Date(), unit: "minute" });
    return format.relativeTime(date, { now: new Date(), unit: "hour" });
  }
  return format.dateTime(date, { dateStyle: "short", timeStyle: "short" });
}

export type FreshnessTone = "ok" | "late" | "old" | "never";

/** Tonalité (couleur de badge) associée à l'ancienneté d'une mesure —
 * mêmes seuils partout (15 min = à jour, 45 min = en retard, au-delà =
 * ancien) : deux écrans qui dupliquaient chacun leurs propres seuils
 * (15/45 ici, 15/60 ailleurs) pouvaient afficher deux couleurs différentes
 * pour la même fraîcheur réelle. */
export function getFreshnessTone(lastMeasurementAt: string | null): FreshnessTone {
  if (!lastMeasurementAt) return "never";
  const ageMin = (Date.now() - new Date(lastMeasurementAt).getTime()) / 60000;
  if (ageMin <= 15) return "ok";
  if (ageMin <= 45) return "late";
  return "old";
}

/** Durée brute en MINUTES (pas un instant, ex. un écart entre deux
 * horodatages) rendue lisible — "2775 min" devient "1 j 22 h", jamais un
 * compteur de minutes qui grandit sans fin. */
export function formatDurationMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days} j ${remainingHours} h` : `${days} j`;
}

/** Délai jusqu'à une ÉCHÉANCE FUTURE (expiration de document, fin de
 * contrat, prochain contrôle) — pendant N.B. de `formatFreshness`, qui ne
 * traite que le passé. Toujours une date lisible + une mention explicite du
 * délai restant ("expire dans 12 jours") ou du retard ("expiré depuis 3
 * jours") — jamais une date brute seule, qu'un gérant non technique ne peut
 * pas situer dans le temps sans calculer mentalement. */
export function formatDueDate(iso: string, format: ReturnType<typeof useFormatter>): { date: string; relative: string; overdue: boolean } {
  const date = new Date(iso);
  const overdue = Date.now() - date.getTime() > 0;
  return {
    date: format.dateTime(date, { dateStyle: "long" }),
    relative: format.relativeTime(date, { now: new Date(), unit: "day" }),
    overdue,
  };
}
