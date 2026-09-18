"use client";

import { useFormatter, useTranslations } from "next-intl";

import type { City } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { Card } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

import { CashConfidenceBadge } from "./CashConfidenceBadge";
import { CashReasonNote } from "./CashReasonNote";
import type { CaisseStationRow } from "./useCaisseStationRows";

function formatVolume(liters: number): string {
  return `${formatLiters(liters)} L`;
}

/** Tableau "Ventes du jour par station" — même esprit que le tableau de la
 * page Stations (une ligne par station, en-tête fixe), mais montrant les
 * ventes déjà calculées plutôt que le stock. Clic sur une ligne pour ouvrir
 * l'aperçu cartes de cette station (StationCashCardsModal). */
export function CaisseStationsTable({ rows, cityById, onRowClick }: { rows: CaisseStationRow[]; cityById: Map<string, City>; onRowClick: (row: CaisseStationRow) => void }) {
  const t = useTranslations("zyloLiquid.caisse.stationsTable");
  const format = useFormatter();

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-nowrap items-start bg-surface-muted px-4 py-2.5 text-caption font-semibold uppercase tracking-wide text-text-muted">
        <div className="w-[22%]">{t("columns.station")}</div>
        <div className="w-[13%]">{t("columns.confidence")}</div>
        <div className="w-[48%]">{t("columns.salesByProduct")}</div>
        <div className="w-[17%] text-right">{t("columns.estimatedValue")}</div>
      </div>

      {rows.map((row, index) => {
        const city = row.station.cityId ? (cityById.get(row.station.cityId) ?? null) : null;
        return (
          <div
            key={row.station.id}
            className={cn(
              "flex min-h-[88px] cursor-pointer items-center px-4 py-3 transition-colors hover:bg-surface-muted/40",
              index !== rows.length - 1 && "border-b border-border-subtle"
            )}
            onClick={() => onRowClick(row)}
          >
            <div className="w-[22%] pr-2">
              <p className="font-semibold text-text">{row.station.name}</p>
              {city && <p className="text-caption text-text-muted">{city.name}</p>}
            </div>

            <div className="w-[13%] pr-2">
              <CashConfidenceBadge confidence={row.confidence} />
            </div>

            <div className="flex w-[48%] flex-wrap items-start gap-4 pr-2">
              {row.products.length === 0 ? (
                <span className="text-caption text-text-muted">—</span>
              ) : (
                row.products.map((product) => (
                  <div key={product.fuelProductId} className="text-body-sm">
                    <div className="flex items-center gap-1.5 font-semibold text-text">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: product.displayColor ?? "var(--color-text-muted)" }} />
                      {product.fuelProductName}
                    </div>
                    {product.monetaryValue !== null && product.currencyCode ? (
                      <p className="tabular-nums font-semibold text-text">{formatMoney(format, product.monetaryValue, product.currencyCode)}</p>
                    ) : (
                      <CashReasonNote reason={product.monetaryValueNotCalculableReason} />
                    )}
                    <p className="tabular-nums text-caption text-text-muted">{formatVolume(product.volumeSoldLiters)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="w-[17%] text-right">
              {row.monetaryValue !== null && row.currencyCode ? (
                <p className="font-mono font-semibold tabular-nums text-text">{formatMoney(format, row.monetaryValue, row.currencyCode)}</p>
              ) : (
                <CashReasonNote reason={row.monetaryValueNotCalculableReason} />
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
