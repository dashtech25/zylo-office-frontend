"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { listTankMeasurements } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { Button, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

const PAGE_SIZE = 25;

/** Historique paginé des mesures brutes d'une cuve (P1-6, audit module
 * Stations 2026-09-16 : "le backend expose déjà cette capacité, il ne reste
 * qu'à la relier au frontend" — `GET /tanks/{id}/measurements` supportait
 * déjà `limit`/`offset`, seule une interface paginée manquait). Distinct du
 * graphique de tendance déjà présent dans cet onglet (celui-ci n'affiche
 * qu'un échantillon de 40 points sur la fenêtre de 30 jours déjà chargée en
 * mémoire) : cette table interroge directement le backend, page par page,
 * sans plafond de fenêtre temporelle. */
export function MeasurementHistoryTable({ organizationId, tankId }: { organizationId: string; tankId: string }) {
  const t = useTranslations("zyloLiquid.tankDetail.history.table");
  const format = useFormatter();
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ["zylo-liquid", "tank-measurements-page", organizationId, tankId, offset],
    queryFn: () => listTankMeasurements(organizationId, tankId, { limit: PAGE_SIZE, offset }),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const hasPrevious = offset > 0;
  const hasNext = offset + rows.length < total;

  return (
    <div className="flex flex-col gap-3">
      {query.isPending ? (
        <Table>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={4} />
            ))}
          </TableBody>
        </Table>
      ) : rows.length === 0 ? (
        <p className="text-body-sm text-text-muted">{t("empty")}</p>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("columns.measuredAt")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("columns.rawValue")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("columns.volume")}</TableHeaderCell>
                <TableHeaderCell>{t("columns.correction")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{format.dateTime(new Date(m.measuredAt), { dateStyle: "short", timeStyle: "medium" })}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {m.rawValue} {m.unit ?? ""}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{m.volumeLiters !== null ? `${formatLiters(m.volumeLiters)} L` : "—"}</TableCell>
                  <TableCell className="text-text-muted">{m.isCorrection ? t("correctionYes") : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <span className="text-caption text-text-muted">{t("pageInfo", { from: offset + 1, to: offset + rows.length, total })}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrevious} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                <ChevronLeft className="size-4" aria-hidden />
                {t("previous")}
              </Button>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setOffset(offset + PAGE_SIZE)}>
                {t("next")}
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
