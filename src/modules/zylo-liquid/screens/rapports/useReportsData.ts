"use client";

import { useEffect, useState } from "react";

import {
  getNetworkSummary,
  getStationCurrentState,
  listAlerts,
  listDeliveries,
  listFuelProducts,
  listLeakEvents,
  listStations,
  listTanks,
  type Alert,
  type AlertType,
  type Delivery,
  type FuelProduct,
  type LeakEvent,
  type NetworkSummary,
  type Station,
  type StationCurrentState,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Fenêtre d'analyse pour les KPI qui dépendent d'une période (livraisons,
 * fuites) — les KPI de stock/alerte restent "maintenant" (Niveau 1 n'a pas
 * de notion de stock historique matérialisé, voir station_kpi.md §13). */
export type ReportsPeriod = "today" | "7d" | "30d" | "90d";

const PERIOD_DAYS: Record<ReportsPeriod, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };

export interface StationReportRow {
  station: Station;
  online: boolean;
  volumeLiters: number;
  capacityLiters: number;
  fillRatePct: number | null;
  monetaryValue: number | null;
  currencyCode: string | null;
  activeAlertsCount: number;
  deliveriesCount: number;
  deliveredVolumeLiters: number;
  tankCount: number;
  onlineTankCount: number;
}

export interface AlertTypeBreakdown {
  type: AlertType;
  activeCount: number;
  totalCount: number;
}

/** Cette donnée n'existe nulle part en base (station_kpi.md §0.4/§17) — un
 * seuil de matérialité choisi ici uniquement pour distinguer visuellement
 * "aucune donnée" (loading) de "zéro alerte" (vrai zéro), jamais pour
 * remplacer une valeur manquante par une valeur inventée. */
export interface ReportsData {
  loading: boolean;
  error: string | null;
  stations: Station[];
  tanks: Tank[];
  fuelProducts: FuelProduct[];
  networkSummary: NetworkSummary | null;
  allAlerts: Alert[];
  activeAlerts: Alert[];
  deliveries: Delivery[];
  leakEvents: LeakEvent[];
  stationRows: StationReportRow[];
  alertBreakdown: AlertTypeBreakdown[];
  totalCapacityLiters: number;
  stationsActiveCount: number;
  stationsOnlineCount: number;
  onlineTankCount: number;
  activeTankCount: number;
}

/** Hook de données privé à l'écran Rapports (colocalisé, pas dans
 * `modules/zylo-liquid/hooks/` : un seul écran l'utilise aujourd'hui — cf.
 * `src/modules/CLAUDE.md` "ne pas promouvoir au niveau du module au cas
 * où"). Réutilise entièrement `services/zyloLiquidApi.ts`, jamais un appel
 * fetch direct. Aucune donnée agrégée n'est déjà exposée par un endpoint
 * dédié pour ces classements — ils sont calculés ici à partir des mêmes
 * données brutes que le tableau de bord, jamais inventés. */
