"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function AuditPage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.audit")} subtitle={t("comingSoonPageSubtitle")} />;
}
