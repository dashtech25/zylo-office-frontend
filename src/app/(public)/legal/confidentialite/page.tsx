"use client";

import { useTranslations } from "next-intl";

/** Placeholder honnête — aucun texte juridique n'a été rédigé/validé pour
 * ce socle, jamais un faux texte légal généré pour combler la page. */
export default function PrivacyPage() {
  const t = useTranslations("publicNav");
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-h1 font-bold text-text">{t("legalPlaceholder.privacyTitle")}</h1>
      <p className="mt-4 text-body-md text-text-muted">{t("legalPlaceholder.body")}</p>
    </div>
  );
}
