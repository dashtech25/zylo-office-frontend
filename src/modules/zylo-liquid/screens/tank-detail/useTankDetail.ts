"use client";

import { useCallback, useEffect, useState } from "react";

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

export function useTankDetail(organizationId: string | null, stationId: string, tankId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [tank, setTank] = useState<Tank | null>(null);
  const [state, setState] = useState<TankCurrentState | null>(null);
  const [fuelProducts, setFuelProducts] = useState<FuelProduct[]>([]);
  const [measurements, setMeasurements] = useState<TankMeasurement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>([]);
  const [sensorMappings, setSensorMappings] = useState<TankSensorMapping[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [leakEvents, setLeakEvents] = useState<LeakEvent[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Cœur de l'écran (doit faire échouer toute la page en cas d'erreur) :
      // station, cuve, état courant, historique de mesures. Le reste
      // (produits, alertes, calibration, capteurs, livraisons, fuites) est
      // un COMPLÉMENT que certains rôles scopés n'ont pas nécessairement —
      // même principe que `useStationDetail.ts`/`useStationsList.ts`.
      const emptyPage = { data: [], meta: { total: 0, limit: 0, offset: 0 } };
      async function loadMeasurementWindow(): Promise<TankMeasurement[]> {
        const to = new Date();
        const from = new Date(to.getTime() - MEASUREMENTS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const all: TankMeasurement[] = [];
        let offset = 0;
        for (let page = 0; page < MEASUREMENTS_MAX_PAGES; page++) {
          const result = await listTankMeasurements(organizationId!, tankId, { fromDate: from.toISOString(), toDate: to.toISOString(), limit: MEASUREMENTS_PAGE_SIZE, offset });
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
      setStation(stationData);
      setTank(tankData);
      setState(stateData);
      setFuelProducts(fuelProductsPage.data);
      setMeasurements(measurementsAll);
      setAlerts(alertsPage.data);
      setCalibrationPoints(calibrationData);
      setSensorMappings(mappingsPage.data);
      setDeliveries(deliveriesPage.data);
      setLeakEvents(leakEventsPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId, stationId, tankId]);

  useEffect(() => {
    load();
  }, [load]);

  const fuelProduct = tank ? fuelProducts.find((p) => p.id === tank.fuelProductId) ?? null : null;

  return { loading, error, station, tank, state, fuelProduct, measurements, alerts, calibrationPoints, sensorMappings, deliveries, leakEvents, reload: load };
}
