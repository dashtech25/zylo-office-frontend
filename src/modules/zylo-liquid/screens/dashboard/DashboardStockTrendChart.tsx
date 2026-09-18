"use client";

import ReactECharts from "echarts-for-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { ChartPoint, ProductAggregate } from "@/modules/zylo-liquid/hooks/useNetworkDashboard";
import { Card, EmptyState, Modal } from "@/shared/ui";
import { Skeleton } from "@/shared/ui/Skeleton";

// Même palette de secours que `StationDetailScreen` (PRODUCT_COLOR_FALLBACK)
// — un produit sans `displayColor` doit toujours retomber sur les mêmes
// couleurs ailleurs dans l'app, jamais une palette inventée pour ce seul
// composant.
const PRODUCT_COLOR_FALLBACK = ["#1B998B", "#D4A017", "#8E44AD", "#3498DB", "#E74C3C", "#2ECC71"];

function resolveColor(product: ProductAggregate, index: number): string {
  return product.displayColor ?? PRODUCT_COLOR_FALLBACK[index % PRODUCT_COLOR_FALLBACK.length];
}

interface Props {
  points: ChartPoint[];
  products: ProductAggregate[];
  loading: boolean;
  formatVolume: (liters: number) => string;
  formatDate: (iso: string) => string;
  title: string;
  modalTitle: string;
  emptyLabel?: string;
}

/** Rangée 4 du dashboard réseau — remplace l'ancien `TrendChart` SVG
 * mono-série par un graphique Apache ECharts multi-série ("area-simple",
 * https://echarts.apache.org/examples/en/editor.html?c=area-simple), une
 * ligne par produit, superposées (pas empilées) — décision utilisateur. Le
 * clic ouvre une modale avec un graphique séparé par produit. */
export function DashboardStockTrendChart({
  points,
  products,
  loading,
  formatVolume,
  formatDate,
  title,
  modalTitle,
  emptyLabel,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const tCommon = useTranslations("common");

  if (loading) {
    return <Skeleton className="h-56 w-full" />;
  }

  if (points.length < 2) {
    return <EmptyState title={emptyLabel ?? title} />;
  }

  const xAxisData = points.map((p) => formatDate(p.at));

  const mainOption = {
    grid: { left: 56, right: 16, top: 48, bottom: 32 },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number) => formatVolume(value),
    },
    xAxis: {
      type: "category",
      data: xAxisData,
      boundaryGap: false,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (value: number) => formatVolume(value) },
    },
    series: products.map((product, i) => {
      const color = resolveColor(product, i);
      return {
        name: product.name,
        type: "line",
        smooth: true,
        symbolSize: 5,
        data: points.map((p) => p.products.find((pp) => pp.fuelProductId === product.fuelProductId)?.volumeLiters ?? 0),
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        areaStyle: { color, opacity: 0.15 },
      };
    }),
  };

  return (
    <>
      <div className="cursor-pointer" onClick={() => setModalOpen(true)}>
        <ReactECharts option={mainOption} style={{ height: 240, width: "100%" }} aria-label={title} />
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={modalTitle} closeLabel={tCommon("actions.close")} size="xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {products.map((product, i) => {
            const color = resolveColor(product, i);
            const productOption = {
              grid: { left: 56, right: 16, top: 16, bottom: 32 },
              tooltip: {
                trigger: "axis",
                valueFormatter: (value: number) => formatVolume(value),
              },
              xAxis: {
                type: "category",
                data: xAxisData,
                boundaryGap: false,
                axisLabel: { fontSize: 10 },
              },
              yAxis: {
                type: "value",
                axisLabel: { formatter: (value: number) => formatVolume(value) },
              },
              series: [
                {
                  name: product.name,
                  type: "line",
                  smooth: true,
                  symbolSize: 5,
                  data: points.map((p) => p.products.find((pp) => pp.fuelProductId === product.fuelProductId)?.volumeLiters ?? 0),
                  lineStyle: { color, width: 2 },
                  itemStyle: { color },
                  areaStyle: { color, opacity: 0.15 },
                },
              ],
            };

            return (
              <Card key={product.fuelProductId} padding="sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-body-md font-semibold text-text">{product.name}</span>
                </div>
                <ReactECharts option={productOption} style={{ height: 160, width: "100%" }} aria-label={product.name} />
              </Card>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
