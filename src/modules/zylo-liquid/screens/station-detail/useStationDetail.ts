"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getStation,
  getStationCurrentState,
  listAlerts,
  listCities,
  listDeliveries,
  listFuelProducts,
  listLeakEvents,
  listTankCalibrationPoints,
  listTanks,
  type Alert,
  type CalibrationPoint,
  type City,
  type Delivery,
  type FuelProduct,
  type LeakEvent,
  type Station,
  type StationCurrentState,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

export function useStationDetail(organizationId: string | null, stationId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelProducts, setFuelProducts] = useState<FuelProduct[]>([]);
  const [currentState, setCurrentState] = useState<StationCurrentState | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [leakEvents, setLeakEvents] = useState<LeakEvent[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [calibrationByTank, setCalibrationByTank] = useState<Record<string, CalibrationPoint[]>>({});

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [stationData, tanksPage, fuelProductsPage, alertsPage, deliveriesPage, leakEventsPage, citiesPage] = await Promise.all([
        getStation(organizationId, stationId),
        listTanks(organizationId, 100, stationId),
        listFuelProducts(organizationId),
        listAlerts(organizationId, { status: "active", stationId, limit: 20 }),
        listDeliveries(organizationId, { stationId, limit: 5 }),
        listLeakEvents(organizationId, { stationId, limit: 5 }),
        listCities(organizationId, { limit: 100 }).catch(() => ({ data: [] as City[], meta: { total: 0, limit: 0, offset: 0 } })),
      ]);
      setStation(stationData);
      setTanks(tanksPage.data);
      setFuelProducts(fuelProductsPage.data);
      setAlerts(alertsPage.data);
      setDeliveries(deliveriesPage.data);
      setLeakEvents(leakEventsPage.data);
      setCities(citiesPage.data);

      const activeTanks = tanksPage.data.filter((tk) => tk.active);
      const calibrationLists = await Promise.all(activeTanks.map((tk) => listTankCalibrationPoints(organizationId, tk.id).catch(() => [] as CalibrationPoint[])));
      const calibrationMap: Record<string, CalibrationPoint[]> = {};
      activeTanks.forEach((tk, i) => {
        calibrationMap[tk.id] = calibrationLists[i];
      });
      setCalibrationByTank(calibrationMap);

      if (stationData.status === "active") {
        setCurrentState(await getStationCurrentState(organizationId, stationId));
      } else {
        setCurrentState(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId, stationId]);

  useEffect(() => {
    load();
  }, [load]);

  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));
  const tankStateById = new Map((currentState?.tanks ?? []).map((s) => [s.tankId, s]));

  return {
    loading,
    error,
    station,
    tanks,
    fuelProducts,
    fuelProductById,
    currentState,
    tankStateById,
    alerts,
    deliveries,
    leakEvents,
    cities,
    calibrationByTank,
    reload: load,
  };
}
