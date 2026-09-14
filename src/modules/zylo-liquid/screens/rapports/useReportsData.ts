"use client";

import { useQuery } from "@tanstack/react-query";

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
  /** État de chargement des états courants par station (requête séparée,
   * dépend de la liste de stations de la base — cf. commentaire sur
   * `useReportsData`) : permet au classement des stations et à
   * `stationsOnlineCount` de rester en squelette indépendamment du reste
   * (vue d'ensemble, alertes, fuites), déjà prêt lui. */
  statesLoading: boolean;
  /** État de chargement des livraisons de la période (requête séparée : ne
   * dépend que de `period`, inutile de refaire la base réseau quand on
   * change juste la période affichée). */
  deliveriesLoading: boolean;
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

interface ReportsBaseData {
  stations: Station[];
  tanks: Tank[];
  fuelProducts: FuelProduct[];
  networkSummary: NetworkSummary;
  allAlerts: Alert[];
  leakEvents: LeakEvent[];
}

async function fetchReportsBase(organizationId: string): Promise<ReportsBaseData> {
  const [stationsPage, tanksPage, fuelProductsPage, summary, alertsPage, leakEventsPage] = await Promise.all([
    listStations(organizationId),
    listTanks(organizationId),
    listFuelProducts(organizationId),
    getNetworkSummary(organizationId),
    listAlerts(organizationId, { limit: 100 }),
    listLeakEvents(organizationId, { limit: 100 }),
  ]);
  return {
    stations: stationsPage.data,
    tanks: tanksPage.data,
    fuelProducts: fuelProductsPage.data,
    networkSummary: summary,
    allAlerts: alertsPage.data,
    leakEvents: leakEventsPage.data,
  };
}

async function fetchReportsDeliveries(organizationId: string, period: ReportsPeriod): Promise<Delivery[]> {
  const fromDate =
    period === "today"
      ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      : new Date(Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000).toISOString();
  const deliveriesPage = await listDeliveries(organizationId, { fromDate, limit: 100 });
  return deliveriesPage.data;
}

async function fetchStationStates(organizationId: string, activeStationIds: string[]): Promise<Record<string, StationCurrentState>> {
  const states = await Promise.all(activeStationIds.map((id) => getStationCurrentState(organizationId, id)));
  const statesByStation: Record<string, StationCurrentState> = {};
  activeStationIds.forEach((id, index) => {
    statesByStation[id] = states[index];
  });
  return statesByStation;
}

/** Hook de données privé à l'écran Rapports (colocalisé, pas dans
 * `modules/zylo-liquid/hooks/` : un seul écran l'utilise aujourd'hui — cf.
 * `src/modules/CLAUDE.md` "ne pas promouvoir au niveau du module au cas
 * où"). Réutilise entièrement `services/zyloLiquidApi.ts`, jamais un appel
 * fetch direct. Aucune donnée agrégée n'est déjà exposée par un endpoint
 * dédié pour ces classements — ils sont calculés ici à partir des mêmes
 * données brutes que le tableau de bord, jamais inventés.
 *
 * Migré vers React Query (audit performance/cache, cf. `QueryProvider`),
 * même principe de découpage que `useNetworkDashboard` : 3 requêtes
 * indépendantes plutôt qu'une seule car ce sont 3 enchaînements avec des
 * dépendances différentes — la base réseau (stations/cuves/produits/
 * synthèse/alertes/fuites), les livraisons de la période (dépend
 * uniquement de `period`), et les états courants par station active
 * (dépend de la liste de stations de la base, d'où `enabled`). */
export function useReportsData(organizationId: string | null, period: ReportsPeriod) {
  const baseQuery = useQuery({
    queryKey: ["zylo-liquid", "reports", "base", organizationId],
    queryFn: () => fetchReportsBase(organizationId as string),
    enabled: !!organizationId,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["zylo-liquid", "reports", "deliveries", organizationId, period],
    queryFn: () => fetchReportsDeliveries(organizationId as string, period),
    enabled: !!organizationId,
  });

  const stations = baseQuery.data?.stations ?? [];
  const activeStationIds = stations.filter((s) => s.status === "active").map((s) => s.id);

  const statesQuery = useQuery({
    queryKey: ["zylo-liquid", "reports", "station-states", organizationId, activeStationIds],
    queryFn: () => fetchStationStates(organizationId as string, activeStationIds),
    enabled: !!organizationId && !!baseQuery.data,
  });

  const loading = !!organizationId && baseQuery.isPending;
  const statesLoading = !!organizationId && (baseQuery.isPending || statesQuery.isPending);
  const deliveriesLoading = !!organizationId && deliveriesQuery.isPending;
  const error = baseQuery.error ? (baseQuery.error instanceof Error ? baseQuery.error.message : String(baseQuery.error)) : null;

  const tanks = baseQuery.data?.tanks ?? [];
  const fuelProducts = baseQuery.data?.fuelProducts ?? [];
  const networkSummary = baseQuery.data?.networkSummary ?? null;
  const allAlerts = baseQuery.data?.allAlerts ?? [];
  const leakEvents = baseQuery.data?.leakEvents ?? [];
  const deliveries = deliveriesQuery.data ?? [];
  const stationStates = statesQuery.data ?? {};

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
    statesLoading,
    deliveriesLoading,
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
