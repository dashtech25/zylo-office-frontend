"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, Card, FormField, Input } from "@/shared/ui";

/** Pas de flux d'inscription libre-service dans ce socle (aucune passerelle
 * de paiement/onboarding automatisé n'existe encore) — page honnête de
 * prise de contact plutôt que de simuler un essai instantané inexistant.
 * Remplace la page "Start now - it's free" d'Odoo, adaptée à ce que
 * Zylo Office sait réellement faire aujourd'hui. */
export default function FreeTrialPage() {
  const t = useTranslations("publicNav");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Aucun backend de capture de lead dans ce socle — confirmation locale
    // seulement, pour ne jamais laisser croire à un envoi qui n'a pas lieu.
    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-h1 font-bold text-text">{t("freeTrialPage.title")}</h1>
      <p className="mt-3 text-body-lg text-text-muted">{t("freeTrialPage.subtitle")}</p>

      <Card className="mt-8">
        <h2 className="text-h4 font-semibold text-text">{t("freeTrialPage.ctaTitle")}</h2>
        <p className="mt-1 text-body-sm text-text-muted">{t("freeTrialPage.ctaBody")}</p>

        {submitted ? (
          <p className="mt-4 text-body-md font-medium text-success">{t("freeTrialPage.confirmation")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <FormField label={t("freeTrialPage.emailLabel")}>
              {(field) => <Input {...field} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
            </FormField>
            <FormField label={t("freeTrialPage.companyLabel")}>
              {(field) => <Input {...field} required value={company} onChange={(e) => setCompany(e.target.value)} />}
            </FormField>
            <Button type="submit" className="mt-2 self-start">
              {t("freeTrialPage.submit")}
            </Button>
          </form>
        )}
      </Card>

      <p className="mt-6 text-body-sm text-text-muted">
        {t("freeTrialPage.alreadyClient")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("freeTrialPage.signIn")}
        </Link>
      </p>
    </div>
  );
}
