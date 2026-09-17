"use client";

import { ArrowRight, Check, Minus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge, Card, CardContent } from "@/shared/ui";
import { buttonVariants } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

/** Page publique "Tarification" (route `/tarification`) — structure
 * inspirée de la page pricing d'odoo.com (cartes de formules, tableau
 * comparatif, FAQ), jamais son contenu ni ses prix : Zylo Office n'a
 * aujourd'hui aucun catalogue de prix publié. Le backend expose bien un
 * modèle de facturation (`Plan`/`Subscription`/`Invoice`, voir
 * `app/billing/models.py`) mais aucune ligne de `Plan` n'y est encore
 * semée et aucun prestataire de paiement réel n'est intégré — afficher un
 * chiffre ici serait donc une donnée inventée présentée comme réelle.
 * Chaque carte affiche donc "Sur devis" plutôt qu'un montant, jamais un
 * FCFA ou un "$X/mois" fabriqué.
 *
 * Les fonctionnalités listées par formule reflètent les modules réels :
 * Zylo Liquid (cuves, caisse, tarifs, réseau — voir
 * `src/modules/zylo-liquid/hooks/useNetworkDashboard.ts` et
 * `src/modules/zylo-liquid/screens/tanks-network/`) et Zylo Tanker (flotte,
 * consommation, documents — voir `src/modules/zylo-tanker/screens/`).
 * L'activation par organisation/module est réelle (voir
 * `src/app/(app)/applications/page.tsx`), jamais un flux d'achat
 * en libre-service qui n'existe pas dans ce socle. */

type TierId = "station" | "network" | "fleet";

const TIER_IDS: readonly TierId[] = ["station", "network", "fleet"];

type ComparisonRowKey =
  | "tankMonitoring"
  | "cashManagement"
  | "pricingGrid"
  | "alerts"
  | "networkDashboard"
  | "networkPricing"
  | "fleetTracking"
  | "fleetDocuments"
  | "combinedSupervision";

const COMPARISON_ROW_KEYS: readonly ComparisonRowKey[] = [
  "tankMonitoring",
  "cashManagement",
  "pricingGrid",
  "alerts",
  "networkDashboard",
  "networkPricing",
  "fleetTracking",
  "fleetDocuments",
  "combinedSupervision",
];

/** Matrice fonctionnalité -> formule, dérivée des fonctionnalités listées
 * par carte (jamais de chiffre de prix ici). */
const COMPARISON_MATRIX: Record<ComparisonRowKey, Record<TierId, boolean>> = {
  tankMonitoring: { station: true, network: true, fleet: true },
  cashManagement: { station: true, network: true, fleet: true },
  pricingGrid: { station: true, network: true, fleet: true },
  alerts: { station: true, network: true, fleet: true },
  networkDashboard: { station: false, network: true, fleet: true },
  networkPricing: { station: false, network: true, fleet: true },
  fleetTracking: { station: false, network: false, fleet: true },
  fleetDocuments: { station: false, network: false, fleet: true },
  combinedSupervision: { station: false, network: false, fleet: true },
};

export default function TarificationPage() {
  const t = useTranslations("publicPricing");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Intro */}
      <div className="max-w-3xl">
        <h1 className="text-h1 font-bold text-text">{t("hero.title")}</h1>
        <p className="mt-4 text-body-lg text-text-muted">{t("hero.subtitle")}</p>
      </div>

      {/* Cartes de formules */}
      <section className="mt-16">
        <h2 className="text-h2 font-bold text-text">{t("tiers.sectionTitle")}</h2>
        <p className="mt-2 max-w-2xl text-body-md text-text-muted">{t("tiers.sectionSubtitle")}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {TIER_IDS.map((tierId) => (
            <Card
              key={tierId}
              variant={tierId === "network" ? "default" : "outline"}
              padding="lg"
              className={cn("flex flex-col", tierId === "network" && "ring-1 ring-primary")}
            >
              <CardContent className="flex flex-1 flex-col">
                {tierId === "network" && (
                  <Badge tone="primary" className="mb-3 self-start">
                    {t("tiers.sectionTitle")}
                  </Badge>
                )}
                <h3 className="text-h4 font-semibold text-text">{t(`tiers.${tierId}.name`)}</h3>
                <p className="mt-2 text-body-sm text-text-muted">{t(`tiers.${tierId}.description`)}</p>

                <div className="mt-6">
                  <p className="text-h3 font-bold text-text">{t("tiers.priceLabel")}</p>
                  <p className="mt-1 text-caption text-text-muted">{t("tiers.priceNote")}</p>
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {t.raw(`tiers.${tierId}.features`).map((feature: string) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span className="text-body-sm text-text">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/essai-gratuit"
                  className={cn(
                    buttonVariants({ variant: tierId === "network" ? "primary" : "outline" }),
                    "mt-8"
                  )}
                >
                  {t("tiers.cta")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tableau comparatif */}
      <section className="mt-20 border-t border-border-subtle pt-16">
        <h2 className="text-h2 font-bold text-text">{t("comparison.title")}</h2>
        <p className="mt-2 max-w-2xl text-body-md text-text-muted">{t("comparison.subtitle")}</p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="py-3 pr-4 text-body-sm font-semibold text-text">
                  {t("comparison.featureColumn")}
                </th>
                {TIER_IDS.map((tierId) => (
                  <th key={tierId} className="px-4 py-3 text-center text-body-sm font-semibold text-text">
                    {t(`tiers.${tierId}.name`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROW_KEYS.map((rowKey) => (
                <tr key={rowKey} className="border-b border-border-subtle">
                  <td className="py-3 pr-4 text-body-sm text-text">{t(`comparison.rows.${rowKey}`)}</td>
                  {TIER_IDS.map((tierId) => (
                    <td key={tierId} className="px-4 py-3 text-center">
                      {COMPARISON_MATRIX[rowKey][tierId] ? (
                        <Check className="mx-auto size-4 text-primary" aria-hidden />
                      ) : (
                        <Minus className="mx-auto size-4 text-text-muted" aria-hidden />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-20 border-t border-border-subtle pt-16">
        <h2 className="text-h2 font-bold text-text">{t("faq.title")}</h2>

        <div className="mt-8 flex flex-col divide-y divide-border-subtle">
          {(
            [
              "whyNoPrice",
              "howQuoteWorks",
              "canChangeLater",
              "selfService",
              "whichModules",
            ] as const
          ).map((itemKey) => (
            <div key={itemKey} className="py-5">
              <h3 className="text-body-lg font-semibold text-text">{t(`faq.items.${itemKey}.question`)}</h3>
              <p className="mt-2 text-body-md text-text-muted">{t(`faq.items.${itemKey}.answer`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bande de CTA finale */}
      <Card className="mt-20 bg-primary-muted" padding="lg">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-h2 font-bold text-text">{t("closing.title")}</h2>
          <p className="max-w-xl text-body-md text-text-muted">{t("closing.subtitle")}</p>
          <Link
            href="/essai-gratuit"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-2")}
          >
            {t("closing.cta")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
