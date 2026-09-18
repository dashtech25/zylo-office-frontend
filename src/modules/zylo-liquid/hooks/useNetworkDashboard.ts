"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getNetworkSnapshot,
  getNetworkSummary,
  getStationCurrentState,
  listAlerts,
  listDeliveries,
  listFuelProducts,
  listStations,
  listTanks,
  type Alert,
  type Delivery,
  type FuelProduct,
  type NetworkSummary,
  type Station,
  type StationCurrentState,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { computeStationOnlineStatus } from "@/modules/zylo-liquid/utils/stationStatus";

export type Period = "now" | "today" | "7d" | "30d" | "custom";

export interface ProductAggregate {
  fuelProductId: string;
  name: string;
  displayColor: string | null;
  volumeLiters: number;
  capacityLiters: number;
  stationCount: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  sellableVolumeLiters: number;
  sellableMonetaryValue: number | null;
}

export interface StationAggregate {
  station: Station;
  online: boolean;
  volumeLiters: number;
  capacityLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  mainProductName: string | null;
}

export type ActivityEvent =
  | { kind: "delivery"; at: string; delivery: Delivery; stationName: string }
  | { kind: "alert"; at: string; alert: Alert; stationName: string }
  | { kind: "measurement"; at: string; stationName: string; tankName: string; heightMm: number };

export interface ChartProductPoint {
  fuelProductId: string;
  volumeLiters: number;
}

export interface ChartPoint {
  at: string;
  totalVolumeLiters: number;
  /** Répartition par produit au même instant — `NetworkSnapshot.products`
   * était déjà renvoyée par l'API à chaque échantillon, simplement jetée
   * jusqu'ici (seul `totalVolumeLiters` était gardé). Réutilisée telle
   * quelle pour le graphique multi-produits de la rangée 4 du dashboard,
   * aucun nouvel appel réseau. */
  products: ChartProductPoint[];
}

export interface NetworkDashboardData {
  loading: boolean;
  /** État de chargement de la requête d'états courants par station (dépend de
   * `baseQuery` — cf. commentaire sur `useNetworkDashboard`). Exposé
   * séparément de `loading` pour permettre au rendu de dégrader
   * indépendamment la seule table des stations / activité récente (qui en
   * dépendent) plutôt que de bloquer tout l'écran derrière un seul booléen. */
  statesLoading: boolean;
  error: string | null;
  stations: Station[];
  tanks: Tank[];
  fuelProducts: FuelProduct[];
  networkSummary: NetworkSummary | null;
  products: ProductAggregate[];
  totalCapacityLiters: number;
  totalMonetaryValue: number | null;
  totalMonetaryCurrencyCode: string | null;
  totalSellableVolumeLiters: number;
  totalSellableMonetaryValue: number | null;
  stationsActiveCount: number;
  stationsOfflineCount: number;
  activeAlertsCount: number;
  activeAlerts: Alert[];
  stationAggregates: StationAggregate[];
  stationStates: Record<string, StationCurrentState>;
  recentActivity: ActivityEvent[];
  chartPoints: ChartPoint[];
  chartLoading: boolean;
}

