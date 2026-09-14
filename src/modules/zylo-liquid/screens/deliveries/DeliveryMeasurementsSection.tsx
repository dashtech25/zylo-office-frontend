"use client";

import { useFormatter, useTranslations } from "next-intl";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

import type { TankMeasurement } from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Factorisé une seule fois — utilisé par la modale de détail d'une
 * livraison confirmée ET par celle d'une livraison en cours (mêmes
 * colonnes, même source : `TankMeasurement`). */
export function DeliveryMeasurementsSection({ loading, measurements }: { loading: boolean; measurements: TankMeasurement[] }) {
  const t = useTranslations("zyloLiquid.deliveries");
  const format = useFormatter();

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  return (
    <div>
      <h3 className="text-h4 font-semibold text-text">{t("detail.measurementsTitle")}</h3>
      <p className="text-body-sm text-text-muted">{t("detail.measurementsSubtitle")}</p>
      <div className="mt-3">
        {loading ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("detail.measurementsColumns.date")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("detail.measurementsColumns.height")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("detail.measurementsColumns.volume")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={3} />
              ))}
            </TableBody>
          </Table>
        ) : measurements.length === 0 ? (
          <EmptyState title={t("detail.measurementsEmpty")} />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("detail.measurementsColumns.date")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("detail.measurementsColumns.height")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("detail.measurementsColumns.volume")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {measurements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono tabular-nums">{formatDateTime(m.measuredAt)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {format.number(m.rawValue)} {m.unit ?? "mm"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{m.volumeLiters === null ? "—" : `${formatLiters(m.volumeLiters)} L`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
