"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function VentesPage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.ventes")} subtitle={t("comingSoonPageSubtitle")} />;
}
