"use client";

import { useEffect, useState } from "react";

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
} from "@/core/api/zyloLiquid";

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

export interface ChartPoint {
  at: string;
  totalVolumeLiters: number;
}

export interface NetworkDashboardData {
  loading: boolean;
  error: string | null;
  stations: Station[];
  tanks: Tank[];
  fuelProducts: FuelProduct[];
  networkSummary: NetworkSummary | null;
  products: ProductAggregate[];
  totalCapacityLiters: number;
  totalMonetaryValue: number | null;
  totalMonetaryCurrencyCode: string | null;
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

function stationName(stations: Station[], stationId: string): string {
  return stations.find((s) => s.id === stationId)?.name ?? stationId;
}

export function useNetworkDashboard(organizationId: string | null, period: Period, customDate: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelProducts, setFuelProducts] = useState<FuelProduct[]>([]);
  const [networkSummary, setNetworkSummary] = useState<NetworkSummary | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stationStates, setStationStates] = useState<Record<string, StationCurrentState>>({});
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const [stationsPage, tanksPage, fuelProductsPage, summary, alertsPage, deliveriesPage] = await Promise.all([
          listStations(organizationId!),
          listTanks(organizationId!),
          listFuelProducts(organizationId!),
          getNetworkSummary(organizationId!),
          listAlerts(organizationId!, { status: "active", limit: 20 }),
          listDeliveries(organizationId!, { limit: 10 }),
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
        setActiveAlerts(alertsPage.data);
        setDeliveries(deliveriesPage.data);
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
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    setChartLoading(true);

    async function loadChart() {
      try {
        if (period === "custom" && customDate) {
          const point = await getNetworkSnapshot(organizationId!, new Date(customDate).toISOString());
          if (!cancelled) setChartPoints([{ at: customDate, totalVolumeLiters: point.totalVolumeLiters }]);
          return;
        }

        const key = period === "custom" ? "now" : period;
        const count = CHART_SAMPLE_COUNTS[key];
        const span = CHART_SPAN_MS[key];
        const now = Date.now();
        const timestamps = Array.from({ length: count }, (_, i) => new Date(now - span * ((count - 1 - i) / (count - 1))));

        const points = await Promise.all(
          timestamps.map(async (t) => {
            try {
              const snapshot = await getNetworkSnapshot(organizationId!, t.toISOString());
              return { at: t.toISOString(), totalVolumeLiters: snapshot.totalVolumeLiters };
            } catch {
              return null;
            }
          })
        );
        if (!cancelled) setChartPoints(points.filter((p): p is ChartPoint => p !== null));
      } catch {
        if (!cancelled) setChartPoints([]);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }

    loadChart();
    return () => {
      cancelled = true;
    };
  }, [organizationId, period, customDate]);

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
    };
  });

  const totalCapacityLiters = tanks.filter((t) => t.active).reduce((sum, t) => sum + (t.calibratedCapacityLiters ?? t.capacityLiters), 0);

  const productCurrencies = new Set(products.map((p) => p.currencyCode).filter((c): c is string => c !== null));
  const totalMonetaryValue =
    productCurrencies.size === 1 && products.every((p) => p.monetaryValue !== null || p.volumeLiters === 0)
      ? products.reduce((sum, p) => sum + (p.monetaryValue ?? 0), 0)
      : null;
  const totalMonetaryCurrencyCode = productCurrencies.size === 1 ? [...productCurrencies][0] : null;

  const tankById = new Map(tanks.map((t) => [t.id, t]));
  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));

  const stationAggregates: StationAggregate[] = stations.map((station) => {
    const state = stationStates[station.id];
    const tankStates = state?.tanks ?? [];
    const online = tankStates.some((t) => t.sensorStatus === "online");
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
    error,
    stations,
    tanks,
    fuelProducts,
    networkSummary,
    products,
    totalCapacityLiters,
    totalMonetaryValue,
    totalMonetaryCurrencyCode,
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
