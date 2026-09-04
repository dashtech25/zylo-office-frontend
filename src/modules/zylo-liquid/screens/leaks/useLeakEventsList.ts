"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listFuelProducts,
  listLeakEvents,
  listStations,
  listTanks,
  type FuelProduct,
  type LeakEvent,
  type Station,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

export interface LeakEventRow {
  leak: LeakEvent;
  tank: Tank | null;
  station: Station | null;
  fuelProduct: FuelProduct | null;
}

export function useLeakEventsList(organizationId: string | null, stationId?: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaks, setLeaks] = useState<LeakEvent[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [fuelProducts, setFuelProducts] = useState<FuelProduct[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [leaksPage, tanksPage, stationsPage, fuelProductsPage] = await Promise.all([
        listLeakEvents(organizationId, { stationId, limit: 100 }),
        listTanks(organizationId),
        listStations(organizationId),
        listFuelProducts(organizationId),
      ]);
      setLeaks(leaksPage.data);
      setTanks(tanksPage.data);
      setStations(stationsPage.data);
      setFuelProducts(fuelProductsPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId, stationId]);

  useEffect(() => {
    load();
  }, [load]);

  const tankById = new Map(tanks.map((t) => [t.id, t]));
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));

  const rows: LeakEventRow[] = leaks
    .map((leak) => {
      const tank = tankById.get(leak.tankId) ?? null;
      return {
        leak,
        tank,
        station: stationById.get(leak.stationId) ?? null,
        fuelProduct: tank ? fuelProductById.get(tank.fuelProductId) ?? null : null,
      };
    })
    .sort((a, b) => (a.leak.endTime < b.leak.endTime ? 1 : -1));

  const anomalyCount = leaks.filter((l) => l.result === "anomaly").length;

  return { loading, error, rows, anomalyCount, reload: load };
}
