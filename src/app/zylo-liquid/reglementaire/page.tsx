"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function ReglementairePage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.reglementaire")} subtitle={t("comingSoonPageSubtitle")} />;
}
