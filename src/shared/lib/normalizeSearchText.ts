// Recherche insensible à la casse ET aux accents — util partagé (utilisé
// par le composant Select factorisé avec recherche intégrée, P2 §5.5,
// audit module Stations 2026-09-16, et par la recherche de station, P1-12).
// `NFD` décompose chaque caractère accentué en lettre de base + diacritique
// combinant, que la classe Unicode `\p{Diacritic}` supprime ensuite.
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
