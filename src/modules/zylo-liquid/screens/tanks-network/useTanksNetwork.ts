"use client";

import { useQuery } from "@tanstack/react-query";

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

interface TanksNetworkBaseData {
  stations: Station[];
  tanks: Tank[];
  fuelProducts: FuelProduct[];
}

async function fetchTanksNetworkBase(organizationId: string): Promise<TanksNetworkBaseData> {
  const [stationsPage, tanksPage, fuelProductsPage] = await Promise.all([
    listStations(organizationId),
    listTanks(organizationId),
    listFuelProducts(organizationId),
  ]);
  return { stations: stationsPage.data, tanks: tanksPage.data, fuelProducts: fuelProductsPage.data };
}

async function fetchStationStates(organizationId: string, activeStationIds: string[]): Promise<Record<string, StationCurrentState>> {
  const states = await Promise.all(activeStationIds.map((id) => getStationCurrentState(organizationId, id)));
  const byStation: Record<string, StationCurrentState> = {};
  activeStationIds.forEach((id, i) => {
    byStation[id] = states[i];
  });
  return byStation;
}

/** Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * revenir sur cette page après l'avoir quittée affiche instantanément la
 * dernière donnée connue au lieu de tout recharger. Deux requêtes plutôt
 * qu'une seule : la base réseau (stations/cuves/produits) et les états
 * courants des stations actives, qui dépend de la liste de stations de la
 * base (`enabled`) — cf. `useNetworkDashboard` pour le même découpage. */
export function useTanksNetwork(organizationId: string | null) {
  const baseQuery = useQuery({
    queryKey: ["zylo-liquid", "tanks-network", "base", organizationId],
    queryFn: () => fetchTanksNetworkBase(organizationId as string),
    enabled: !!organizationId,
  });

  const stations = baseQuery.data?.stations ?? [];
  const activeStationIds = stations.filter((s) => s.status === "active").map((s) => s.id);

  const statesQuery = useQuery({
    queryKey: ["zylo-liquid", "tanks-network", "station-states", organizationId, activeStationIds],
    queryFn: () => fetchStationStates(organizationId as string, activeStationIds),
    enabled: !!organizationId && !!baseQuery.data,
  });

  const loading = !!organizationId && (baseQuery.isPending || statesQuery.isPending);
  const error = baseQuery.error
    ? baseQuery.error instanceof Error
      ? baseQuery.error.message
      : String(baseQuery.error)
    : statesQuery.error
      ? statesQuery.error instanceof Error
        ? statesQuery.error.message
        : String(statesQuery.error)
      : null;

  const tanks = baseQuery.data?.tanks ?? [];
  const fuelProducts = baseQuery.data?.fuelProducts ?? [];
  const statesByStation = statesQuery.data ?? {};

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

  return {
    loading,
    error,
    stations,
    tanks,
    fuelProducts,
    rows,
    reload: async () => {
      await Promise.all([baseQuery.refetch(), statesQuery.refetch()]);
    },
  };
}
