"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "@/modules/zylo-liquid/components/ComingSoonPage";

export default function ApprovisionnementPage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.approvisionnement")} subtitle={t("comingSoonPageSubtitle")} />;
}
