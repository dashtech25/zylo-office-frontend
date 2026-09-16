// Liste des fuseaux IANA pour le sélecteur de fuseau horaire du formulaire
// de station (P1-2, audit module Stations 2026-09-16) — remplace l'ancien
// champ de saisie libre. `Intl.supportedValuesOf` est standard dans tous
// les navigateurs cibles (composant "use client", jamais exécuté côté
// serveur) ; la liste de repli couvre au moins les fuseaux déjà utilisés
// par le référentiel Country du backend (`defaultTimezone`).
const FALLBACK_TIMEZONES = [
  "Africa/Abidjan", "Africa/Accra", "Africa/Algiers", "Africa/Cairo", "Africa/Casablanca",
  "Africa/Douala", "Africa/Johannesburg", "Africa/Kinshasa", "Africa/Lagos", "Africa/Nairobi",
  "Africa/Tunis", "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Sao_Paulo",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Singapore", "Asia/Tokyo",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Moscow",
  "UTC",
];

export function listIanaTimezones(): string[] {
  try {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      return Intl.supportedValuesOf("timeZone");
    }
  } catch {
    // Repli silencieux — environnement sans support de l'API.
  }
  return FALLBACK_TIMEZONES;
}
