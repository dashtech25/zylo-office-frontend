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
      const [stationData, tankData, stateData, fuelProductsPage, measurementsPage, alertsPage, calibrationData, mappingsPage, deliveriesPage, leakEventsPage] = await Promise.all([
        getStation(organizationId, stationId),
        getTank(organizationId, tankId),
        getTankCurrentState(organizationId, tankId),
        listFuelProducts(organizationId),
        listTankMeasurements(organizationId, tankId, { limit: 100 }),
        listAlerts(organizationId, { tankId, limit: 20 }),
        listTankCalibrationPoints(organizationId, tankId),
        listTankSensorMappings(organizationId, tankId),
        listDeliveries(organizationId, { tankId, limit: 5 }),
        listLeakEvents(organizationId, { tankId, limit: 5 }),
      ]);
      setStation(stationData);
      setTank(tankData);
      setState(stateData);
      setFuelProducts(fuelProductsPage.data);
      setMeasurements(measurementsPage.data);
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
