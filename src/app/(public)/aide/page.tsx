"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Card, buttonVariants } from "@/shared/ui";

/** Centre d'aide — adaptation honnête de la page "Help" d'odoo.com : la
 * structure (intro + FAQ + contact) est reprise, mais le contenu reflète
 * ce que Zylo Office est réellement aujourd'hui (produit jeune, petite
 * équipe, pas de base de connaissances géante ni de support 24/7). */
export default function HelpPage() {
  const t = useTranslations("publicHelp");

  const faqKeys = ["start", "modules", "contact", "security", "pricing", "multiUser"] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-h1 font-bold text-text">{t("hero.title")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-body-lg text-text-muted">{t("hero.subtitle")}</p>
      </div>

      <section className="mt-12">
        <h2 className="text-h3 font-semibold text-text">{t("faq.title")}</h2>
        <div className="mt-6 flex flex-col gap-4">
          {faqKeys.map((key) => (
            <Card key={key} variant="outline">
              <h3 className="text-h4 font-semibold text-text">{t(`faq.items.${key}.question`)}</h3>
              <p className="mt-2 text-body-md text-text-muted">{t(`faq.items.${key}.answer`)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="contact" className="mt-16">
        <Card variant="flat" padding="lg" className="text-center">
          <h2 className="text-h3 font-semibold text-text">{t("contact.title")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-body-md text-text-muted">{t("contact.body")}</p>
          <Link href="/essai-gratuit" className={buttonVariants({ variant: "primary", size: "lg", className: "mt-6" })}>
            {t("contact.cta")}
          </Link>
        </Card>
      </section>
    </div>
  );
}
