"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function CreditPage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.credit")} subtitle={t("comingSoonPageSubtitle")} />;
}
