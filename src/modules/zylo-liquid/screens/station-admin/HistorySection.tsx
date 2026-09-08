"use client";

import { History } from "lucide-react";
import { useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { listAuditLogs } from "@/core/api/audit";
import { Card, CardSectionHeader, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

/** Domaine « Historique » du Centre administratif — journal d'audit filtré
 * sur cette station précise (`scopeResourceType`/`scopeResourceId`, ajout
 * additif au filtre déjà existant de `GET /audit/organizations/{id}` pour
 * cette mission — la restriction de portée par rôle reste appliquée côté
 * backend, ce filtre ne fait que la restreindre davantage). */
export function HistorySection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationAdmin.history");
  const format = useFormatter();

  const load = useCallback(
    () => listAuditLogs(organizationId, { scopeResourceType: "station", scopeResourceId: stationId, limit: 100 }).then((p) => p.data),
    [organizationId, stationId]
  );
  const state = usePartData(load);

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
          (state.data.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={History} title={t("empty")} />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("table.date")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.action")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.summary")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="tabular-nums text-text-muted">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell className="font-mono text-caption">{entry.action}</TableCell>
                    <TableCell>{entry.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
      </PartStateBox>
    </Card>
  );
}
