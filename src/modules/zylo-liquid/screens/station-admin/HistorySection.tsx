"use client";

import { History } from "lucide-react";
import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { listAuditLogs, type AuditLogEntry } from "@/core/api/audit";
import type { Page } from "@/core/api/types";
import { Card, CardSectionHeader, EmptyState, Pagination, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

const PAGE_SIZE = 20;

/** Domaine « Historique » du Centre administratif — journal d'audit filtré
 * sur cette station précise (`scopeResourceType`/`scopeResourceId`, ajout
 * additif au filtre déjà existant de `GET /audit/organizations/{id}` pour
 * cette mission — la restriction de portée par rôle reste appliquée côté
 * backend, ce filtre ne fait que la restreindre davantage).
 *
 * Pagination réelle (page 1-indexée, `Pagination` de `shared/ui`) plutôt que
 * `limit: 100` sans suite : c'est un journal d'audit, append-only, la seule
 * des ~43 listes plafonnées à 100 côté frontend qui grandit sans borne —
 * au-delà de 100 évènements pour une station, les plus anciens disparaissaient
 * silencieusement sans aucune indication (Phase 1, audit de performance,
 * §2.1/§3 problème 6). Le backend supportait déjà `limit`/`offset` et
 * renvoie `meta.total` (`app/audit/router.py`) — seul le frontend ignorait
 * ces champs. */
export function HistorySection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationAdmin.history");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [page, setPage] = useState(1);

  const load = useCallback(
    (): Promise<Page<AuditLogEntry>> =>
      listAuditLogs(organizationId, {
        scopeResourceType: "station",
        scopeResourceId: stationId,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    [organizationId, stationId, page]
  );
  const state = usePartData(["zylo-liquid", "station-admin", "history", organizationId, stationId, page], load);
  const totalPages = state.status === "ready" ? Math.max(1, Math.ceil(state.data.meta.total / PAGE_SIZE)) : 1;

  function formatDate(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Card padding="none">
      <div className="p-5 pb-0">
        <CardSectionHeader title={t("title")} />
      </div>
      <PartStateBox state={state}>
        {state.status === "ready" &&
          (state.data.data.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={History} title={t("empty")} />
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("table.date")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.action")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.summary")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.data.data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="tabular-nums text-text-muted">{formatDate(entry.createdAt)}</TableCell>
                      <TableCell className="font-mono text-caption">{entry.action}</TableCell>
                      <TableCell>{entry.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-5 pt-4">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  labels={{
                    label: tCommon("pagination.label"),
                    previous: tCommon("pagination.previous"),
                    next: tCommon("pagination.next"),
                    page: (p) => tCommon("pagination.page", { page: p }),
                  }}
                />
              </div>
            </>
          ))}
      </PartStateBox>
    </Card>
  );
}
