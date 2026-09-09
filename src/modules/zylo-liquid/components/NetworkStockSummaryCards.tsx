"use client";

import { ChevronRight, Circle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card } from "@/shared/ui";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatPercent } from "@/modules/zylo-liquid/utils/formatPercent";
import type { ProductFilter } from "@/modules/zylo-liquid/components/ProductBreakdownModal";

export interface NetworkStockSummaryProduct {
  fuelProductId: string;
  name: string;
  displayColor: string | null;
  volumeLiters: number;
  capacityLiters: number;
  stationCount: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  sellableVolumeLiters: number;
  sellableMonetaryValue: number | null;
}

interface NetworkStockSummaryCardsProps {
  products: NetworkStockSummaryProduct[];
  totalVolumeLiters: number;
  totalCapacityLiters: number;
  totalSellableVolumeLiters: number;
  totalMonetaryValue: number | null;
  totalSellableMonetaryValue: number | null;
  totalCurrencyCode: string | null;
  /** Retourne `null` quand la valeur ne peut pas être exprimée dans la devise
   * demandée par l'appelant (ex. sélecteur de devise du tableau des
   * stations) — distingué de `monetaryValue === null` (donnée elle-même non
   * calculable) par un libellé différent. */
  formatMoney: (value: number, currencyCode: string) => string | null;
  onProductClick?: (product: ProductFilter) => void;
  onTotalClick?: () => void;
}

/** Cartes "Synthèse stock réseau" (une par produit + une carte totale)
 * partagées entre le tableau de bord et la page Stations, pour garantir un
 * comportement et un rendu strictement identiques aux deux endroits — jamais
 * de deuxième implémentation divergente. */
export function NetworkStockSummaryCards({
  products,
  totalVolumeLiters,
  totalCapacityLiters,
  totalSellableVolumeLiters,
  totalMonetaryValue,
  totalSellableMonetaryValue,
  totalCurrencyCode,
  formatMoney,
  onProductClick,
  onTotalClick,
}: NetworkStockSummaryCardsProps) {
  const t = useTranslations("zyloLiquid");

  function formatVolume(liters: number): string {
    return `${formatLiters(liters)} L`;
  }

  function renderMoney(value: number | null, currencyCode: string | null): string {
    if (value === null || !currencyCode) return t("stockSynthesis.valueUnavailable");
    return formatMoney(value, currencyCode) ?? t("stockSynthesis.conversionUnavailable");
  }

  const totalRate = totalCapacityLiters > 0 ? (totalVolumeLiters / totalCapacityLiters) * 100 : 0;

  return (
    <section>
      <h2 className="mb-3 text-h2 font-semibold text-text">{t("stockSynthesis.title")}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          const rate = product.capacityLiters > 0 ? (product.volumeLiters / product.capacityLiters) * 100 : 0;
          return (
            <Card
              key={product.fuelProductId}
              className={onProductClick ? "cursor-pointer transition-shadow hover:shadow-elevated" : undefined}
              onClick={onProductClick ? () => onProductClick({ fuelProductId: product.fuelProductId, name: product.name }) : undefined}
            >
              <div className="flex items-center gap-2 text-body-sm font-semibold text-text-muted">
                <Circle className="size-2.5" style={{ fill: product.displayColor ?? "var(--color-text-muted)", color: product.displayColor ?? undefined }} aria-hidden />
                {product.name.toUpperCase()}
              </div>
              <p className="mt-2 text-h1 font-bold tabular-nums text-text">{formatVolume(product.volumeLiters)}</p>
              <p className="text-body-sm text-text-muted">{t("stockSynthesis.ofCapacity", { capacity: formatVolume(product.capacityLiters) })}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-muted">
                  <div className="h-full rounded-pill" style={{ width: `${Math.min(100, rate)}%`, background: product.displayColor ?? "var(--color-primary)" }} />
                </div>
                <span className="tabular-nums text-body-sm text-text-muted">{formatPercent(rate)}%</span>
              </div>
              <div className="mt-3 border-t border-border-subtle pt-3">
                <p className="text-caption text-text-muted">{t("stockSynthesis.sellableVolume")}</p>
                <p className="text-body-md font-semibold tabular-nums text-text">
                  {t("stockSynthesis.sellableOfAvailable", { sellable: formatVolume(product.sellableVolumeLiters), available: formatVolume(product.volumeLiters) })}
                </p>
              </div>
              <button
                type="button"
                className="mt-3 flex items-center gap-1 text-body-sm text-primary hover:underline"
                onClick={
                  onProductClick
                    ? (e) => {
                        e.stopPropagation();
                        onProductClick({ fuelProductId: product.fuelProductId, name: product.name });
                      }
                    : undefined
                }
                disabled={!onProductClick}
              >
                {t("stockSynthesis.stationsConcerned", { count: product.stationCount })}
                <ChevronRight className="size-4" aria-hidden />
              </button>
              <div className="mt-3 border-t border-border-subtle pt-3">
                <p className="text-caption text-text-muted">{t("stockSynthesis.stockValueTotal")}</p>
                <p className="text-body-lg font-semibold text-text">{renderMoney(product.monetaryValue, product.currencyCode)}</p>
                <p className="mt-2 text-caption text-text-muted">{t("stockSynthesis.stockValueSellable")}</p>
                <p className="text-body-lg font-semibold text-text">{renderMoney(product.sellableMonetaryValue, product.currencyCode)}</p>
              </div>
            </Card>
          );
        })}

        <Card
          className={onTotalClick ? "cursor-pointer border-secondary/20 bg-secondary text-white transition-shadow hover:shadow-elevated" : "border-secondary/20 bg-secondary text-white"}
          onClick={onTotalClick}
        >
          <p className="text-body-sm font-semibold text-white/70">{t("stockSynthesis.totalNetwork").toUpperCase()}</p>
          <p className="mt-2 text-h1 font-bold tabular-nums">{formatVolume(totalVolumeLiters)}</p>
          <p className="text-body-sm text-white/60">{t("stockSynthesis.ofCapacity", { capacity: formatVolume(totalCapacityLiters) })}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-pill bg-white/10">
              <div className="h-full rounded-pill bg-primary" style={{ width: `${Math.min(100, totalRate)}%` }} />
            </div>
            <span className="tabular-nums text-body-sm text-white/70">{formatPercent(totalRate)}%</span>
          </div>
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-caption text-white/60">{t("stockSynthesis.sellableVolume")}</p>
            <p className="text-body-md font-semibold tabular-nums">
              {t("stockSynthesis.sellableOfAvailable", { sellable: formatVolume(totalSellableVolumeLiters), available: formatVolume(totalVolumeLiters) })}
            </p>
          </div>
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-caption text-white/60">{t("stockSynthesis.stockValueTotal")}</p>
            <p className="text-body-lg font-semibold">{renderMoney(totalMonetaryValue, totalCurrencyCode)}</p>
            <p className="mt-2 text-caption text-white/60">{t("stockSynthesis.stockValueSellable")}</p>
            <p className="text-body-lg font-semibold">{renderMoney(totalSellableMonetaryValue, totalCurrencyCode)}</p>
          </div>
        </Card>
      </div>
    </section>
  );
}
