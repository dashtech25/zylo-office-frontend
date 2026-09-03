"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getNetworkSummary,
  getStationCurrentState,
  listAlerts,
  listFuelProducts,
  listStations,
  listTanks,
  type Alert,
  type FuelProduct,
  type NetworkSummary,
  type Station,
  type StationCurrentState,
  type Tank,
} from "@/core/api/zyloLiquid";

export interface StationProductBreakdown {
  fuelProductId: string;
  fuelProductName: string;
  displayColor: string | null;
  tankCount: number;
  volumeLiters: number;
  capacityLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
}

export interface StationRow {
  station: Station;
  online: boolean;
  lastMeasurementAt: string | null;
  products: StationProductBreakdown[];
  totalVolumeLiters: number;
  totalCapacityLiters: number;
  totalValue: number | null;
  totalCurrencyCode: string | null;
}

export function useStationsList(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelProducts, setFuelProducts] = useState<FuelProduct[]>([]);
  const [statesByStation, setStatesByStation] = useState<Record<string, StationCurrentState>>({});
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [networkSummary, setNetworkSummary] = useState<NetworkSummary | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [stationsPage, tanksPage, fuelProductsPage, alertsPage, summary] = await Promise.all([
        listStations(organizationId),
        listTanks(organizationId),
        listFuelProducts(organizationId),
        listAlerts(organizationId, { status: "active", limit: 100 }),
        getNetworkSummary(organizationId),
      ]);
      const activeStations = stationsPage.data.filter((s) => s.status === "active");
      const states = await Promise.all(activeStations.map((s) => getStationCurrentState(organizationId, s.id)));
      const byStation: Record<string, StationCurrentState> = {};
      activeStations.forEach((s, i) => {
        byStation[s.id] = states[i];
      });
      setStations(stationsPage.data);
      setTanks(tanksPage.data);
      setFuelProducts(fuelProductsPage.data);
      setStatesByStation(byStation);
      setActiveAlertsCount(alertsPage.meta.total);
      setActiveAlerts(alertsPage.data);
      setNetworkSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));
  const tankById = new Map(tanks.map((t) => [t.id, t]));

  const rows: StationRow[] = stations.map((station) => {
    const state = statesByStation[station.id];
    const tankStates = state?.tanks ?? [];
    const online = tankStates.some((t) => t.sensorStatus === "online");

    const byProduct = new Map<string, StationProductBreakdown>();
    let lastMeasurementAt: string | null = null;

    for (const tankState of tankStates) {
      const tank = tankById.get(tankState.tankId);
      if (!tank) continue;
      const product = fuelProductById.get(tank.fuelProductId);
      const key = tank.fuelProductId;
      const entry =
        byProduct.get(key) ??
        ({
          fuelProductId: key,
          fuelProductName: product?.name ?? "?",
          displayColor: product?.displayColor ?? null,
          tankCount: 0,
          volumeLiters: 0,
          capacityLiters: 0,
          monetaryValue: 0,
          currencyCode: null,
        } satisfies StationProductBreakdown);

      entry.tankCount += 1;
      entry.volumeLiters += tankState.volumeLiters ?? 0;
      entry.capacityLiters += tank.calibratedCapacityLiters ?? tank.capacityLiters;
      if (tankState.monetaryValue !== null && tankState.currencyCode) {
        entry.monetaryValue = (entry.monetaryValue ?? 0) + tankState.monetaryValue;
        entry.currencyCode = tankState.currencyCode;
      }
      byProduct.set(key, entry);

      if (tankState.lastMeasurementAt && (!lastMeasurementAt || tankState.lastMeasurementAt > lastMeasurementAt)) {
        lastMeasurementAt = tankState.lastMeasurementAt;
      }
    }

    const products = [...byProduct.values()];
    const totalVolumeLiters = products.reduce((sum, p) => sum + p.volumeLiters, 0);
    const totalCapacityLiters = tanks
      .filter((t) => t.stationId === station.id && t.active)
      .reduce((sum, t) => sum + (t.calibratedCapacityLiters ?? t.capacityLiters), 0);
    const currencies = new Set(products.map((p) => p.currencyCode).filter((c): c is string => c !== null));
    const totalValue = currencies.size === 1 ? products.reduce((sum, p) => sum + (p.monetaryValue ?? 0), 0) : null;

    return {
      station,
      online,
      lastMeasurementAt,
      products,
      totalVolumeLiters,
      totalCapacityLiters,
      totalValue,
      totalCurrencyCode: currencies.size === 1 ? [...currencies][0] : null,
    };
  });

  const stationsActiveCount = stations.filter((s) => s.status === "active").length;
  const stationsOfflineCount = rows.filter((r) => r.station.status === "active" && !r.online).length;

  return {
    loading,
    error,
    rows,
    stations,
    tanks,
    activeAlertsCount,
    activeAlerts,
    stationsActiveCount,
    stationsOfflineCount,
    networkSummary,
    reload: load,
  };
}
