"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getNetworkSummary,
  getStationCurrentState,
  listAlerts,
  listCities,
  listCurrencies,
  listFuelProducts,
  listStations,
  listTanks,
  type Alert,
  type City,
  type Currency,
  type FuelProduct,
  type NetworkSummary,
  type Station,
  type StationCurrentState,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

export interface StationProductBreakdown {
  fuelProductId: string;
  fuelProductName: string;
  displayColor: string | null;
  tankCount: number;
  volumeLiters: number;
  capacityLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  /** Vrai si au moins une cuve de ce produit a atteint son seuil bas
   * (Tank.lowAlarmMm, comparé en hauteur nette comme le fait le backend
   * dans evaluate_threshold_alarms — jamais un pourcentage de capacité). */
  belowLowThreshold: boolean;
}

export interface StationRow {
  station: Station;
  online: boolean;
  state: "offline" | "critical" | "alert" | "online";
  alertsCount: number;
  lastMeasurementAt: string | null;
  products: StationProductBreakdown[];
  totalVolumeLiters: number;
  totalCapacityLiters: number;
  totalValue: number | null;
  totalCurrencyCode: string | null;
  pricingStatus: "complete" | "partial" | "none" | "mixed_currency";
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
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [stationsPage, tanksPage, fuelProductsPage, alertsPage, summary, citiesPage, currenciesPage] = await Promise.all([
        listStations(organizationId),
        listTanks(organizationId),
        listFuelProducts(organizationId),
        listAlerts(organizationId, { status: "active", limit: 100 }),
        getNetworkSummary(organizationId),
        listCities(organizationId, { limit: 100 }).catch(() => ({ data: [] as City[], meta: { total: 0, limit: 0, offset: 0 } })),
        listCurrencies(organizationId).catch(() => ({ data: [] as Currency[], meta: { total: 0, limit: 0, offset: 0 } })),
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
      setCities(citiesPage.data);
      setCurrencies(currenciesPage.data);
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
  const alertsByStation = new Map<string, Alert[]>();
  for (const alert of activeAlerts) {
    const list = alertsByStation.get(alert.stationId) ?? [];
    list.push(alert);
    alertsByStation.set(alert.stationId, list);
  }

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
          belowLowThreshold: false,
        } satisfies StationProductBreakdown);

      entry.tankCount += 1;
      entry.volumeLiters += tankState.volumeLiters ?? 0;
      entry.capacityLiters += tank.calibratedCapacityLiters ?? tank.capacityLiters;
      if (tankState.monetaryValue !== null && tankState.currencyCode) {
        entry.monetaryValue = (entry.monetaryValue ?? 0) + tankState.monetaryValue;
        entry.currencyCode = tankState.currencyCode;
      }
      if (tankState.heightMm !== null) {
        const netHeightMm = tankState.heightMm - (tankState.waterHeightMm ?? 0);
        if (netHeightMm <= tank.lowAlarmMm) entry.belowLowThreshold = true;
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
    const currencyCodes = new Set(products.map((p) => p.currencyCode).filter((c): c is string => c !== null));
    const pricedCount = products.filter((p) => p.currencyCode !== null).length;
    const pricingStatus: "complete" | "partial" | "none" | "mixed_currency" =
      currencyCodes.size > 1 ? "mixed_currency" : pricedCount === 0 ? "none" : pricedCount < products.length ? "partial" : "complete";
    const totalValue = currencyCodes.size === 1 ? products.reduce((sum, p) => sum + (p.monetaryValue ?? 0), 0) : null;

    const stationAlerts = alertsByStation.get(station.id) ?? [];
    const hasCriticalAlert = stationAlerts.some((a) => a.type === "leak" || a.type === "level_high");
    const rowState: "offline" | "critical" | "alert" | "online" = !online ? "offline" : hasCriticalAlert ? "critical" : stationAlerts.length > 0 ? "alert" : "online";

    return {
      station,
      online,
      state: rowState,
      alertsCount: stationAlerts.length,
      lastMeasurementAt,
      products,
      totalVolumeLiters,
      totalCapacityLiters,
      totalValue,
      totalCurrencyCode: currencyCodes.size === 1 ? [...currencyCodes][0] : null,
      pricingStatus,
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
    fuelProducts,
    cities,
    currencies,
    activeAlertsCount,
    activeAlerts,
    stationsActiveCount,
    stationsOfflineCount,
    networkSummary,
    reload: load,
  };
}
