"use client";

import { useFormatter, useTranslations } from "next-intl";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import type { DeliveryRow } from "./useDeliveriesList";

/** Tableau de livraisons, factorisé une seule fois et réutilisé par la vue
 * "Toutes" et par chaque groupe de la vue "Par station" — jamais deux
 * définitions de colonnes différentes pour la même donnée. */
export function DeliveriesTable({ rows, onRowClick }: { rows: DeliveryRow[]; onRowClick: (row: DeliveryRow) => void }) {
  const t = useTranslations("zyloLiquid.deliveries");
  const format = useFormatter();

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{t("table.date")}</TableHeaderCell>
          <TableHeaderCell>{t("table.station")}</TableHeaderCell>
          <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t("table.heightBefore")}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t("table.heightAfter")}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t("table.received")}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t("table.value")}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const { delivery, tank, station, fuelProduct, valueAmount, currencyCode } = row;
          return (
            <TableRow key={delivery.id} clickable onClick={() => onRowClick(row)}>
              <TableCell className="font-mono tabular-nums">{formatDateTime(delivery.endTime)}</TableCell>
              <TableCell>{station?.name ?? "—"}</TableCell>
              <TableCell>
                {tank?.displayName ?? "—"} · {fuelProduct?.name ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{format.number(delivery.startHeightMm)} mm</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{format.number(delivery.endHeightMm)} mm</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{delivery.volumeLiters === null ? "—" : `${formatLiters(delivery.volumeLiters)} L`}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {valueAmount !== null && currencyCode ? formatMoney(format, valueAmount, currencyCode) : <span className="italic text-text-muted">—</span>}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
