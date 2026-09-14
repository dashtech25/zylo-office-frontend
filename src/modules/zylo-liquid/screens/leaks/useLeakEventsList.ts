"use client";

import { useQuery } from "@tanstack/react-query";

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

interface LeakEventsListData {
  leaks: LeakEvent[];
  tanks: Tank[];
  stations: Station[];
  fuelProducts: FuelProduct[];
}

async function fetchLeakEventsList(organizationId: string, stationId: string | undefined, tankId: string | undefined): Promise<LeakEventsListData> {
  const [leaksPage, tanksPage, stationsPage, fuelProductsPage] = await Promise.all([
    listLeakEvents(organizationId, { stationId, tankId, limit: 100 }),
    listTanks(organizationId),
    listStations(organizationId),
    listFuelProducts(organizationId),
  ]);
  return { leaks: leaksPage.data, tanks: tanksPage.data, stations: stationsPage.data, fuelProducts: fuelProductsPage.data };
}

/** Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * revenir sur cette liste après l'avoir quittée affiche instantanément la
 * dernière donnée connue au lieu de tout recharger. Utilisé aussi bien par
 * la page globale que par `LeaksBrowserModal` (scope station/cuve) —
 * `stationId`/`tankId` font entièrement partie de la clé de requête pour ne
 * jamais partager le cache entre deux scopes différents. */
export function useLeakEventsList(organizationId: string | null, stationId?: string, tankId?: string) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "leak-events-list", organizationId, stationId, tankId],
    queryFn: () => fetchLeakEventsList(organizationId as string, stationId, tankId),
    enabled: !!organizationId,
  });

  const leaks = query.data?.leaks ?? [];
  const tanks = query.data?.tanks ?? [];
  const stations = query.data?.stations ?? [];
  const fuelProducts = query.data?.fuelProducts ?? [];
  const loading = !!organizationId && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

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

  return {
    loading,
    error,
    rows,
    anomalyCount,
    reload: async () => {
      await query.refetch();
    },
  };
}
