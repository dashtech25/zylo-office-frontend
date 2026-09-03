"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listDeliveries,
  listFuelProducts,
  listStations,
  listTanks,
  type Delivery,
  type FuelProduct,
  type Station,
  type Tank,
} from "@/core/api/zyloLiquid";

export interface DeliveryRow {
  delivery: Delivery;
  tank: Tank | null;
  station: Station | null;
  fuelProduct: FuelProduct | null;
}

export function useDeliveriesList(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
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
      const [deliveriesPage, tanksPage, stationsPage, fuelProductsPage] = await Promise.all([
        listDeliveries(organizationId, { limit: 100 }),
        listTanks(organizationId),
        listStations(organizationId),
        listFuelProducts(organizationId),
      ]);
      setDeliveries(deliveriesPage.data);
      setTanks(tanksPage.data);
      setStations(stationsPage.data);
      setFuelProducts(fuelProductsPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const tankById = new Map(tanks.map((t) => [t.id, t]));
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));

  const rows: DeliveryRow[] = deliveries
    .map((delivery) => {
      const tank = tankById.get(delivery.tankId) ?? null;
      return {
        delivery,
        tank,
        station: stationById.get(delivery.stationId) ?? null,
        fuelProduct: tank ? fuelProductById.get(tank.fuelProductId) ?? null : null,
      };
    })
    .sort((a, b) => (a.delivery.endTime < b.delivery.endTime ? 1 : -1));

  const totalVolumeLiters = deliveries.reduce((sum, d) => sum + (d.volumeLiters ?? 0), 0);

  return { loading, error, rows, stations, fuelProducts, totalVolumeLiters, reload: load };
}
