// Recherche insensible à la casse ET aux accents (P1-12, audit module
// Stations 2026-09-16 : saisir "marche" ne retrouvait pas la station
// "Marché", alors que "marché" la retrouvait). `NFD` décompose chaque
// caractère accentué en lettre de base + diacritique combinant, que la
// classe Unicode `\p{Diacritic}` supprime ensuite — fonctionne pour tout
// accent latin, pas seulement le français.
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
