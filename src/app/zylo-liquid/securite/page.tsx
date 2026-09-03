"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function SecuritePage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.securite")} subtitle={t("comingSoonPageSubtitle")} />;
}
