"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, EmptyState, buttonVariants } from "@/shared/ui";

/** Communauté — adaptation honnête de la page "Community" d'odoo.com :
 * Odoo s'appuie sur >100k développeurs open source et un forum public ;
 * rien de tout cela n'existe pour Zylo Office (produit propriétaire,
 * jeune, petite équipe). On garde uniquement l'idée de structure (intro +
 * blocs de mise en relation) sans jamais inventer une communauté, un
 * forum ou des statistiques qui n'existent pas. */
export default function CommunityPage() {
  const t = useTranslations("publicCommunity");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-h1 font-bold text-text">{t("hero.title")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-body-lg text-text-muted">{t("hero.subtitle")}</p>
      </div>

      <div className="mt-12 flex flex-col gap-6">
        <Card variant="outline" padding="lg">
          <h2 className="text-h4 font-semibold text-text">{t("feedback.title")}</h2>
          <p className="mt-2 text-body-md text-text-muted">{t("feedback.body")}</p>
          <Link href="/essai-gratuit" className={buttonVariants({ variant: "primary", className: "mt-4" })}>
            {t("feedback.cta")}
          </Link>
        </Card>

        <EmptyState
          icon={Users}
          title={t("updates.title")}
          description={t("updates.description")}
        />

        <Card variant="outline" padding="lg">
          <h2 className="text-h4 font-semibold text-text">{t("partner.title")}</h2>
          <p className="mt-2 text-body-md text-text-muted">{t("partner.body")}</p>
          <Link href="/essai-gratuit" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
            {t("partner.cta")}
          </Link>
        </Card>
      </div>
    </div>
  );
}
