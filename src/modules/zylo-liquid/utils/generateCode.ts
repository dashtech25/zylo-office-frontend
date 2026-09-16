import { normalizeSearchText } from "@/modules/zylo-liquid/utils/normalizeSearchText";

// Génération automatique de code, généralisée à tout champ "code" du projet
// (P2 §5.4, audit module Stations 2026-09-16 : déjà demandée pour le code
// station en §4.1, à étendre à la cuve, au produit, etc.). Dérive un
// préfixe lisible du nom saisi (accents/casse déjà neutralisés par
// `normalizeSearchText`) plutôt qu'un code purement aléatoire, complété
// d'un suffixe numérique aléatoire pour limiter les collisions — jamais une
// garantie d'unicité en soi, la vérification reste côté backend (contrainte
// d'unicité déjà en place sur ces champs).
export function generateCode(seed: string, maxLength: number): string {
  const base = normalizeSearchText(seed)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffixLength = Math.min(4, Math.max(2, maxLength - 4));
  const suffix = Math.random()
    .toString(36)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, suffixLength);
  const prefixLength = Math.max(1, maxLength - suffix.length - 1);
  const prefix = base.slice(0, prefixLength) || "CODE";
  return suffix ? `${prefix}-${suffix}`.slice(0, maxLength) : prefix.slice(0, maxLength);
}
