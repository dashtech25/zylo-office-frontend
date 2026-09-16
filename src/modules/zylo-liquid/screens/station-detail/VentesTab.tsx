"use client";

import { Fragment, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { cn } from "@/shared/lib/cn";
import { Alert, Card, CardSectionHeader, Input } from "@/shared/ui";
import { KpiSkeleton, Skeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";

import { CashConfidenceBadge } from "../caisse/CashConfidenceBadge";
import { CashReasonNote } from "../caisse/CashReasonNote";
import { TankCashModal } from "../caisse/TankCashModal";
import { useCashPeriod, useStationCash, type CashQuickPeriod } from "../caisse/useCashData";

const QUICK_PERIODS: CashQuickPeriod[] = ["today", "yesterday", "7d", "30d", "custom"];

/** Onglet "Ventes" au niveau station (P1-1 §4.5 de refonte-configuration /
 * P1-5 de l'audit module Stations 2026-09-16) : les ventes n'étaient
 * visibles qu'au niveau réseau jusqu'ici. Source "Baisse en cuve" —
 * explicitement décrite comme "le même principe que la caisse du jour
 * actuelle, appliqué à l'ensemble de la station" — réutilise donc telle
 * quelle l'agrégation déjà existante et déjà exposée côté backend
 * (`getStationCashDetail`, déjà utilisée ailleurs par `useStationTrends`
 * pour le graphique de la vue d'ensemble), jamais un deuxième calcul.
 * Sources "Pompe" (dépend de données de pompe non encore remontées) et
 * "Déclaration humaine" (système multi-méthodes à part entière) : hors
 * périmètre de cet onglet pour l'instant, non implémentées ici. */
export function VentesTab({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.caisse");
  const tStation = useTranslations("zyloLiquid.stationDetail.sales");
  const format = useFormatter();
  const period = useCashPeriod();
  const { data, loading, error } = useStationCash(organizationId, stationId, period.fromDate, period.toDate, period.mode);
  const [openTankId, setOpenTankId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{tStation("sourceNote")}</Alert>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-pill border border-border-subtle p-1">
          {QUICK_PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => period.setQuickPeriod(value)}
              className={cn(
                "rounded-pill px-3 py-1.5 text-body-sm font-medium transition-colors",
                period.quickPeriod === value ? "bg-primary-muted text-primary" : "text-text-muted hover:bg-surface-muted"
              )}
            >
              {t(`periods.${value}`)}
            </button>
          ))}
        </div>
        {period.quickPeriod === "today" && (
          <label className="flex items-center gap-1.5 text-caption text-text-muted">
            <input type="checkbox" checked={period.isOperationalDay} onChange={(e) => period.setIsOperationalDay(e.target.checked)} />
            {t("operationalDayToggle")}
          </label>
        )}
        {period.quickPeriod === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="datetime-local" aria-label={t("customFrom")} value={period.customFrom} onChange={(e) => period.setCustomFrom(e.target.value)} />
            <span className="text-text-muted">→</span>
            <Input type="datetime-local" aria-label={t("customTo")} value={period.customTo} onChange={(e) => period.setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      <Card>
        <CardSectionHeader title={tStation("byTankDrawdown")} />
        {loading && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <KpiSkeleton />
              <KpiSkeleton />
              <Skeleton className="h-6 w-24 rounded-pill" />
            </div>
            <table className="w-full border-collapse text-body-sm">
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={4} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        {data && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-caption text-text-muted">{t("stationModal.volumeSold")}</p>
                <p className="text-h4 font-semibold text-text">{formatLiters(data.volumeSoldLiters)} L</p>
              </div>
              <div>
                <p className="text-caption text-text-muted">{t("stationModal.monetaryValue")}</p>
                <p className="text-h4 font-semibold text-text">
                  {data.monetaryValue !== null && data.currencyCode ? formatMoney(format, data.monetaryValue, data.currencyCode) : "—"}
                </p>
                <CashReasonNote reason={data.monetaryValueNotCalculableReason} />
              </div>
              <CashConfidenceBadge confidence={data.confidence} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-caption font-semibold uppercase tracking-wide text-text-muted">
                    <th className="py-2 text-left">{t("stationModal.columns.productTank")}</th>
                    <th className="py-2 text-right">{t("stationModal.columns.volume")}</th>
                    <th className="py-2 text-right">{t("stationModal.columns.value")}</th>
                    <th className="py-2 text-left pl-4">{t("stationModal.columns.confidence")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <Fragment key={product.fuelProductId}>
                      <tr className="border-b border-border-subtle bg-surface-muted/60">
                        <td colSpan={4} className="py-2 font-semibold text-text">
                          {product.fuelProductName}
                        </td>
                      </tr>
                      {product.tanks.map((tank) => (
                        <tr
                          key={tank.tankId}
                          className="cursor-pointer border-b border-border-subtle/60 hover:bg-surface-muted"
                          onClick={() => setOpenTankId(tank.tankId)}
                        >
                          <td className="py-2 pl-4 text-text underline decoration-dotted">{tank.displayName}</td>
                          <td className="py-2 text-right tabular-nums text-text">
                            {tank.volumeSoldLiters !== null ? `${formatLiters(tank.volumeSoldLiters)} L` : "—"}
                          </td>
                          <td className="py-2 text-right tabular-nums text-text">
                            {tank.monetaryValue !== null && tank.currencyCode ? formatMoney(format, tank.monetaryValue, tank.currencyCode) : "—"}
                          </td>
                          <td className="py-2 pl-4">
                            <CashConfidenceBadge confidence={tank.confidence} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <TankCashModal
        open={openTankId !== null}
        onOpenChange={(next) => !next && setOpenTankId(null)}
        organizationId={organizationId}
        tankId={openTankId}
        fromDate={period.fromDate}
        toDate={period.toDate}
        mode={period.mode}
      />
    </div>
  );
}
