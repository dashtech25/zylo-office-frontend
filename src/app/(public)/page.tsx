"use client";

import {
  AlertTriangle,
  ArrowRight,
  Coins,
  Droplets,
  Globe2,
  ImageIcon,
  Layers,
  Radar,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Card } from "@/shared/ui";
import { buttonVariants } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

/** Page d'accueil publique ("/") de Zylo Office — structure inspirée du
 * rythme visuel d'odoo.com (hero / vitrine des apps / proposition de valeur
 * / captures / positionnement / bande CTA finale), mais avec un contenu
 * strictement honnête sur ce que ce socle sait faire aujourd'hui : deux
 * applications réelles (Zylo Liquid, Zylo Tanker), aucune capture d'écran
 * ni témoignage/chiffre inventés — remplacés par des placeholders explicites
 * et un paragraphe "pourquoi Zylo Office" non chiffré. Tout le texte passe
 * par le namespace `publicHome` (fr/en), jamais de chaîne en dur ici. */
export default function PublicHomePage() {
  const t = useTranslations("publicHome");

  const positioningItems: { key: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "africa", icon: Globe2 },
    { key: "twoBusinesses", icon: Layers },
    { key: "realtime", icon: Radar },
    { key: "alerts", icon: AlertTriangle },
  ];

  const screenshotItems: { key: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "network", icon: Globe2 },
    { key: "tank", icon: Droplets },
    { key: "cash", icon: Coins },
  ];

  return (
    <div>
      {/* 1. Hero */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">{t("hero.title")}</h1>
            <p className="mt-5 text-body-lg text-text-muted">{t("hero.subtitle")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/essai-gratuit" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                {t("hero.primaryCta")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                {t("hero.secondaryCta")}
              </Link>
            </div>
          </div>

          <div className="flex aspect-video items-center justify-center rounded-card border border-dashed border-border bg-surface-muted">
            <div className="flex flex-col items-center gap-2 px-6 text-center">
              <ImageIcon className="size-8 text-text-disabled" aria-hidden />
              <p className="text-body-sm font-medium text-text-muted">{t("hero.visualPlaceholder")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Vitrine des applications */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-text">{t("appShowcase.title")}</h2>
            <p className="mt-2 max-w-2xl text-body-md text-text-muted">{t("appShowcase.subtitle")}</p>
          </div>
          <Link
            href="/produits"
            className="inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
          >
            {t("appShowcase.viewAll")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Card className="flex flex-col">
            <div className="flex size-11 items-center justify-center rounded-[10px] bg-primary-muted text-primary">
              <Droplets className="size-6" aria-hidden />
            </div>
            <h3 className="mt-4 text-h4 font-semibold text-text">{t("appShowcase.zyloLiquid.name")}</h3>
            <p className="mt-1 text-body-sm font-medium text-text-muted">{t("appShowcase.zyloLiquid.tagline")}</p>
            <p className="mt-3 flex-1 text-body-md text-text-muted">{t("appShowcase.zyloLiquid.description")}</p>
            <Link
              href="/produits#zylo-liquid"
              className="mt-5 inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
            >
              {t("appShowcase.zyloLiquid.cta")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Card>

          <Card className="flex flex-col">
            <div className="flex size-11 items-center justify-center rounded-[10px] bg-primary-muted text-primary">
              <Truck className="size-6" aria-hidden />
            </div>
            <h3 className="mt-4 text-h4 font-semibold text-text">{t("appShowcase.zyloTanker.name")}</h3>
            <p className="mt-1 text-body-sm font-medium text-text-muted">{t("appShowcase.zyloTanker.tagline")}</p>
            <p className="mt-3 flex-1 text-body-md text-text-muted">{t("appShowcase.zyloTanker.description")}</p>
            <Link
              href="/produits#zylo-tanker"
              className="mt-5 inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
            >
              {t("appShowcase.zyloTanker.cta")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Card>
        </div>
      </section>

      {/* 3. Proposition de valeur */}
      <section className="bg-surface-muted py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold text-text">{t("valueProp.title")}</h2>
              <p className="mt-4 text-body-lg text-text-muted">{t("valueProp.body")}</p>
            </div>
            <Card variant="outline" className="self-start bg-surface">
              <h3 className="text-h4 font-semibold text-text">{t("valueProp.why.title")}</h3>
              <p className="mt-2 text-body-md text-text-muted">{t("valueProp.why.body")}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Captures d'écran (placeholders) */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-text">{t("screenshots.title")}</h2>
        <p className="mt-2 max-w-2xl text-body-md text-text-muted">{t("screenshots.subtitle")}</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {screenshotItems.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface-muted p-4 text-center"
            >
              <Icon className="size-7 text-text-disabled" aria-hidden />
              <p className="text-body-sm text-text-muted">{t(`screenshots.items.${key}.caption`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Positionnement / différenciation */}
      <section className="bg-surface-muted py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-text">{t("positioning.title")}</h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {positioningItems.map(({ key, icon: Icon }) => (
              <Card key={key} className="bg-surface">
                <div className="flex size-10 items-center justify-center rounded-[10px] bg-primary-muted text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-h4 font-semibold text-text">{t(`positioning.items.${key}.title`)}</h3>
                <p className="mt-2 text-body-sm text-text-muted">{t(`positioning.items.${key}.body`)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Bande CTA finale */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-card bg-secondary px-6 py-12 text-center sm:px-12">
          <h2 className="text-3xl font-bold text-white">{t("finalCta.title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-body-lg text-white/80">{t("finalCta.subtitle")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/essai-gratuit" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
              {t("finalCta.primaryCta")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-white/40 text-white hover:bg-white/10"
              )}
            >
              {t("finalCta.secondaryCta")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
