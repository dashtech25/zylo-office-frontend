"use client";

export interface TrendChartPoint {
  at: string;
  value: number;
}

interface Props {
  points: TrendChartPoint[];
  formatValue: (value: number) => string;
  formatDate: (iso: string) => string;
  seriesLabel: string;
}

const WIDTH = 640;
const HEIGHT = 200;
const PADDING = 24;

/** Ligne de tendance minimale en SVG pur — aucune librairie de graphique
 * n'est installée dans le projet ; en ajouter une pour une seule courbe ne
 * se justifie pas (cohérent avec le choix déjà fait ailleurs d'éviter une
 * dépendance pour un composant simple, ex. le menu compte de AppShell).
 * Générique sur la valeur tracée — réutilisé par le stock réseau (Page 1)
 * et l'historique de niveau d'une cuve (Page 4), jamais dupliqué. */
export function TrendChart({ points, formatValue, formatDate, seriesLabel }: Props) {
  if (points.length < 2) {
    return null;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  const stepX = (WIDTH - PADDING * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = PADDING + i * stepX;
    const y = PADDING + (1 - (p.value - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y, point: p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT - PADDING} L${coords[0].x.toFixed(1)},${HEIGHT - PADDING} Z`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={seriesLabel}>
      <path d={areaPath} fill="var(--color-primary-muted)" />
      <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      {coords.map((c) => (
        <circle key={c.point.at} cx={c.x} cy={c.y} r={3} fill="var(--color-primary)" />
      ))}
      {coords.map((c, i) => (
        <text
          key={`${c.point.at}-label`}
          x={c.x}
          y={HEIGHT - 4}
          textAnchor={i === 0 ? "start" : i === coords.length - 1 ? "end" : "middle"}
          className="fill-text-muted text-[10px]"
        >
          {formatDate(c.point.at)}
        </text>
      ))}
      <title>{points.map((p) => `${formatDate(p.at)}: ${formatValue(p.value)}`).join("\n")}</title>
    </svg>
  );
}
