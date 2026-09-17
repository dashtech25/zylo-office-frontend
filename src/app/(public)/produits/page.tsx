"use client";

import {
  ArrowRight,
  Compass,
  Droplet,
  FileText,
  Gauge,
  ImageOff,
  ShoppingBag,
  Tags,
  Truck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/shared/ui";
import { buttonVariants } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

/** Page publique "Applications" (route `/produits`, jamais `/applications`
 * — déjà pris par la gestion interne authentifiée des modules) — structure
 * inspirée de la page Apps d'odoo.com (catalogue de modules), jamais son
 * contenu : Zylo Office n'a que deux modules réels (Zylo Liquid, Zylo
 * Tanker), donc pas de grille de tuiles façon "24 apps" mais deux sections
 * riches, une par module, chacune ancrée (`id="zylo-liquid"` /
 * `id="zylo-tanker"`) pour les liens du header/footer publics.
 *
 * Chaque fonctionnalité listée correspond à un dossier de route ou un écran
 * réellement présent dans le code (voir commentaires ci-dessous) — jamais
 * une fonctionnalité inventée. */
export default function ProduitsPage() {
  const t = useTranslations("publicApplications");

  const liquidFeatures: ModuleFeature[] = [
    { icon: Gauge, title: t("zyloLiquid.features.tanks.title"), description: t("zyloLiquid.features.tanks.description") },
    { icon: Droplet, title: t("zyloLiquid.features.alerts.title"), description: t("zyloLiquid.features.alerts.description") },
    { icon: Wallet, title: t("zyloLiquid.features.cash.title"), description: t("zyloLiquid.features.cash.description") },
    { icon: Truck, title: t("zyloLiquid.features.deliveries.title"), description: t("zyloLiquid.features.deliveries.description") },
    { icon: Tags, title: t("zyloLiquid.features.pricing.title"), description: t("zyloLiquid.features.pricing.description") },
    { icon: ShoppingBag, title: t("zyloLiquid.features.shop.title"), description: t("zyloLiquid.features.shop.description") },
  ];

  const tankerFeatures: ModuleFeature[] = [
    { icon: Compass, title: t("zyloTanker.features.supervision.title"), description: t("zyloTanker.features.supervision.description") },
    { icon: Gauge, title: t("zyloTanker.features.consumption.title"), description: t("zyloTanker.features.consumption.description") },
    { icon: Gauge, title: t("zyloTanker.features.pumps.title"), description: t("zyloTanker.features.pumps.description") },
    { icon: Droplet, title: t("zyloTanker.features.tanks.title"), description: t("zyloTanker.features.tanks.description") },
    { icon: FileText, title: t("zyloTanker.features.documents.title"), description: t("zyloTanker.features.documents.description") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Intro */}
      <div className="max-w-3xl">
        <h1 className="text-h1 font-bold text-text">{t("hero.title")}</h1>
        <p className="mt-4 text-body-lg text-text-muted">{t("hero.subtitle")}</p>
      </div>

      {/* Zylo Liquid — fondé sur src/app/zylo-liquid/{stations,cuves,alerts,fuites,
          caisse,caisse-ecarts,reconciliation,livraisons,configuration,produits,camions,
          approvisionnement,maintenance,ventes} et les écrans réels sous
          src/modules/zylo-liquid/screens/* */}
      <ModuleSection
        id="zylo-liquid"
        eyebrow={t("zyloLiquid.eyebrow")}
        title={t("zyloLiquid.title")}
        description={t("zyloLiquid.description")}
        features={liquidFeatures}
        screenshotLabel={t("zyloLiquid.screenshotLabel")}
        ctaLabel={t("zyloLiquid.cta")}
      />

      {/* Zylo Tanker — fondé sur src/app/zylo-tanker/{supervision,consommation,
          pompes,cuves,documents} et les écrans réels sous
          src/modules/zylo-tanker/screens/* */}
      <ModuleSection
        id="zylo-tanker"
        eyebrow={t("zyloTanker.eyebrow")}
        title={t("zyloTanker.title")}
        description={t("zyloTanker.description")}
        features={tankerFeatures}
        screenshotLabel={t("zyloTanker.screenshotLabel")}
        ctaLabel={t("zyloTanker.cta")}
        reverse
      />

      {/* Bande de CTA finale */}
      <Card className="mt-20 bg-primary-muted" padding="lg">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-h2 font-bold text-text">{t("closingCta.title")}</h2>
          <p className="max-w-xl text-body-md text-text-muted">{t("closingCta.subtitle")}</p>
          <Link
            href="/essai-gratuit"
            className={cn(buttonVariants({ size: "lg" }), "mt-2 gap-2")}
          >
            {t("closingCta.button")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

interface ModuleFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

function ModuleSection({
  id,
  eyebrow,
  title,
  description,
  features,
  screenshotLabel,
  ctaLabel,
  reverse = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  features: ModuleFeature[];
  screenshotLabel: string;
  ctaLabel: string;
  reverse?: boolean;
}) {
  return (
    <section id={id} className="mt-20 scroll-mt-24 border-t border-border-subtle pt-16">
      <div
        className={cn(
          "grid gap-10 lg:grid-cols-2 lg:items-start",
          reverse && "lg:[&>*:first-child]:order-2"
        )}
      >
        <div>
          <p className="text-caption font-bold uppercase tracking-wide text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-h2 font-bold text-text">{title}</h2>
          <p className="mt-3 text-body-md text-text-muted">{description}</p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title: featureTitle, description: featureDescription }) => (
              <li key={featureTitle} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-primary-muted text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-body-md font-semibold text-text">{featureTitle}</p>
                  <p className="mt-0.5 text-body-sm text-text-muted">{featureDescription}</p>
                </div>
              </li>
            ))}
          </ul>

          <Link href="/essai-gratuit" className={cn(buttonVariants(), "mt-8 gap-2")}>
            {ctaLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {/* Emplacement de capture d'écran — jamais une image factice tant que
            l'écran réel n'a pas été capturé. */}
        <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface-muted text-text-muted">
          <ImageOff className="size-8" aria-hidden />
          <p className="text-body-sm font-medium">{screenshotLabel}</p>
        </div>
      </div>
    </section>
  );
}
