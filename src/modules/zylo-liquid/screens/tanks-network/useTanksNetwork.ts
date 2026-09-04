"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getStationCurrentState,
  listFuelProducts,
  listStations,
  listTanks,
  type FuelProduct,
  type Station,
  type StationCurrentState,
  type Tank,
  type TankCurrentState,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

export interface TankRow {
  tank: Tank;
  station: Station;
  fuelProduct: FuelProduct | null;
  state: TankCurrentState | null;
}

export function useTanksNetwork(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelProducts, setFuelProducts] = useState<FuelProduct[]>([]);
  const [statesByStation, setStatesByStation] = useState<Record<string, StationCurrentState>>({});

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [stationsPage, tanksPage, fuelProductsPage] = await Promise.all([
        listStations(organizationId),
        listTanks(organizationId),
        listFuelProducts(organizationId),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const stationById = new Map(stations.map((s) => [s.id, s]));
  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));

  const rows: TankRow[] = tanks
    .filter((tank) => tank.active)
    .map((tank) => {
      const station = stationById.get(tank.stationId);
      const state = statesByStation[tank.stationId]?.tanks.find((s) => s.tankId === tank.id) ?? null;
      return station ? { tank, station, fuelProduct: fuelProductById.get(tank.fuelProductId) ?? null, state } : null;
    })
    .filter((row): row is TankRow => row !== null);

  return { loading, error, stations, tanks, fuelProducts, rows, reload: load };
}
