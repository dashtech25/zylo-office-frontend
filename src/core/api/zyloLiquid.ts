import { apiFetch } from "@/core/api/client";
import type { Page } from "@/core/api/types";

export interface Station {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  cityId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  openingTime: string;
  closingTime: string;
  is24h: boolean;
  status: "active" | "maintenance" | "inactive";
  activeTankCount: number;
}

export interface CreateStationInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  openingTime?: string;
  closingTime?: string;
  is24h?: boolean;
}

export interface Tank {
  id: string;
  stationId: string;
  fuelProductId: string;
  tankNumber: number;
  displayName: string;
  capacityLiters: number;
  calibratedCapacityLiters: number | null;
  tankHeightMm: number | null;
  active: boolean;
}

export interface FuelProduct {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  displayColor: string | null;
  active: boolean;
}

export interface TankCurrentState {
  tankId: string;
  tankNumber: number;
  displayName: string;
  sensorStatus: "online" | "offline" | "not_configured";
  heightMm: number | null;
  volumeLiters: number | null;
  volumeNotCalculableReason: string | null;
  lastMeasurementAt: string | null;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
}

export interface StationCurrentState {
  stationId: string;
  tanks: TankCurrentState[];
}

export interface NetworkSummaryProductLine {
  fuelProductId: string;
  fuelProductName: string;
  totalVolumeLiters: number;
  stationCount: number;
  tankCount: number;
  totalMonetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
}

export interface NetworkSummary {
  products: NetworkSummaryProductLine[];
  totalVolumeLiters: number;
  totalStationCount: number;
  totalTankCount: number;
}

export type AlertType = "level_high" | "level_high_pre_alarm" | "level_low" | "water" | "leak" | "sensor_offline";

export interface Alert {
  id: string;
  tankId: string;
  stationId: string;
  type: AlertType;
  status: "active" | "resolved";
  triggeredAt: string;
  triggeredValue: number | null;
  thresholdValue: number | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface Delivery {
  id: string;
  tankId: string;
  stationId: string;
  startTime: string;
  startHeightMm: number;
  endTime: string;
  endHeightMm: number;
  volumeLiters: number | null;
}

export interface LeakEvent {
  id: string;
  tankId: string;
  stationId: string;
  startTime: string;
  endTime: string;
  leakRateLph: number | null;
  result: "normal" | "anomaly";
}

function withOrg(organizationId: string) {
  return { organizationId };
}

export function listStations(organizationId: string, limit = 100): Promise<Page<Station>> {
  return apiFetch<Page<Station>>(`/zylo-liquid/stations?limit=${limit}`, withOrg(organizationId));
}

export function getStation(organizationId: string, stationId: string): Promise<Station> {
  return apiFetch<Station>(`/zylo-liquid/stations/${stationId}`, withOrg(organizationId));
}

export function createStation(organizationId: string, data: CreateStationInput): Promise<Station> {
  return apiFetch<Station>("/zylo-liquid/stations", {
    method: "POST",
    organizationId,
    body: JSON.stringify(data),
  });
}

export function listTanks(organizationId: string, limit = 100): Promise<Page<Tank>> {
  return apiFetch<Page<Tank>>(`/zylo-liquid/tanks?limit=${limit}`, withOrg(organizationId));
}

export function listFuelProducts(organizationId: string, limit = 50): Promise<Page<FuelProduct>> {
  return apiFetch<Page<FuelProduct>>(`/zylo-liquid/fuel-products?limit=${limit}`, withOrg(organizationId));
}

export function getNetworkSummary(organizationId: string): Promise<NetworkSummary> {
  return apiFetch<NetworkSummary>("/zylo-liquid/network/summary", withOrg(organizationId));
}

export function getNetworkSnapshot(organizationId: string, at: string): Promise<NetworkSummary> {
  return apiFetch<NetworkSummary>(`/zylo-liquid/network/snapshot?at=${encodeURIComponent(at)}`, withOrg(organizationId));
}

export function getStationCurrentState(organizationId: string, stationId: string): Promise<StationCurrentState> {
  return apiFetch<StationCurrentState>(`/zylo-liquid/stations/${stationId}/current-state`, withOrg(organizationId));
}

export function listAlerts(organizationId: string, params: { status?: string; limit?: number } = {}): Promise<Page<Alert>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  search.set("limit", String(params.limit ?? 20));
  return apiFetch<Page<Alert>>(`/zylo-liquid/alerts?${search.toString()}`, withOrg(organizationId));
}

export function listDeliveries(organizationId: string, limit = 10): Promise<Page<Delivery>> {
  return apiFetch<Page<Delivery>>(`/zylo-liquid/deliveries?limit=${limit}`, withOrg(organizationId));
}

export function listLeakEvents(organizationId: string, limit = 10): Promise<Page<LeakEvent>> {
  return apiFetch<Page<LeakEvent>>(`/zylo-liquid/leak-events?limit=${limit}`, withOrg(organizationId));
}
