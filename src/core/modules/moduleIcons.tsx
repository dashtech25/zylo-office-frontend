import { Droplet, Package, type LucideIcon } from "lucide-react";

/** Aucun champ icône n'existe sur le modèle Module côté backend — le mapping
 * vit ici, côté client, clé par moduleCode. Fallback générique pour tout
 * futur module non encore mappé, jamais une erreur de rendu. */
const MODULE_ICONS: Record<string, LucideIcon> = {
  zylo_liquid: Droplet,
};

export function getModuleIcon(moduleCode: string): LucideIcon {
  return MODULE_ICONS[moduleCode] ?? Package;
}
