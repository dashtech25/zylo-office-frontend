"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { NetworkCashSummary } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Card } from "@/shared/ui";

/** Synthèse quotidienne automatique (page_caisse.md §L, P3) : quelques
 * phrases générées par des règles déterministes à partir des chiffres déjà
 * calculés (aucun appel supplémentaire, aucune IA) — jamais présentée
 * comme une analyse intelligente, seulement un résumé lisible de données
 * déjà à l'écran. N'apparaît que pour "Aujourd'hui" : un résumé quotidien
 * n'a pas de sens sur une plage de plusieurs jours ou personnalisée. */
export function DailySummaryCard({
  data,
  comparisonData,
  weeklyAverageData,
}: {
  data: NetworkCashSummary | null;
  comparisonData: NetworkCashSummary | null;
  weeklyAverageData: NetworkCashSummary | null;
}) {
  const t = useTranslations("zyloLiquid.caisse.dailySummary");

  const sentences = useMemo(() => {
    if (!data || data.currencyBlocks.length === 0) return [];
    const lines: string[] = [];

    for (const block of data.currencyBlocks) {
      // Le montant total n'est plus répété ici : il est désormais affiché en
      // très grand tout en haut de la page (CaisseScreen.tsx, bloc "hero") —
      // ce résumé ne garde que les phrases qui apportent une info
      // supplémentaire (comparaisons, meilleure/pire contribution, alertes).
      const yesterdayBlock = comparisonData?.currencyBlocks.find((b) => b.currencyCode === block.currencyCode);
      if (yesterdayBlock && yesterdayBlock.monetaryValue > 0) {
        const pct = ((block.monetaryValue - yesterdayBlock.monetaryValue) / yesterdayBlock.monetaryValue) * 100;
        lines.push(t(pct >= 0 ? "vsYesterdayUp" : "vsYesterdayDown", { pct: Math.abs(pct).toFixed(1) }));
      }

      const weeklyBlock = weeklyAverageData?.currencyBlocks.find((b) => b.currencyCode === block.currencyCode);
      const dailyAverage = weeklyBlock && weeklyBlock.monetaryValue > 0 ? weeklyBlock.monetaryValue / 7 : null;
      if (dailyAverage !== null) {
        const pct = ((block.monetaryValue - dailyAverage) / dailyAverage) * 100;
        lines.push(t(pct >= 0 ? "vsAverageUp" : "vsAverageDown", { pct: Math.abs(pct).toFixed(1) }));
      }

      const withValue = block.stations.filter((s): s is typeof s & { monetaryValue: number } => s.monetaryValue !== null);
      if (withValue.length >= 2) {
        const sorted = [...withValue].sort((a, b) => b.monetaryValue - a.monetaryValue);
        lines.push(t("bestStation", { station: sorted[0].stationName }));
        lines.push(t("worstStation", { station: sorted[sorted.length - 1].stationName }));
      }

      const degraded = block.stations.filter((s) => s.confidence === "anomaly" || s.confidence === "insufficient_data");
      if (degraded.length > 0) {
        lines.push(t("attentionNeeded", { count: degraded.length }));
      }
    }

    return lines;
  }, [data, comparisonData, weeklyAverageData, t]);

  if (sentences.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-primary">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">{t("title")}</p>
          <ul className="flex flex-col gap-0.5 text-body-sm text-text">
            {sentences.map((sentence, i) => (
              <li key={i}>{sentence}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
