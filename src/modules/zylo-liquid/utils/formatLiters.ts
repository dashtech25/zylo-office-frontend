/** Formatage unique des litres pour toute l'app Zylo Liquid — valeur
 * exacte, jamais plus de 4 décimales (arrondi au-delà), aucune décimale
 * si le nombre est entier (jamais de zéro de remplissage). Une seule
 * fonction, jamais redupliquée par page/composant. */
export function formatLiters(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
}
