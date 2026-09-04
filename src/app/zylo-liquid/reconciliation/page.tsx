"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "@/modules/zylo-liquid/components/ComingSoonPage";

export default function ReconciliationPage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.reconciliation")} subtitle={t("comingSoonPageSubtitle")} />;
}
