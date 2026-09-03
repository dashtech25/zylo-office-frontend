"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function HypothesesPage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.hypotheses")} subtitle={t("comingSoonPageSubtitle")} />;
}
