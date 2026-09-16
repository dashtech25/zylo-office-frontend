"use client";

import ReactECharts from "echarts-for-react";

export interface EChartsTrendChartPoint {
  at: string;
  value: number;
}

interface Props {
  points: EChartsTrendChartPoint[];
  formatValue: (value: number) => string;
  formatDate: (iso: string) => string;
  seriesLabel: string;
  height?: number;
}

/** Remplaçant direct de `TrendChart` (zylo-liquid, SVG pur) pour Zylo Tanker
 * — même signature de props, drop-in — mais rendu avec Apache ECharts
 * (https://echarts.apache.org/examples), seule bibliothèque de graphique
 * autorisée pour ce chantier (consigne explicite). Générique sur la valeur
 * tracée, aucune connaissance métier ici. */
export function EChartsTrendChart({ points, formatValue, formatDate, seriesLabel, height = 220 }: Props) {
  if (points.length < 2) {
    return null;
  }

  const option = {
    grid: { left: 48, right: 16, top: 16, bottom: 32 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number) => formatValue(value),
    },
    xAxis: {
      type: "category",
      data: points.map((p) => formatDate(p.at)),
      boundaryGap: false,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (value: number) => formatValue(value) },
    },
    series: [
      {
        name: seriesLabel,
        type: "line",
        smooth: true,
        symbolSize: 6,
        data: points.map((p) => p.value),
        areaStyle: { color: "var(--color-primary-muted)" },
        lineStyle: { color: "var(--color-primary)", width: 2 },
        itemStyle: { color: "var(--color-primary)" },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height, width: "100%" }} aria-label={seriesLabel} />;
}
