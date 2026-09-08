"use client";

export interface StackedBarSeries {
  key: string;
  label: string;
  color: string;
}

export interface StackedBarPoint {
  at: string;
  values: Record<string, number>;
}

interface Props {
  points: StackedBarPoint[];
  series: StackedBarSeries[];
  formatValue: (value: number) => string;
  formatDate: (iso: string) => string;
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 8;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 28;

/** Barres empilées minimales en SVG pur — même choix que `TrendChart.tsx`
 * (aucune librairie de graphique dans le projet ; en ajouter une pour ce
 * seul besoin ne se justifie pas). Générique sur les séries tracées, pas
 * spécifique au carburant — réutilisable pour toute répartition par
 * catégorie dans le temps. */
export function StackedBarChart({ points, series, formatValue, formatDate }: Props) {
  if (points.length === 0) {
    return null;
  }

  const totals = points.map((p) => series.reduce((sum, s) => sum + (p.values[s.key] ?? 0), 0));
  const max = Math.max(...totals, 1);

  const plotW = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotH = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const barGap = 2;
  const barW = Math.max(1, plotW / points.length - barGap);

  const yTicks = 4;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={series.map((s) => s.label).join(", ")}>
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = (max * i) / yTicks;
        const y = PADDING_TOP + plotH - (v / max) * plotH;
        return (
          <g key={i}>
            <line x1={PADDING_LEFT} y1={y} x2={WIDTH - PADDING_RIGHT} y2={y} stroke="var(--color-border-subtle)" strokeWidth={1} />
            <text x={PADDING_LEFT - 6} y={y + 3} textAnchor="end" className="fill-text-muted text-[9px]">
              {formatValue(v)}
            </text>
          </g>
        );
      })}

      {points.map((p, i) => {
        const x = PADDING_LEFT + i * (barW + barGap);
        let cumulative = 0;
        const segments = series.map((s) => {
          const v = p.values[s.key] ?? 0;
          const y = PADDING_TOP + plotH - ((cumulative + v) / max) * plotH;
          const h = (v / max) * plotH;
          cumulative += v;
          return { key: s.key, color: s.color, y, h, v };
        });
        const showLabel = i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 8) === 0;
        return (
          <g key={p.at}>
            {segments.map(
              (seg) =>
                seg.h > 0 && (
                  <rect key={seg.key} x={x} y={seg.y} width={barW} height={seg.h} fill={seg.color}>
                    <title>{`${formatDate(p.at)} · ${series.find((s) => s.key === seg.key)?.label}: ${formatValue(seg.v)}`}</title>
                  </rect>
                )
            )}
            {showLabel && (
              <text x={x + barW / 2} y={HEIGHT - 6} textAnchor="middle" className="fill-text-muted text-[9px]">
                {formatDate(p.at)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