const CHART_SAMPLE_COUNTS: Record<Exclude<Period, "custom">, number> = { now: 6, today: 6, "7d": 7, "30d": 10 };
const CHART_SPAN_MS: Record<Exclude<Period, "custom">, number> = {
  now: 24 * 60 * 60 * 1000,
  today: 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function stationName(stations: Station[], stationId: string | null): string {
  // Étape 2 tracking — une alerte de camion n'a pas de station (stationId
  // null), jamais un identifiant à afficher tel quel dans ce cas.
  if (stationId === null) return "";
  return stations.find((s) => s.id === stationId)?.name ?? stationId;
}

interface NetworkBaseData {
  stations: Station[];
  tanks: Tank[];
  fuelProducts: FuelProduct[];
  networkSummary: NetworkSummary;
  activeAlerts: Alert[];
  deliveries: Delivery[];
}

async function fetchNetworkBase(organizationId: string): Promise<NetworkBaseData> {
  const [stationsPage, tanksPage, fuelProductsPage, summary, alertsPage, deliveriesPage] = await Promise.all([
    listStations(organizationId),
    listTanks(organizationId),
    listFuelProducts(organizationId),
    getNetworkSummary(organizationId),
    listAlerts(organizationId, { status: "active", limit: 20 }),
    listDeliveries(organizationId, { limit: 10 }),
  ]);
  return {
    stations: stationsPage.data,
    tanks: tanksPage.data,
    fuelProducts: fuelProductsPage.data,
    networkSummary: summary,
    activeAlerts: alertsPage.data,
    deliveries: deliveriesPage.data,
  };
}

async function fetchStationStates(organizationId: string, activeStationIds: string[]): Promise<Record<string, StationCurrentState>> {
  const states = await Promise.all(activeStationIds.map((id) => getStationCurrentState(organizationId, id)));
  const statesByStation: Record<string, StationCurrentState> = {};
  activeStationIds.forEach((id, index) => {
    statesByStation[id] = states[index];
  });
  return statesByStation;
}

async function fetchChartPoints(organizationId: string, period: Period, customDate: string | null): Promise<ChartPoint[]> {
  if (period === "custom" && customDate) {
    const point = await getNetworkSnapshot(organizationId, new Date(customDate).toISOString());
    return [
      {
        at: customDate,
        totalVolumeLiters: point.totalVolumeLiters,
        products: point.products.map((p) => ({ fuelProductId: p.fuelProductId, volumeLiters: p.totalVolumeLiters })),
      },
    ];
  }

  const key = period === "custom" ? "now" : period;
  const count = CHART_SAMPLE_COUNTS[key];
  const span = CHART_SPAN_MS[key];
  const now = Date.now();
  const timestamps = Array.from({ length: count }, (_, i) => new Date(now - span * ((count - 1 - i) / (count - 1))));

  const points = await Promise.all(
    timestamps.map(async (t) => {
      try {
        const snapshot = await getNetworkSnapshot(organizationId, t.toISOString());
        return {
          at: t.toISOString(),
          totalVolumeLiters: snapshot.totalVolumeLiters,
          products: snapshot.products.map((p) => ({ fuelProductId: p.fuelProductId, volumeLiters: p.totalVolumeLiters })),
        };
      } catch {
        return null;
      }
    })
  );
  return points.filter((p): p is ChartPoint => p !== null);
}

/** Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * revenir sur le dashboard après l'avoir quitté affiche instantanément la
 * dernière donnée connue au lieu de tout recharger. Séparé en 3 requêtes
 * plutôt qu'une seule car ce sont 3 enchaînements indépendants avec des
 * fréquences de changement différentes : la base réseau, les états courants
 * des stations actives (dépend de la liste de stations de la base, d'où
 * `enabled`), et les points du graphique (dépend de `period`/`customDate`
 * uniquement — inutile de refaire la base réseau quand on change juste la
 * période affichée). */
export function useNetworkDashboard(organizationId: string | null, period: Period, customDate: string | null) {
  const baseQuery = useQuery({
    queryKey: ["zylo-liquid", "network-dashboard", "base", organizationId],
    queryFn: () => fetchNetworkBase(organizationId as string),
    enabled: !!organizationId,
  });

  const stations = baseQuery.data?.stations ?? [];
  const activeStationIds = stations.filter((s) => s.status === "active").map((s) => s.id);

  const statesQuery = useQuery({
    queryKey: ["zylo-liquid", "network-dashboard", "station-states", organizationId, activeStationIds],
    queryFn: () => fetchStationStates(organizationId as string, activeStationIds),
    enabled: !!organizationId && !!baseQuery.data,
  });

  const chartQuery = useQuery({
    queryKey: ["zylo-liquid", "network-dashboard", "chart", organizationId, period, customDate],
    queryFn: () => fetchChartPoints(organizationId as string, period, customDate),
    enabled: !!organizationId,
  });

  const loading = !!organizationId && baseQuery.isPending;
  const statesLoading = !!organizationId && (baseQuery.isPending || statesQuery.isPending);
  const error = baseQuery.error ? (baseQuery.error instanceof Error ? baseQuery.error.message : String(baseQuery.error)) : null;
  const tanks = baseQuery.data?.tanks ?? [];
  const fuelProducts = baseQuery.data?.fuelProducts ?? [];
  const networkSummary = baseQuery.data?.networkSummary ?? null;
  const activeAlerts = baseQuery.data?.activeAlerts ?? [];
  const deliveries = baseQuery.data?.deliveries ?? [];
  const stationStates = statesQuery.data ?? {};
  const chartPoints = chartQuery.data ?? [];
  const chartLoading = !!organizationId && chartQuery.isPending;

  const tanksByFuelProduct = new Map<string, Tank[]>();
  for (const tank of tanks) {
    if (!tank.active) continue;
    const list = tanksByFuelProduct.get(tank.fuelProductId) ?? [];
    list.push(tank);
    tanksByFuelProduct.set(tank.fuelProductId, list);
  }

  const products: ProductAggregate[] = fuelProducts.map((product) => {
    const line = networkSummary?.products.find((p) => p.fuelProductId === product.id);
    const capacityLiters = (tanksByFuelProduct.get(product.id) ?? []).reduce(
      (sum, t) => sum + (t.calibratedCapacityLiters ?? t.capacityLiters),
      0
    );
    return {
      fuelProductId: product.id,
      name: product.name,
      displayColor: product.displayColor,
      volumeLiters: line?.totalVolumeLiters ?? 0,
      capacityLiters,
      stationCount: line?.stationCount ?? 0,
      monetaryValue: line?.totalMonetaryValue ?? null,
      currencyCode: line?.currencyCode ?? null,
      sellableVolumeLiters: line?.totalSellableVolumeLiters ?? 0,
      sellableMonetaryValue: line?.totalSellableMonetaryValue ?? null,
    };
  });

  const totalCapacityLiters = tanks.filter((t) => t.active).reduce((sum, t) => sum + (t.calibratedCapacityLiters ?? t.capacityLiters), 0);

  const productCurrencies = new Set(products.map((p) => p.currencyCode).filter((c): c is string => c !== null));
  const totalMonetaryValue =
    productCurrencies.size === 1 && products.every((p) => p.monetaryValue !== null || p.volumeLiters === 0)
      ? products.reduce((sum, p) => sum + (p.monetaryValue ?? 0), 0)
      : null;
  const totalMonetaryCurrencyCode = productCurrencies.size === 1 ? [...productCurrencies][0] : null;
  // Même porte que `totalMonetaryValue` (une seule devise réseau, aucun
  // produit avec un stock non nul et une valeur non calculable) — la valeur
  // vendable ne doit jamais être sommée séparément avec une règle différente.
  const totalSellableVolumeLiters = networkSummary?.totalSellableVolumeLiters ?? 0;
  const totalSellableMonetaryValue =
    productCurrencies.size === 1 && products.every((p) => p.monetaryValue !== null || p.volumeLiters === 0)
      ? products.reduce((sum, p) => sum + (p.sellableMonetaryValue ?? 0), 0)
      : null;

  const tankById = new Map(tanks.map((t) => [t.id, t]));
  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));

  const stationAggregates: StationAggregate[] = stations.map((station) => {
    const state = stationStates[station.id];
    const tankStates = state?.tanks ?? [];
    const { online } = computeStationOnlineStatus(tankStates);
    const volumeLiters = tankStates.reduce((sum, t) => sum + (t.volumeLiters ?? 0), 0);
    const capacityLiters = tanks
      .filter((t) => t.stationId === station.id && t.active)
      .reduce((sum, t) => sum + (t.calibratedCapacityLiters ?? t.capacityLiters), 0);
    const currencies = new Set(tankStates.map((t) => t.currencyCode).filter((c): c is string => c !== null));
    const monetaryValue =
      currencies.size === 1 ? tankStates.reduce((sum, t) => sum + (t.monetaryValue ?? 0), 0) : currencies.size === 0 ? null : null;

    let mainProductName: string | null = null;
    let maxVolume = -1;
    for (const tankState of tankStates) {
      const tank = tankById.get(tankState.tankId);
      const volume = tankState.volumeLiters ?? -1;
      if (tank && volume > maxVolume) {
        maxVolume = volume;
        mainProductName = fuelProductById.get(tank.fuelProductId)?.name ?? null;
      }
    }

    return {
      station,
      online,
      volumeLiters,
      capacityLiters,
      monetaryValue,
      currencyCode: currencies.size === 1 ? [...currencies][0] : null,
      mainProductName,
    };
  });

  const stationsActiveCount = stations.filter((s) => s.status === "active").length;
  const stationsOfflineCount = stationAggregates.filter((s) => s.station.status === "active" && !s.online).length;

  const recentActivity: ActivityEvent[] = [];
  for (const delivery of deliveries) {
    recentActivity.push({ kind: "delivery", at: delivery.endTime, delivery, stationName: stationName(stations, delivery.stationId) });
  }
  for (const alert of activeAlerts) {
    recentActivity.push({ kind: "alert", at: alert.triggeredAt, alert, stationName: stationName(stations, alert.stationId) });
  }
  for (const station of stations) {
    const state = stationStates[station.id];
    for (const tankState of state?.tanks ?? []) {
      if (!tankState.lastMeasurementAt) continue;
      recentActivity.push({
        kind: "measurement",
        at: tankState.lastMeasurementAt,
        stationName: station.name,
        tankName: tankState.displayName,
        heightMm: tankState.heightMm ?? 0,
      });
    }
  }
  recentActivity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const data: NetworkDashboardData = {
    loading,
    statesLoading,
    error,
    stations,
    tanks,
    fuelProducts,
    networkSummary,
    products,
    totalCapacityLiters,
    totalMonetaryValue,
    totalMonetaryCurrencyCode,
    totalSellableVolumeLiters,
    totalSellableMonetaryValue,
    stationsActiveCount,
    stationsOfflineCount,
    activeAlertsCount: activeAlerts.length,
    activeAlerts,
    stationAggregates,
    stationStates,
    recentActivity: recentActivity.slice(0, 8),
    chartPoints,
    chartLoading,
  };

  return data;
}
