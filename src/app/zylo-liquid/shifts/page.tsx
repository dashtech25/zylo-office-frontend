"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function ShiftsPage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.shifts")} subtitle={t("comingSoonPageSubtitle")} />;
}
