"use client";

import { useFormatter, useTranslations } from "next-intl";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { Badge, Card, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import type { DeliveryInProgressRow } from "./useDeliveriesInProgress";

/** Jamais une ligne du tableau des livraisons confirmées (`DeliveriesTable`)
 * — état volontairement distinct, recalculé en direct, jamais une donnée
 * de la base `DeliveryDetected` (voir useDeliveriesInProgress). */
export function DeliveriesInProgressSection({ rows, onRowClick }: { rows: DeliveryInProgressRow[]; onRowClick: (row: DeliveryInProgressRow) => void }) {
  const t = useTranslations("zyloLiquid.deliveries");
  const format = useFormatter();

  if (rows.length === 0) return null;

  function formatTime(iso: string): string {
    return format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Card padding="none">
      <div className="flex items-center gap-2 p-5 pb-0">
        <Badge tone="warning" dot>
          {t("inProgress.badge")}
        </Badge>
        <h2 className="text-h4 font-semibold text-text">{t("inProgress.title", { count: rows.length })}</h2>
      </div>
      <p className="px-5 pt-1 text-body-sm text-text-muted">{t("inProgress.subtitle")}</p>
      <div className="p-5">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.station")}</TableHeaderCell>
              <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("inProgress.heightBefore")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("inProgress.heightNow")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("inProgress.volumeSoFar")}</TableHeaderCell>
              <TableHeaderCell>{t("inProgress.since")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const { delivery, tank, station, fuelProduct, volumeSoFarLiters } = row;
              return (
              <TableRow key={delivery.tankId} clickable onClick={() => onRowClick(row)}>
                <TableCell>{station?.name ?? "—"}</TableCell>
                <TableCell>
                  {tank?.displayName ?? "—"} · {fuelProduct?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{format.number(delivery.startHeightMm)} mm</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-warning">{format.number(delivery.currentHeightMm)} mm</TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums text-warning">
                  {volumeSoFarLiters === null ? "—" : `+${formatLiters(volumeSoFarLiters)} L`}
                </TableCell>
                <TableCell className="text-text-muted">{formatTime(delivery.startTime)}</TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
