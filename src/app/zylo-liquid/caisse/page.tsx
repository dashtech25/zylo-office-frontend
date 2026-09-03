"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function CaissePage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.caisse")} subtitle={t("comingSoonPageSubtitle")} />;
}
