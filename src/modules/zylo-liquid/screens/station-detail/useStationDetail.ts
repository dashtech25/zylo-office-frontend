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
  listTanks,
  type Alert,
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

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // `getStation`/`listTanks` sont le cœur de cet écran : leur échec doit
      // faire échouer toute la page. Le reste (produits, alertes,
      // livraisons, fuites) est un COMPLÉMENT que certains rôles scopés
      // n'ont pas nécessairement (ex. un pompiste sans `alert.read`) — un
      // 403 dessus ne doit jamais masquer la station/les cuves que
      // l'utilisateur a le droit de voir (même principe que
      // `useStationsList.ts`, résout le point bloquant de `processus-double-
      // sources-verite/02-modele-double-source.md` §6).
      const emptyPage = { data: [], meta: { total: 0, limit: 0, offset: 0 } };
      const [stationData, tanksPage] = await Promise.all([getStation(organizationId, stationId), listTanks(organizationId, 100, stationId)]);
      const [fuelProductsPage, alertsPage, deliveriesPage, leakEventsPage, citiesPage] = await Promise.all([
        listFuelProducts(organizationId).catch(() => ({ ...emptyPage, data: [] as FuelProduct[] })),
        listAlerts(organizationId, { status: "active", stationId, limit: 20 }).catch(() => ({ ...emptyPage, data: [] as Alert[] })),
        listDeliveries(organizationId, { stationId, limit: 5 }).catch(() => ({ ...emptyPage, data: [] as Delivery[] })),
        listLeakEvents(organizationId, { stationId, limit: 5 }).catch(() => ({ ...emptyPage, data: [] as LeakEvent[] })),
        listCities(organizationId, { limit: 100 }).catch(() => ({ data: [] as City[], meta: { total: 0, limit: 0, offset: 0 } })),
      ]);
      setStation(stationData);
      setTanks(tanksPage.data);
      setFuelProducts(fuelProductsPage.data);
      setAlerts(alertsPage.data);
      setDeliveries(deliveriesPage.data);
      setLeakEvents(leakEventsPage.data);
      setCities(citiesPage.data);

      if (stationData.status === "active") {
        setCurrentState(await getStationCurrentState(organizationId, stationId).catch(() => null));
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
    reload: load,
  };
}
