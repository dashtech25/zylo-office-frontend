"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getStation,
  getTank,
  getTankCurrentState,
  listAlerts,
  listDeliveries,
  listFuelProducts,
  listLeakEvents,
  listTankCalibrationPoints,
  listTankMeasurements,
  listTankSensorMappings,
  type Alert,
  type CalibrationPoint,
  type Delivery,
  type FuelProduct,
  type LeakEvent,
  type Station,
  type Tank,
  type TankCurrentState,
  type TankMeasurement,
  type TankSensorMapping,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

const MEASUREMENTS_WINDOW_DAYS = 30;
const MEASUREMENTS_PAGE_SIZE = 100;
// Borne de sécurité — même principe que useDeliveryMeasurements.ts /
// useStationTrends.ts : évite une boucle non bornée si la fenêtre contient
// un volume de mesures anormalement élevé.
const MEASUREMENTS_MAX_PAGES = 30;

interface TankDetailData {
  station: Station;
  tank: Tank;
  state: TankCurrentState;
  fuelProducts: FuelProduct[];
  measurements: TankMeasurement[];
  alerts: Alert[];
  calibrationPoints: CalibrationPoint[];
  sensorMappings: TankSensorMapping[];
  deliveries: Delivery[];
  leakEvents: LeakEvent[];
}

async function fetchTankDetail(organizationId: string, stationId: string, tankId: string): Promise<TankDetailData> {
  // Cœur de l'écran (doit faire échouer toute la page en cas d'erreur) :
  // station, cuve, état courant, historique de mesures. Le reste (produits,
  // alertes, calibration, capteurs, livraisons, fuites) est un COMPLÉMENT
  // que certains rôles scopés n'ont pas nécessairement — même principe que
  // `useStationDetail.ts`/`useStationsList.ts`.
  const emptyPage = { data: [], meta: { total: 0, limit: 0, offset: 0 } };
  async function loadMeasurementWindow(): Promise<TankMeasurement[]> {
    const to = new Date();
    const from = new Date(to.getTime() - MEASUREMENTS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const all: TankMeasurement[] = [];
    let offset = 0;
    for (let page = 0; page < MEASUREMENTS_MAX_PAGES; page++) {
      const result = await listTankMeasurements(organizationId, tankId, { fromDate: from.toISOString(), toDate: to.toISOString(), limit: MEASUREMENTS_PAGE_SIZE, offset });
      all.push(...result.data);
      offset += result.data.length;
      if (offset >= result.meta.total || result.data.length === 0) break;
    }
    return all;
  }
  const [stationData, tankData, stateData, measurementsAll] = await Promise.all([
    getStation(organizationId, stationId),
    getTank(organizationId, tankId),
    getTankCurrentState(organizationId, tankId),
    loadMeasurementWindow(),
  ]);
  const [fuelProductsPage, alertsPage, calibrationData, mappingsPage, deliveriesPage, leakEventsPage] = await Promise.all([
    listFuelProducts(organizationId).catch(() => ({ ...emptyPage, data: [] as FuelProduct[] })),
    listAlerts(organizationId, { tankId, limit: 20 }).catch(() => ({ ...emptyPage, data: [] as Alert[] })),
    listTankCalibrationPoints(organizationId, tankId).catch(() => [] as CalibrationPoint[]),
    listTankSensorMappings(organizationId, tankId).catch(() => ({ ...emptyPage, data: [] as TankSensorMapping[] })),
    listDeliveries(organizationId, { tankId, limit: 5 }).catch(() => ({ ...emptyPage, data: [] as Delivery[] })),
    listLeakEvents(organizationId, { tankId, limit: 5 }).catch(() => ({ ...emptyPage, data: [] as LeakEvent[] })),
  ]);

  return {
    station: stationData,
    tank: tankData,
    state: stateData,
    fuelProducts: fuelProductsPage.data,
    measurements: measurementsAll,
    alerts: alertsPage.data,
    calibrationPoints: calibrationData,
    sensorMappings: mappingsPage.data,
    deliveries: deliveriesPage.data,
    leakEvents: leakEventsPage.data,
  };
}

/** Migré vers React Query (cache applicatif, cf. `QueryProvider`) — même
 * convention que `useStationDetail.ts` : revenir sur une cuve déjà
 * consultée récemment affiche instantanément la dernière donnée connue
 * (`staleTime` 60s) au lieu de tout recharger avec un spinner plein écran.
 * `reload()` reste explicite après toute action qui modifie l'état courant
 * (acquittement d'alerte, calibration, seuils) — jamais un polling
 * automatique. */
export function useTankDetail(organizationId: string | null, stationId: string, tankId: string) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "tank-detail", organizationId, stationId, tankId],
    queryFn: () => fetchTankDetail(organizationId as string, stationId, tankId),
    enabled: !!organizationId,
  });

  const data = query.data;
  const fuelProducts = data?.fuelProducts ?? [];
  const tank = data?.tank ?? null;
  const fuelProduct = tank ? fuelProducts.find((p) => p.id === tank.fuelProductId) ?? null : null;

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    station: data?.station ?? null,
    tank,
    state: data?.state ?? null,
    fuelProduct,
    measurements: data?.measurements ?? [],
    alerts: data?.alerts ?? [],
    calibrationPoints: data?.calibrationPoints ?? [],
    sensorMappings: data?.sensorMappings ?? [],
    deliveries: data?.deliveries ?? [],
    leakEvents: data?.leakEvents ?? [],
    reload: async () => {
      await query.refetch();
    },
  };
}
