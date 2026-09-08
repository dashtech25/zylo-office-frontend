"use client";

import { useTranslations } from "next-intl";

import type { CashConfidence } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge } from "@/shared/ui";

const TONE: Record<CashConfidence, "success" | "info" | "warning" | "neutral" | "error"> = {
  reliable: "success",
  partial: "info",
  incomplete_data: "warning",
  insufficient_data: "neutral",
  anomaly: "error",
};

/** Le chiffre de caisse n'est jamais présenté comme une valeur comptable
 * absolue (page_caisse.md §21/§33) — ce badge rend visible, à chaque
 * niveau du drill-down, le niveau de confiance du calcul sous-jacent. */
export function CashConfidenceBadge({ confidence }: { confidence: CashConfidence }) {
  const t = useTranslations("zyloLiquid.caisse.confidence");
  return (
    <Badge tone={TONE[confidence]} dot>
      {t(confidence)}
    </Badge>
  );
}
