"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function CaisseEcartsPage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.caisseEcarts")} subtitle={t("comingSoonPageSubtitle")} />;
}
