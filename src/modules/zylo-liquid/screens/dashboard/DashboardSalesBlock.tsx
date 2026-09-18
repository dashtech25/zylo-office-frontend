"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import type { CurrencyCashBlock, NetworkProductCashLine } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { Card, EmptyState } from "@/shared/ui";
import { ListSkeleton } from "@/shared/ui/Skeleton";

import { CashSummaryCards } from "@/modules/zylo-liquid/screens/caisse/CashSummaryCards";

function formatVolume(liters: number): string {
  return `${formatLiters(liters)} L`;
}

/** Bloc "Ventes" de la rangée 2 du tableau de bord — 3 niveaux de lecture
 * progressive (demande explicite de l'utilisateur, validée en discussion) :
 *
 * 1. Carte(s) "Total" compactes, toujours visibles dès que le bloc parent
 *    (CollapsibleSection) est ouvert — volume ET chiffre d'affaires écrits
 *    directement sur la carte, jamais cachés derrière un clic.
 * 2. Clic sur une carte Total -> déplie en place la grille complète par
 *    produit (réutilise `CashSummaryCards` tel quel, déjà utilisé sur la
 *    page Caisse — jamais une deuxième implémentation).
 * 3. Clic sur une carte produit (ou re-clic sur le Total une fois déplié)
 *    -> ouvre le drill-down complet déjà existant, géré par l'appelant via
 *    `onProductClick`/`onTotalClick` (même callbacks que `CashSummaryCards`).
 *
 * Aucune agrégation propre à ce composant : `productBlocks`/`currencyBlocks`
 * viennent du même pipeline que la page Caisse (`aggregateCaisseProducts`/
 * `aggregateCaisseCurrencyBlocks`), calculé par l'appelant. */
export function DashboardSalesBlock({
  loading,
  productBlocks,
  currencyBlocks,
  onProductClick,
  onTotalClick,
}: {
  loading: boolean;
  productBlocks: NetworkProductCashLine[];
  currencyBlocks: CurrencyCashBlock[];
  onProductClick: (block: NetworkProductCashLine) => void;
  onTotalClick: (block: CurrencyCashBlock) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const format = useFormatter();
  const t = useTranslations("zyloLiquid.dashboardSections");

  if (loading) {
    return <ListSkeleton rows={2} />;
  }

  if (currencyBlocks.length === 0) {
    return <EmptyState title={t("salesEmpty")} />;
  }

  if (!expanded) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {currencyBlocks.map((block) => (
          <Card
            key={block.currencyCode}
            className="cursor-pointer border-secondary/20 bg-secondary text-white transition-shadow hover:shadow-elevated"
            onClick={() => setExpanded(true)}
          >
            <p className="text-body-sm font-semibold text-white/70">TOTAL RÉSEAU ({block.currencyCode})</p>
            <p className="mt-2 text-h1 font-bold tabular-nums">{formatMoney(format, block.monetaryValue, block.currencyCode)}</p>
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-caption text-white/60">Volume vendu</p>
              <p className="text-body-lg font-semibold">{formatVolume(block.volumeSoldLiters)}</p>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="self-start text-body-sm font-medium text-primary hover:underline"
      >
        {t("salesCollapse")}
      </button>
      <CashSummaryCards
        productBlocks={productBlocks}
        currencyBlocks={currencyBlocks}
        onProductClick={onProductClick}
        onTotalClick={onTotalClick}
      />
    </div>
  );
}
