"use client";

import { Fragment, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import type { CashMode } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { Alert, Button, Modal } from "@/shared/ui";
import { KpiSkeleton, Skeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";

import { CashConfidenceBadge } from "./CashConfidenceBadge";
import { CashReasonNote } from "./CashReasonNote";
import { TankCashModal } from "./TankCashModal";
import { useStationCash } from "./useCashData";

/** Répartition produit -> cuve d'une station (page_caisse.md §18/§19) —
 * clic sur une cuve pour ouvrir la traçabilité complète (TankCashModal,
 * dernier niveau du drill-down). */
export function StationCashModal({
  open,
  onOpenChange,
  organizationId,
  stationId,
  fromDate,
  toDate,
  mode = "calendar",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  stationId: string | null;
  fromDate: string;
  toDate: string;
  mode?: CashMode;
}) {
  const t = useTranslations("zyloLiquid.caisse.stationModal");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { data, loading, error } = useStationCash(organizationId, stationId, fromDate, toDate, mode);
  const [openTankId, setOpenTankId] = useState<string | null>(null);

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={data ? t("title", { station: data.stationName }) : t("titleLoading")}
        closeLabel={tCommon("actions.close")}
        size="xl"
        footer={
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {tCommon("actions.close")}
          </Button>
        }
      >
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
                <p className="text-caption text-text-muted">{t("volumeSold")}</p>
                <p className="text-h4 font-semibold text-text">{formatLiters(data.volumeSoldLiters)} L</p>
              </div>
              <div>
                <p className="text-caption text-text-muted">{t("monetaryValue")}</p>
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
                    <th className="py-2 text-left">{t("columns.productTank")}</th>
                    <th className="py-2 text-right">{t("columns.volume")}</th>
                    <th className="py-2 text-right">{t("columns.value")}</th>
                    <th className="py-2 text-left pl-4">{t("columns.confidence")}</th>
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
      </Modal>

      <TankCashModal
        open={openTankId !== null}
        onOpenChange={(next) => !next && setOpenTankId(null)}
        organizationId={organizationId}
        tankId={openTankId}
        fromDate={fromDate}
        toDate={toDate}
        mode={mode}
      />
    </>
  );
}
