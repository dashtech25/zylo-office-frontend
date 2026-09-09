"use client";

import { useQuery } from "@tanstack/react-query";

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

interface StationDetailData {
  station: Station;
  tanks: Tank[];
  fuelProducts: FuelProduct[];
  currentState: StationCurrentState | null;
  alerts: Alert[];
  deliveries: Delivery[];
  leakEvents: LeakEvent[];
  cities: City[];
}

async function fetchStationDetail(organizationId: string, stationId: string): Promise<StationDetailData> {
  // `getStation`/`listTanks` sont le cœur de cet écran : leur échec doit
  // faire échouer toute la page. Le reste (produits, alertes, livraisons,
  // fuites) est un COMPLÉMENT que certains rôles scopés n'ont pas
  // nécessairement (ex. un pompiste sans `alert.read`) — un 403 dessus ne
  // doit jamais masquer la station/les cuves que l'utilisateur a le droit
  // de voir (même principe que `useStationsList.ts`, résout le point
  // bloquant de `processus-double-sources-verite/02-modele-double-source.md`
  // §6).
  const [stationData, tanksPage] = await Promise.all([getStation(organizationId, stationId), listTanks(organizationId, 100, stationId)]);
  const [fuelProductsPage, alertsPage, deliveriesPage, leakEventsPage, citiesPage] = await Promise.all([
    listFuelProducts(organizationId).catch(() => ({ data: [] as FuelProduct[] })),
    listAlerts(organizationId, { status: "active", stationId, limit: 20 }).catch(() => ({ data: [] as Alert[] })),
    listDeliveries(organizationId, { stationId, limit: 5 }).catch(() => ({ data: [] as Delivery[] })),
    listLeakEvents(organizationId, { stationId, limit: 5 }).catch(() => ({ data: [] as LeakEvent[] })),
    listCities(organizationId, { limit: 100 }).catch(() => ({ data: [] as City[] })),
  ]);
  const currentState = stationData.status === "active" ? await getStationCurrentState(organizationId, stationId).catch(() => null) : null;

  return {
    station: stationData,
    tanks: tanksPage.data,
    fuelProducts: fuelProductsPage.data,
    currentState,
    alerts: alertsPage.data,
    deliveries: deliveriesPage.data,
    leakEvents: leakEventsPage.data,
    cities: citiesPage.data,
  };
}

/** Migré vers React Query (cache applicatif, cf. `QueryProvider`) — revenir
 * sur une station déjà consultée récemment affiche instantanément la
 * dernière donnée connue (`staleTime` 60s) au lieu de tout recharger,
 * pendant qu'une revalidation silencieuse se fait derrière. `currentState`
 * (état temps réel des cuves) reste rafraîchi via `reload()` explicite
 * après toute action qui le modifie — jamais un polling automatique
 * agressif qui alourdirait une base distante déjà lente. */
export function useStationDetail(organizationId: string | null, stationId: string) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "station-detail", organizationId, stationId],
    queryFn: () => fetchStationDetail(organizationId as string, stationId),
    enabled: !!organizationId,
  });

  const data = query.data;
  const fuelProductById = new Map((data?.fuelProducts ?? []).map((p) => [p.id, p]));
  const tankStateById = new Map((data?.currentState?.tanks ?? []).map((s) => [s.tankId, s]));

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    station: data?.station ?? null,
    tanks: data?.tanks ?? [],
    fuelProducts: data?.fuelProducts ?? [],
    fuelProductById,
    currentState: data?.currentState ?? null,
    tankStateById,
    alerts: data?.alerts ?? [],
    deliveries: data?.deliveries ?? [],
    leakEvents: data?.leakEvents ?? [],
    cities: data?.cities ?? [],
    reload: async () => {
      await query.refetch();
    },
  };
}
