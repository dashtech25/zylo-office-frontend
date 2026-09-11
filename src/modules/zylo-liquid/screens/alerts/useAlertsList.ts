"use client";

import { useCallback, useEffect, useState } from "react";

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
export function useAlertsList(organizationId: string | null, statusFilter: AlertStatusFilter, typeFilter: AlertType | null, scope: AlertScope = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [stations, setStations] = useState<Station[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
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
      setAlerts(alertsPage.data);
      setTanks(tanksPage.data);
      setStations(stationsPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId, statusFilter, typeFilter, scope.stationId, scope.tankId]);

  useEffect(() => {
    load();
  }, [load]);

  // D3 : acquittement — "je m'en occupe", ne referme jamais l'alerte.
  async function acknowledge(alertId: string) {
    if (!organizationId) return;
    await acknowledgeAlertRequest(organizationId, alertId);
    await load();
  }

  // D2 : réservé aux types sans vérification automatique possible — le
  // backend renvoie 422 pour un type auto-vérifiable ; l'appelant affiche
  // alors err.message (déjà un texte clair côté backend).
  async function resolve(alertId: string, resolutionNote: string) {
    if (!organizationId) return;
    await resolveAlertRequest(organizationId, alertId, resolutionNote);
    await load();
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

  return { loading, error, rows, activeCount, stationGroups, acknowledge, resolve, reload: load };
}
