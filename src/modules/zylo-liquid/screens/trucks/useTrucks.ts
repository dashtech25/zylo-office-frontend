"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assignTruckToPurchaseOrder,
  createCarrier,
  createGpsDevice,
  createTrackingLocation,
  createTruck,
  createTruckStopComment,
  deleteTrackingLocation,
  deleteTruckStopComment,
  getGpsIngestCredential,
  getTraccarConnection,
  getTrackingSettings,
  listCarriers,
  listGpsDevices,
  listTraccarDevices,
  listTrackingLocations,
  listTruckCurrentPositions,
  listTruckPositions,
  listTruckStopComments,
  listTruckStopReconciliations,
  listTruckStops,
  listTrucks,
  regenerateGpsIngestCredential,
  resolveTruckStopReconciliation,
  setTraccarConnection,
  unassignGpsDevice,
  unassignTruckFromPurchaseOrder,
  updateCarrier,
  updateGpsDevice,
  updateTrackingLocation,
  updateTruck,
  updateTruckStopComment,
  updateTrackingSettings,
  type Carrier,
  type CreateCarrierInput,
  type CreateGpsDeviceInput,
  type CreateTrackingLocationInput,
  type CreateTruckInput,
  type GpsDevice,
  type TraccarConnectionInput,
  type TrackingLocation,
  type TrackingSettings,
  type Truck,
  type TruckCurrentPosition,
  type TruckPositionPing,
  type TruckStopEvent,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchTrucksData(organizationId: string) {
  const [trucksPage, carriersPage, devicesPage, currentPositions, trackingLocations, reconciliations, traccarConnection] = await Promise.all([
    listTrucks(organizationId, { limit: 100 }),
    listCarriers(organizationId, { limit: 100 }),
    listGpsDevices(organizationId, { limit: 100 }),
    listTruckCurrentPositions(organizationId).catch(() => [] as TruckCurrentPosition[]),
    listTrackingLocations(organizationId).catch(() => [] as TrackingLocation[]),
    listTruckStopReconciliations(organizationId, "pending").catch(() => []),
    getTraccarConnection(organizationId).catch(() => null),
  ]);
  return {
    trucks: trucksPage.data,
    carriers: carriersPage.data,
    gpsDevices: devicesPage.data,
    currentPositions,
    trackingLocations,
    reconciliations,
    traccarConnection,
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

  async function removeGpsDeviceAssignment(deviceId: string): Promise<GpsDevice | null> {
    if (!organizationId) return null;
    const device = await unassignGpsDevice(organizationId, deviceId);
    await invalidate();
    return device;
  }

  async function fetchTraccarDeviceList() {
    if (!organizationId) return [];
    return listTraccarDevices(organizationId);
  }

  async function addTrackingLocation(data: CreateTrackingLocationInput): Promise<TrackingLocation | null> {
    if (!organizationId) return null;
    const location = await createTrackingLocation(organizationId, data);
    await invalidate();
    return location;
  }

  async function editTrackingLocation(locationId: string, data: Partial<CreateTrackingLocationInput>): Promise<TrackingLocation | null> {
    if (!organizationId) return null;
    const location = await updateTrackingLocation(organizationId, locationId, data);
    await invalidate();
    return location;
  }

  async function removeTrackingLocation(locationId: string): Promise<void> {
    if (!organizationId) return;
    await deleteTrackingLocation(organizationId, locationId);
    await invalidate();
  }

  async function resolveReconciliation(reconciliationId: string, locationId: string | null) {
    if (!organizationId) return null;
    const result = await resolveTruckStopReconciliation(organizationId, reconciliationId, locationId);
    await invalidate();
    return result;
  }

  async function fetchStopComments(stopId: string) {
    if (!organizationId) return [];
    return listTruckStopComments(organizationId, stopId);
  }

  async function addStopComment(stopId: string, body: string) {
    if (!organizationId) return null;
    return createTruckStopComment(organizationId, stopId, body);
  }

  async function editStopComment(commentId: string, body: string) {
    if (!organizationId) return null;
    return updateTruckStopComment(organizationId, commentId, body);
  }

  async function removeStopComment(commentId: string) {
    if (!organizationId) return;
    await deleteTruckStopComment(organizationId, commentId);
  }

  async function saveTraccarConnection(data: TraccarConnectionInput) {
    if (!organizationId) return null;
    const result = await setTraccarConnection(organizationId, data);
    await invalidate();
    return result;
  }

  async function fetchTrackingSettings(): Promise<TrackingSettings | null> {
    if (!organizationId) return null;
    return getTrackingSettings(organizationId);
  }

  async function saveTrackingSettings(data: Partial<Omit<TrackingSettings, "organizationId">>): Promise<TrackingSettings | null> {
    if (!organizationId) return null;
    return updateTrackingSettings(organizationId, data);
  }

  async function assignTruckToOrder(purchaseOrderId: string, truckId: string) {
    if (!organizationId) return null;
    return assignTruckToPurchaseOrder(organizationId, purchaseOrderId, truckId);
  }

  async function unassignTruckFromOrder(purchaseOrderId: string, truckId: string) {
    if (!organizationId) return;
    await unassignTruckFromPurchaseOrder(organizationId, purchaseOrderId, truckId);
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
    trackingLocations: query.data?.trackingLocations ?? [],
    reconciliations: query.data?.reconciliations ?? [],
    traccarConnection: query.data?.traccarConnection ?? null,
    addTruck,
    editTruck,
    addCarrier,
    editCarrier,
    addGpsDevice,
    editGpsDevice,
    removeGpsDeviceAssignment,
    fetchTraccarDeviceList,
    addTrackingLocation,
    editTrackingLocation,
    removeTrackingLocation,
    resolveReconciliation,
    fetchStopComments,
    addStopComment,
    editStopComment,
    removeStopComment,
    saveTraccarConnection,
    fetchTrackingSettings,
    saveTrackingSettings,
    assignTruckToOrder,
    unassignTruckFromOrder,
    fetchTruckPositions,
    fetchTruckStops,
    fetchIngestCredential,
    regenerateIngestCredential,
    reload: invalidate,
  };
}
