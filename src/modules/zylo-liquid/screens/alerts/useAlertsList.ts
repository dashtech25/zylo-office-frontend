"use client";

import { useQuery } from "@tanstack/react-query";

import {
  acknowledgeAlert as acknowledgeAlertRequest,
  listAlerts,
  listStations,
  listTanks,
  resolveAlert as resolveAlertRequest,
  type Alert,
  type AlertType,
  type Station,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

export interface AlertRow {
  alert: Alert;
  tank: Tank | null;
  station: Station | null;
}

export interface AlertStationGroup {
  station: Station;
  count: number;
  activeCount: number;
  rows: AlertRow[];
}

export type AlertStatusFilter = "active" | "acknowledged" | "resolved" | "all";

export interface AlertScope {
  stationId?: string;
  tankId?: string;
}

/** Regroupe l'historique complet des alertes (pas seulement les actives) :
 * le filtre de statut par défaut est "all" côté écran — voir AlertsScreen.
 * `typeFilter` est optionnel et se cumule avec le filtre de statut (les
 * deux sont envoyés tels quels à l'API, qui les supporte déjà nativement,
 * cf. `service.list_alerts`). `scope` restreint à une station ou une cuve —
 * utilisé par `AlertsBrowserModal` pour ne jamais recharger la liste
 * réseau entière quand on est déjà dans le contexte d'une station/cuve. */
interface AlertsListData {
  alerts: Alert[];
  tanks: Tank[];
  stations: Station[];
}

async function fetchAlertsList(
  organizationId: string,
  statusFilter: AlertStatusFilter,
  typeFilter: AlertType | null,
  scope: AlertScope
): Promise<AlertsListData> {
  const [alertsPage, tanksPage, stationsPage] = await Promise.all([
    listAlerts(organizationId, {
      status: statusFilter === "all" ? undefined : statusFilter,
      type: typeFilter ?? undefined,
      stationId: scope.stationId,
      tankId: scope.tankId,
      limit: 100,
    }),
    listTanks(organizationId),
    listStations(organizationId),
  ]);
  return { alerts: alertsPage.data, tanks: tanksPage.data, stations: stationsPage.data };
}

/** Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * revenir sur cette liste après l'avoir quittée affiche instantanément la
 * dernière donnée connue au lieu de tout recharger. */
export function useAlertsList(organizationId: string | null, statusFilter: AlertStatusFilter, typeFilter: AlertType | null, scope: AlertScope = {}) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "alerts-list", organizationId, statusFilter, typeFilter, scope.stationId, scope.tankId],
    queryFn: () => fetchAlertsList(organizationId as string, statusFilter, typeFilter, scope),
    enabled: !!organizationId,
  });

  const alerts = query.data?.alerts ?? [];
  const tanks = query.data?.tanks ?? [];
  const stations = query.data?.stations ?? [];
  const loading = !!organizationId && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

  // D3 : acquittement — "je m'en occupe", ne referme jamais l'alerte.
  async function acknowledge(alertId: string) {
    if (!organizationId) return;
    await acknowledgeAlertRequest(organizationId, alertId);
    await query.refetch();
  }

  // D2 : réservé aux types sans vérification automatique possible — le
  // backend renvoie 422 pour un type auto-vérifiable ; l'appelant affiche
  // alors err.message (déjà un texte clair côté backend).
  async function resolve(alertId: string, resolutionNote: string) {
    if (!organizationId) return;
    await resolveAlertRequest(organizationId, alertId, resolutionNote);
    await query.refetch();
  }

  const tankById = new Map(tanks.map((t) => [t.id, t]));
  const stationById = new Map(stations.map((s) => [s.id, s]));

  const rows: AlertRow[] = alerts
    .map((alert) => ({
      alert,
      tank: alert.tankId ? (tankById.get(alert.tankId) ?? null) : null,
      station: stationById.get(alert.stationId) ?? null,
    }))
    .sort((a, b) => (a.alert.triggeredAt < b.alert.triggeredAt ? 1 : -1));

  const activeCount = alerts.filter((a) => a.status === "active").length;

  const stationGroups: AlertStationGroup[] = (() => {
    const byStation = new Map<string, AlertStationGroup>();
    for (const row of rows) {
      if (!row.station) continue;
      const entry = byStation.get(row.station.id) ?? { station: row.station, count: 0, activeCount: 0, rows: [] };
      entry.count += 1;
      if (row.alert.status === "active") entry.activeCount += 1;
      entry.rows.push(row);
      byStation.set(row.station.id, entry);
    }
    return [...byStation.values()].sort((a, b) => b.activeCount - a.activeCount || a.station.name.localeCompare(b.station.name));
  })();

  return {
    loading,
    error,
    rows,
    activeCount,
    stationGroups,
    acknowledge,
    resolve,
    reload: async () => {
      await query.refetch();
    },
  };
}
