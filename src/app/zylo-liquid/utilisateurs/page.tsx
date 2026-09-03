"use client";

import { useTranslations } from "next-intl";

import { ComingSoonPage } from "../_components/ComingSoonPage";

export default function UtilisateursPage() {
  const t = useTranslations("zyloLiquid");
  return <ComingSoonPage title={t("nav.items.utilisateurs")} subtitle={t("comingSoonPageSubtitle")} />;
}
