"use client";

import { AlertTriangle, Fuel } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert as AlertBanner, Badge, Button, Card, EmptyState, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { KpiSkeleton, ListSkeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";

import { usePompisteDashboard } from "./usePompisteDashboard";

/** Tableau de bord du pompiste — reproduit `dashPompiste()` du prototype
 * validé (`prototype.html`, ~ligne 3644) : « Mon shift » plutôt que le
 * tableau de bord réseau, aucune vue de pilotage. Deux champs du prototype
 * fictif (pistolets/nombre de transactions par shift) n'existent pas dans
 * le modèle réel (`ShiftCashDeclaration` ne porte pas ces concepts) — omis
 * plutôt qu'inventés, conformément à la règle anti-invention de la mission.
 *
 * Migré vers React Query (cf. `usePompisteDashboard`) — les 3 sections
 * (shift courant / historique / alertes) se dégradent indépendamment avec
 * des skeletons plutôt qu'un unique spinner plein écran. */
export default function PompisteDashboard() {
  const t = useTranslations("zyloLiquid.pompisteDashboard");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = usePompisteDashboard(currentOrganization?.id ?? null);

  return (
    <Stack>
      <h1 className="text-h2 font-semibold text-text">{t("pageTitle")}</h1>
      <AlertBanner tone="info">{t("banner")}</AlertBanner>
      {data.error && <AlertBanner tone="error">{data.error}</AlertBanner>}

      <Card>
        {data.shiftsLoading ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <KpiSkeleton />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <KpiSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : !data.currentShift ? (
          <EmptyState icon={Fuel} title={t("noShift")} />
        ) : (
          <Stack>
            <div className="flex items-center justify-between">
              <Badge tone={data.currentShift.lifecycleStatus === "declared" ? "warning" : "success"}>
                {t(`status.${data.currentShift.lifecycleStatus}`)}
              </Badge>
              {data.currentShift.lifecycleStatus === "declared" && (
                <Button onClick={data.closeCurrentShift}>{t("closeShift")}</Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-body-sm text-text-muted">{t("shiftStart")}</div>
                <div className="font-mono">{format.dateTime(new Date(data.currentShift.shiftStart), { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</div>
              </div>
              <div>
                <div className="text-body-sm text-text-muted">{t("shiftEnd")}</div>
                <div className="font-mono">{format.dateTime(new Date(data.currentShift.shiftEnd), { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</div>
              </div>
              <div>
                <div className="text-body-sm text-text-muted">{t("declaredCash")}</div>
                <div className="font-mono tabular-nums">{data.currentShift.declaredCashAmount}</div>
              </div>
              <div>
                <div className="text-body-sm text-text-muted">{t("openingReading")}</div>
                <div className="font-mono tabular-nums">{data.currentShift.openingReadingMm ?? "—"} mm</div>
              </div>
            </div>
            {data.currentShift.lifecycleStatus === "locked" && <p className="text-body-sm text-text-muted">{t("closed")}</p>}
          </Stack>
        )}
      </Card>

      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("recentShifts")}</h2>
        {data.shiftsLoading ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("table.start")}</TableHeaderCell>
                <TableHeaderCell>{t("table.end")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("table.cash")}</TableHeaderCell>
                <TableHeaderCell>{t("table.status")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={4} />
              ))}
            </TableBody>
          </Table>
        ) : data.shifts.length === 0 ? (
          <EmptyState icon={Fuel} title={t("noShift")} />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("table.start")}</TableHeaderCell>
                <TableHeaderCell>{t("table.end")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("table.cash")}</TableHeaderCell>
                <TableHeaderCell>{t("table.status")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.shifts.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{format.dateTime(new Date(s.shiftStart), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell>{format.dateTime(new Date(s.shiftEnd), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{s.declaredCashAmount}</TableCell>
                  <TableCell>
                    <Badge tone={s.lifecycleStatus === "declared" ? "warning" : "success"}>{t(`status.${s.lifecycleStatus}`)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("alertsTitle")}</h2>
        {data.alertsLoading ? (
          <ListSkeleton rows={3} />
        ) : data.alerts.length === 0 ? (
          <EmptyState icon={AlertTriangle} title={t("noAlerts")} />
        ) : (
          <Stack>
            {data.alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-card border border-border-subtle px-3 py-2">
                <span>{a.type}</span>
                <span className="text-body-sm text-text-muted">{format.dateTime(new Date(a.triggeredAt), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
