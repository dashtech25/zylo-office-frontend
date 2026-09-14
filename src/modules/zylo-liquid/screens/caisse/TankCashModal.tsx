"use client";

import { useFormatter, useTranslations } from "next-intl";

import type { CashMode } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { Alert, Badge, Button, Modal, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { KpiSkeleton, Skeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";

import { CashConfidenceBadge } from "./CashConfidenceBadge";
import { CashReasonNote } from "./CashReasonNote";
import { useTankCash } from "./useCashData";

const SEGMENT_TONE: Record<string, "success" | "info" | "warning" | "neutral" | "error"> = {
  sale: "success",
  delivery: "info",
  stable: "neutral",
  anomaly_unexplained_rise: "error",
  anomaly_extreme_variation: "error",
  insufficient_data: "warning",
};

/** Traçabilité du calcul (page_caisse.md §20) : dernier niveau du
 * drill-down, celui qui répond à « pourquoi ce chiffre vaut-il X ? » en
 * montrant chaque segment mesure→mesure ayant contribué (ou non) à la
 * caisse de cette cuve. */
export function TankCashModal({
  open,
  onOpenChange,
  organizationId,
  tankId,
  fromDate,
  toDate,
  mode = "calendar",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  tankId: string | null;
  fromDate: string;
  toDate: string;
  mode?: CashMode;
}) {
  const t = useTranslations("zyloLiquid.caisse.tankModal");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { data, loading, error } = useTankCash(organizationId, tankId, fromDate, toDate, mode);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={data ? t("title", { tank: data.displayName, product: data.fuelProductName }) : t("titleLoading")}
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
          <Table>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={6} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {data && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-caption text-text-muted">{t("volumeSold")}</p>
              <p className="text-h4 font-semibold text-text">
                {data.volumeSoldLiters !== null ? `${formatLiters(data.volumeSoldLiters)} L` : "—"}
              </p>
              <CashReasonNote reason={data.volumeNotCalculableReason} />
            </div>
            <div>
              <p className="text-caption text-text-muted">{t("monetaryValue")}</p>
              <p className="text-h4 font-semibold text-text">
                {data.monetaryValue !== null && data.currencyCode ? formatMoney(format, data.monetaryValue, data.currencyCode) : "—"}
              </p>
              <CashReasonNote reason={data.monetaryValueNotCalculableReason} />
            </div>
            <CashConfidenceBadge confidence={data.confidence} />
            {data.anomalyTypes.map((anomaly) => (
              <Badge key={anomaly} tone="error">
                {t(`anomalyTypes.${anomaly}`)}
              </Badge>
            ))}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("columns.period")}</TableHeaderCell>
                  <TableHeaderCell>{t("columns.type")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("columns.heightStart")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("columns.heightEnd")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("columns.volume")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("columns.value")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.segments.map((segment, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {format.dateTime(new Date(segment.startTime), { hour: "2-digit", minute: "2-digit" })}
                      {" → "}
                      {format.dateTime(new Date(segment.endTime), { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <Badge tone={SEGMENT_TONE[segment.type] ?? "neutral"}>{t(`segmentTypes.${segment.type}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {segment.startHeightMm !== null ? `${formatLiters(segment.startHeightMm)} mm` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {segment.endHeightMm !== null ? `${formatLiters(segment.endHeightMm)} mm` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {segment.type === "sale" ? `${formatLiters(segment.volumeLiters)} L` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {segment.monetaryValue !== null && segment.currencyCode
                        ? formatMoney(format, segment.monetaryValue, segment.currencyCode)
                        : segment.monetaryValueNotCalculableReason
                          ? <CashReasonNote reason={segment.monetaryValueNotCalculableReason} />
                          : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </Modal>
  );
}
