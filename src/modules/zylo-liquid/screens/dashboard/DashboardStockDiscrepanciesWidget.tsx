"use client";

import { AlertTriangle } from "lucide-react";
import { useFormatter } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { listReconciliationRecords, type Station, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Card } from "@/shared/ui";
import { DiscrepancyListItem } from "@/modules/zylo-liquid/components/DiscrepancyListItem";

const MAX_VISIBLE = 5;

/** Widget « écarts de stock » du tableau de bord — signale les écarts
 * détectés par le rapprochement (ventes déclarées vs stock télémétrique)
 * pour que le propriétaire de réseau les voie sans ouvrir l'écran dédié.
 * Contrairement à `DashboardAlertsWidget`, les `ReconciliationRecord` ne
 * font pas partie de `useNetworkDashboard` : ils sont récupérés ici via
 * React Query (même patron que `useReconciliation`). `stations`/`tanks`
 * en revanche sont déjà chargés par le dashboard — aucun appel
 * `listStations`/`listTanks` supplémentaire. Chaque ligne renvoie vers
 * `/zylo-liquid/reconciliation` (pas de modale de détail, pour rester
 * rapide à construire). */
export function DashboardStockDiscrepanciesWidget({
  organizationId,
  stations,
  tanks,
}: {
  organizationId: string;
  stations: Station[];
  tanks: Tank[];
}) {
  const format = useFormatter();

  const { data } = useQuery({
    queryKey: ["zylo-liquid", "reconciliation", organizationId, "TankStockDay"],
    queryFn: () => listReconciliationRecords(organizationId, { subjectType: "TankStockDay", limit: 100 }),
    enabled: !!organizationId,
  });

  const discrepancies = (data?.data ?? []).filter((record) => record.status === "discrepancy");

  function formatDate(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-h3 font-semibold text-text">Écarts de stock</h3>
        <span className="text-body-sm font-medium text-text-muted">{discrepancies.length}</span>
      </div>
      {discrepancies.length === 0 ? (
        <p className="text-body-sm text-text-muted">Aucun écart de stock détecté</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {discrepancies.slice(0, MAX_VISIBLE).map((record) => {
            const tank = tanks.find((tk) => tk.id === record.subjectId);
            const station = tank ? stations.find((s) => s.id === tank.stationId) : undefined;
            const tankLabel = tank ? `${tank.displayName} (#${tank.tankNumber})` : record.subjectId;
            const label = station ? `${station.name} — ${tankLabel}` : tankLabel;
            return (
              <li key={record.id}>
                <DiscrepancyListItem
                  href="/zylo-liquid/reconciliation"
                  icon={AlertTriangle}
                  label={label}
                  value={record.discrepancyValue !== null ? `${record.discrepancyValue.toFixed(2)} ${record.discrepancyUnit ?? ""}` : "—"}
                  timeLabel={formatDate(record.evaluatedAt)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
