"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listAlerts,
  listStations,
  listTanks,
  resolveAlert as resolveAlertRequest,
  type Alert,
  type Station,
  type Tank,
} from "@/core/api/zyloLiquid";

export interface AlertRow {
  alert: Alert;
  tank: Tank | null;
  station: Station | null;
}

export type AlertStatusFilter = "active" | "resolved" | "all";

export function useAlertsList(organizationId: string | null, statusFilter: AlertStatusFilter) {
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
        listAlerts(organizationId, { status: statusFilter === "all" ? undefined : statusFilter, limit: 100 }),
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
  }, [organizationId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(alertId: string, resolutionNote?: string) {
    if (!organizationId) return;
    await resolveAlertRequest(organizationId, alertId, resolutionNote);
    await load();
  }

  const tankById = new Map(tanks.map((t) => [t.id, t]));
  const stationById = new Map(stations.map((s) => [s.id, s]));

  const rows: AlertRow[] = alerts
    .map((alert) => ({
      alert,
      tank: tankById.get(alert.tankId) ?? null,
      station: stationById.get(alert.stationId) ?? null,
    }))
    .sort((a, b) => (a.alert.triggeredAt < b.alert.triggeredAt ? 1 : -1));

  const activeCount = alerts.filter((a) => a.status === "active").length;

  return { loading, error, rows, activeCount, resolve, reload: load };
}
