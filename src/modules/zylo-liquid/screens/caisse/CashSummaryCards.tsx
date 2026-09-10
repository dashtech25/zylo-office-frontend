"use client";

import { Circle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { CurrencyCashBlock, NetworkProductCashLine } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { Card } from "@/shared/ui";

import { CashConfidenceBadge } from "./CashConfidenceBadge";
import { CashReasonNote } from "./CashReasonNote";

function formatVolume(liters: number): string {
  return `${formatLiters(liters)} L`;
}

/** Cartes "Ventes du jour" (refonte de la page Caisse, inspirée des cartes
 * de synthèse stock déjà en place sur le dashboard/la page Stations) : une
 * carte par produit vendu sur le réseau, plus une carte "TOTAL RÉSEAU" par
 * devise réellement présente (jamais une somme entre devises différentes —
 * même garde que partout ailleurs dans Zylo Liquid). Clic sur une carte
 * totale pour ouvrir le drill-down existant (NetworkCashModal), jusqu'à la
 * mesure de cuve ayant servi au calcul. */
export function CashSummaryCards({
  productBlocks,
  currencyBlocks,
  onProductClick,
  onTotalClick,
  hideStationsConcerned = false,
  totalCardLabel,
}: {
  productBlocks: NetworkProductCashLine[];
  currencyBlocks: CurrencyCashBlock[];
  onProductClick: (block: NetworkProductCashLine) => void;
  onTotalClick: (block: CurrencyCashBlock) => void;
  /** Masque "X station(s) concernée(s)" — sans objet quand ces cartes sont
   * réutilisées pour le drill-down d'une seule station (toujours 1). */
  hideStationsConcerned?: boolean;
  /** Libellé de la carte totale déjà résolu par l'appelant, à la place de
   * "TOTAL RÉSEAU (devise)" par défaut — ex. "TOTAL STATION" quand ces
   * mêmes cartes servent au drill-down d'une station unique. */
  totalCardLabel?: (currencyCode: string) => string;
}) {
  const t = useTranslations("zyloLiquid.caisse.productCards");
  const format = useFormatter();

  if (productBlocks.length === 0 && currencyBlocks.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-h2 font-semibold text-text">{t("title")}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {productBlocks.map((product) => (
          <Card
            key={product.fuelProductId}
            className="cursor-pointer transition-shadow hover:shadow-elevated"
            onClick={() => onProductClick(product)}
          >
            <div className="flex items-center gap-2 text-body-sm font-semibold text-text-muted">
              <Circle className="size-2.5" style={{ fill: product.displayColor ?? "var(--color-text-muted)", color: product.displayColor ?? undefined }} aria-hidden />
              {product.fuelProductName.toUpperCase()}
            </div>
            <p className="mt-2 text-h1 font-bold tabular-nums text-text">{formatVolume(product.volumeSoldLiters)}</p>
            {!hideStationsConcerned && <p className="text-body-sm text-text-muted">{t("stationsConcerned", { count: product.stationCount })}</p>}

            <div className="mt-3 border-t border-border-subtle pt-3">
              <CashConfidenceBadge confidence={product.confidence} />
            </div>

            <div className="mt-3 border-t border-border-subtle pt-3">
              <p className="text-caption text-text-muted">{t("estimatedValue")}</p>
              {product.monetaryValue !== null && product.currencyCode ? (
                <p className="text-body-lg font-semibold text-text">{formatMoney(format, product.monetaryValue, product.currencyCode)}</p>
              ) : (
                <CashReasonNote reason={product.monetaryValueNotCalculableReason} />
              )}
            </div>
          </Card>
        ))}

        {currencyBlocks.map((block) => (
          <Card
            key={block.currencyCode}
            className="cursor-pointer border-secondary/20 bg-secondary text-white transition-shadow hover:shadow-elevated"
            onClick={() => onTotalClick(block)}
          >
            <p className="text-body-sm font-semibold text-white/70">
              {(totalCardLabel ? totalCardLabel(block.currencyCode) : t("totalNetwork", { currency: block.currencyCode })).toUpperCase()}
            </p>
            <p className="mt-2 text-h1 font-bold tabular-nums">{formatVolume(block.volumeSoldLiters)}</p>
            {!hideStationsConcerned && <p className="text-body-sm text-white/60">{t("stationsConcerned", { count: block.stationCount })}</p>}

            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-caption text-white/60">{t("estimatedValue")}</p>
              <p className="text-body-lg font-semibold">{formatMoney(format, block.monetaryValue, block.currencyCode)}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