export function useReportsData(organizationId: string | null, period: ReportsPeriod) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelProducts, setFuelProducts] = useState<FuelProduct[]>([]);
  const [networkSummary, setNetworkSummary] = useState<NetworkSummary | null>(null);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [leakEvents, setLeakEvents] = useState<LeakEvent[]>([]);
  const [stationStates, setStationStates] = useState<Record<string, StationCurrentState>>({});

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fromDate =
      period === "today"
        ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
        : new Date(Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000).toISOString();

    async function load() {
      try {
        const [stationsPage, tanksPage, fuelProductsPage, summary, alertsPage, deliveriesPage, leakEventsPage] = await Promise.all([
          listStations(organizationId!),
          listTanks(organizationId!),
          listFuelProducts(organizationId!),
          getNetworkSummary(organizationId!),
          listAlerts(organizationId!, { limit: 100 }),
          listDeliveries(organizationId!, { fromDate, limit: 100 }),
          listLeakEvents(organizationId!, { limit: 100 }),
        ]);
        if (cancelled) return;

        const activeStations = stationsPage.data.filter((s) => s.status === "active");
        const states = await Promise.all(activeStations.map((s) => getStationCurrentState(organizationId!, s.id)));
        if (cancelled) return;

        const statesByStation: Record<string, StationCurrentState> = {};
        activeStations.forEach((s, index) => {
          statesByStation[s.id] = states[index];
        });

        setStations(stationsPage.data);
        setTanks(tanksPage.data);
        setFuelProducts(fuelProductsPage.data);
        setNetworkSummary(summary);
        setAllAlerts(alertsPage.data);
        setDeliveries(deliveriesPage.data);
        setLeakEvents(leakEventsPage.data);
        setStationStates(statesByStation);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [organizationId, period]);

  const activeAlerts = allAlerts.filter((a) => a.status === "active");
  const tanksByStation = new Map<string, Tank[]>();
  for (const tank of tanks) {
    if (!tank.active) continue;
    const list = tanksByStation.get(tank.stationId) ?? [];
    list.push(tank);
    tanksByStation.set(tank.stationId, list);
  }

  const stationRows: StationReportRow[] = stations.map((station) => {
    const state = stationStates[station.id];
    const tankStates = state?.tanks ?? [];
    const stationTanks = tanksByStation.get(station.id) ?? [];
    const online = tankStates.some((t) => t.sensorStatus === "online");
    const onlineTankCount = tankStates.filter((t) => t.sensorStatus === "online").length;
    const volumeLiters = tankStates.reduce((sum, t) => sum + (t.volumeLiters ?? 0), 0);
    const capacityLiters = stationTanks.reduce((sum, t) => sum + (t.calibratedCapacityLiters ?? t.capacityLiters), 0);
    const currencies = new Set(tankStates.map((t) => t.currencyCode).filter((c): c is string => c !== null));
    const monetaryValue = currencies.size === 1 ? tankStates.reduce((sum, t) => sum + (t.monetaryValue ?? 0), 0) : null;
    const stationTankIds = new Set(stationTanks.map((t) => t.id));
    const activeAlertsCount = activeAlerts.filter((a) => a.stationId === station.id).length;
    const stationDeliveries = deliveries.filter((d) => stationTankIds.has(d.tankId));

    return {
      station,
      online,
      volumeLiters,
      capacityLiters,
      fillRatePct: capacityLiters > 0 ? (volumeLiters / capacityLiters) * 100 : null,
      monetaryValue,
      currencyCode: currencies.size === 1 ? [...currencies][0] : null,
      activeAlertsCount,
      deliveriesCount: stationDeliveries.length,
      deliveredVolumeLiters: stationDeliveries.reduce((sum, d) => sum + (d.volumeLiters ?? 0), 0),
      tankCount: stationTanks.length,
      onlineTankCount,
    };
  });

  const ALERT_TYPES: AlertType[] = ["level_high", "level_high_pre_alarm", "level_low", "water", "leak", "sensor_offline"];
  const alertBreakdown: AlertTypeBreakdown[] = ALERT_TYPES.map((type) => ({
    type,
    activeCount: activeAlerts.filter((a) => a.type === type).length,
    totalCount: allAlerts.filter((a) => a.type === type).length,
  }));

  const totalCapacityLiters = tanks.filter((t) => t.active).reduce((sum, t) => sum + (t.calibratedCapacityLiters ?? t.capacityLiters), 0);
  const stationsActiveCount = stations.filter((s) => s.status === "active").length;
  const stationsOnlineCount = stationRows.filter((r) => r.station.status === "active" && r.online).length;
  const activeTankCount = tanks.filter((t) => t.active).length;
  const onlineTankCount = stationRows.reduce((sum, r) => sum + r.onlineTankCount, 0);

  const data: ReportsData = {
    loading,
    error,
    stations,
    tanks,
    fuelProducts,
    networkSummary,
    allAlerts,
    activeAlerts,
    deliveries,
    leakEvents,
    stationRows,
    alertBreakdown,
    totalCapacityLiters,
    stationsActiveCount,
    stationsOnlineCount,
    onlineTankCount,
    activeTankCount,
  };

  return data;
}
