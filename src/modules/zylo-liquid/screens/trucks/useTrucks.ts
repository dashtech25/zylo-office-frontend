"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCarrier,
  createGpsDevice,
  createTruck,
  getGpsIngestCredential,
  listCarriers,
  listGpsDevices,
  listTruckCurrentPositions,
  listTruckPositions,
  listTruckStops,
  listTrucks,
  regenerateGpsIngestCredential,
  updateCarrier,
  updateGpsDevice,
  updateTruck,
  type Carrier,
  type CreateCarrierInput,
  type CreateGpsDeviceInput,
  type CreateTruckInput,
  type GpsDevice,
  type Truck,
  type TruckCurrentPosition,
  type TruckPositionPing,
  type TruckStopEvent,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchTrucksData(organizationId: string) {
  const [trucksPage, carriersPage, devicesPage, currentPositions] = await Promise.all([
    listTrucks(organizationId, { limit: 100 }),
    listCarriers(organizationId, { limit: 100 }),
    listGpsDevices(organizationId, { limit: 100 }),
    listTruckCurrentPositions(organizationId).catch(() => [] as TruckCurrentPosition[]),
  ]);
  return {
    trucks: trucksPage.data,
    carriers: carriersPage.data,
    gpsDevices: devicesPage.data,
    currentPositions,
  };
}

/** Référentiel Camions/Transporteurs + tracking GPS (mission « tracking »,
 * étape 1 — position + arrêts sur carte, 2026-09-11). Un camion n'est
 * rattaché à aucune station précise (il en dessert plusieurs) — écran
 * réseau, pas un onglet du Centre administratif d'une station. */
export function useTrucks(organizationId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["zylo-liquid", "trucks", organizationId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTrucksData(organizationId as string),
    enabled: !!organizationId,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  async function addTruck(data: CreateTruckInput): Promise<Truck | null> {
    if (!organizationId) return null;
    const truck = await createTruck(organizationId, data);
    await invalidate();
    return truck;
  }

  async function editTruck(truckId: string, data: Partial<CreateTruckInput>): Promise<Truck | null> {
    if (!organizationId) return null;
    const truck = await updateTruck(organizationId, truckId, data);
    await invalidate();
    return truck;
  }

  async function addCarrier(data: CreateCarrierInput): Promise<Carrier | null> {
    if (!organizationId) return null;
    const carrier = await createCarrier(organizationId, data);
    await invalidate();
    return carrier;
  }

  async function editCarrier(carrierId: string, data: Partial<CreateCarrierInput> & { active?: boolean }): Promise<Carrier | null> {
    if (!organizationId) return null;
    const carrier = await updateCarrier(organizationId, carrierId, data);
    await invalidate();
    return carrier;
  }

  async function addGpsDevice(data: CreateGpsDeviceInput): Promise<GpsDevice | null> {
    if (!organizationId) return null;
    const device = await createGpsDevice(organizationId, data);
    await invalidate();
    return device;
  }

  async function editGpsDevice(deviceId: string, data: Partial<CreateGpsDeviceInput> & { active?: boolean }): Promise<GpsDevice | null> {
    if (!organizationId) return null;
    const device = await updateGpsDevice(organizationId, deviceId, data);
    await invalidate();
    return device;
  }

  async function fetchTruckPositions(truckId: string, params: { since?: string; until?: string } = {}): Promise<TruckPositionPing[]> {
    if (!organizationId) return [];
    return listTruckPositions(organizationId, truckId, params);
  }

  async function fetchTruckStops(truckId: string, params: { since?: string; until?: string } = {}): Promise<TruckStopEvent[]> {
    if (!organizationId) return [];
    return listTruckStops(organizationId, truckId, params);
  }

  async function fetchIngestCredential(): Promise<string | null> {
    if (!organizationId) return null;
    const { secretToken } = await getGpsIngestCredential(organizationId);
    return secretToken;
  }

  async function regenerateIngestCredential(): Promise<string | null> {
    if (!organizationId) return null;
    const { secretToken } = await regenerateGpsIngestCredential(organizationId);
    return secretToken;
  }

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    trucks: query.data?.trucks ?? [],
    carriers: query.data?.carriers ?? [],
    gpsDevices: query.data?.gpsDevices ?? [],
    currentPositions: query.data?.currentPositions ?? [],
    addTruck,
    editTruck,
    addCarrier,
    editCarrier,
    addGpsDevice,
    editGpsDevice,
    fetchTruckPositions,
    fetchTruckStops,
    fetchIngestCredential,
    regenerateIngestCredential,
    reload: invalidate,
  };
}
