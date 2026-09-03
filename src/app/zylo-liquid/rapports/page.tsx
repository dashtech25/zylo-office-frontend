"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function RapportsPage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.rapports")} subtitle={t("comingSoonPageSubtitle")} />;
}
