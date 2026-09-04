"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "@/modules/zylo-liquid/components/ComingSoonPage";

export default function MaintenancePage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.maintenance")} subtitle={t("comingSoonPageSubtitle")} />;
}
