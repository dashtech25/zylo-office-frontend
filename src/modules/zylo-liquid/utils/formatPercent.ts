/** Formatage unique des pourcentages pour toute l'app Zylo Liquid — même
 * règle que `formatLiters` : valeur exacte, jamais plus de 4 décimales
 * (arrondi au-delà), aucune décimale si le nombre est entier. Une seule
 * fonction, jamais redupliquée par page/composant. */
export function formatPercent(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
}
