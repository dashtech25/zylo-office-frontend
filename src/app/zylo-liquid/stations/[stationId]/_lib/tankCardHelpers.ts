import type { CalibrationPoint } from "@/core/api/zyloLiquid";

/** Catégorie visuelle déduite du nom réel du produit (mot-clé, insensible
 * à la casse/accents) — le référentiel FuelProduct est en texte libre créé
 * par l'organisation, sans enum de catégorie. Une catégorie reconnue pilote
 * la couleur du badge et du remplissage du cylindre, conformément à la
 * palette de la spécification ; un produit non reconnu retombe sur
 * `displayColor` (réel, déjà en base) puis sur un gris neutre — jamais une
 * couleur de catégorie inventée pour un produit qu'on ne peut pas classer. */
export type ProductCategory = "super" | "gasoil" | "petrole" | "kerosene" | null;

export function productCategory(name: string): ProductCategory {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (n.includes("super")) return "super";
  if (n.includes("gasoil") || n.includes("diesel") || n.includes("go")) return "gasoil";
  if (n.includes("petrole") || n.includes("lampant")) return "petrole";
  if (n.includes("kerosene") || n.includes("jet")) return "kerosene";
  return null;
}

export const PRODUCT_BADGE_STYLES: Record<Exclude<ProductCategory, null>, { bg: string; text: string; border: string }> = {
  super: { bg: "#EBF5FB", text: "#2980B9", border: "#AED6F1" },
  gasoil: { bg: "#EAFAF1", text: "#1E8449", border: "#A9DFBF" },
  petrole: { bg: "#FEF9E7", text: "#B7770D", border: "#F9E79F" },
  kerosene: { bg: "#FDEDEC", text: "#C0392B", border: "#F1948A" },
};

export const PRODUCT_FILL_COLORS: Record<Exclude<ProductCategory, null>, string> = {
  super: "#3498DB",
  gasoil: "#F39C12",
  petrole: "#2C3E50",
  kerosene: "#E74C3C",
};

export function productVisual(name: string, displayColor: string | null): { badge: { bg: string; text: string; border: string }; fill: string } {
  const cat = productCategory(name);
  if (cat) return { badge: PRODUCT_BADGE_STYLES[cat], fill: PRODUCT_FILL_COLORS[cat] };
  const fallback = displayColor ?? "#687280";
  return { badge: { bg: "#F1F4F7", text: fallback, border: "#DDE3EA" }, fill: fallback };
}

/** Interpolation linéaire hauteur→volume entre les deux points de
 * calibration encadrants, bornée hors plage — réplique côté client
 * l'algorithme déjà validé côté backend (`interpolate_height_to_volume`,
 * app/modules/zylo_liquid/algorithms.py) pour calculer le volume vendable
 * (volume à la hauteur courante moins volume à l'alarme basse) sans
 * endpoint dédié : la table de calibration complète est déjà disponible
 * (endpoint 5), c'est la même donnée, le même calcul, appliqué une
 * deuxième fois à une hauteur différente. */
export function interpolateHeightToVolume(points: CalibrationPoint[], heightMm: number): number | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.heightMm - b.heightMm);
  if (heightMm <= sorted[0].heightMm) return sorted[0].volumeLiters;
  if (heightMm >= sorted[sorted.length - 1].heightMm) return sorted[sorted.length - 1].volumeLiters;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (heightMm >= a.heightMm && heightMm <= b.heightMm) {
      if (b.heightMm === a.heightMm) return a.volumeLiters;
      const ratio = (heightMm - a.heightMm) / (b.heightMm - a.heightMm);
      return a.volumeLiters + ratio * (b.volumeLiters - a.volumeLiters);
    }
  }
  return null;
}
