import { apiFetch } from "@/core/api/client";
import type { Page } from "@/core/api/types";

export interface Station {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  cityId: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  openingTime: string;
  closingTime: string;
  is24h: boolean;
  status: "active" | "maintenance" | "inactive";
  activeTankCount: number;
  exploitationType: string;
}

export interface CreateStationInput {
  name: string;
  code: string;
  cityId?: string;
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
  heightAlarmMm: number;
  heightAlertMm: number;
  lowAlarmMm: number;
  alertWaterMaxMm: number;
  active: boolean;
}

export interface CreateTankInput {
  stationId: string;
  tankNumber: number;
  displayName: string;
  capacityLiters: number;
  tankHeightMm: number;
  fuelProductId?: string;
  newFuelProductName?: string;
  newFuelProductCode?: string;
  heightAlarmMm: number;
  heightAlertMm: number;
  lowAlarmMm: number;
  alertWaterMaxMm?: number;
}

export interface FuelProduct {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  densityGPerCm3: number | null;
  thermalExpansionCoefficient: number | null;
  currentPriceFcfa: number | null;
  currentCostFcfa: number | null;
  displayColor: string | null;
  active: boolean;
}

export interface CreateFuelProductInput {
  name: string;
  code: string;
  densityGPerCm3?: number;
  currentPriceFcfa?: number;
  currentCostFcfa?: number;
  displayColor?: string;
}

export interface UpdateFuelProductInput {
  name?: string;
  densityGPerCm3?: number;
  currentPriceFcfa?: number;
  currentCostFcfa?: number;
  displayColor?: string;
  active?: boolean;
}

export interface CalibrationPoint {
  heightMm: number;
  volumeLiters: number;
}

export interface TankSensorMapping {
  id: string;
  hkSensorId: number;
  tankId: string;
  measurementType: "product_level" | "water_level" | "temperature";
  validFrom: string;
  validUntil: string | null;
  active: boolean;
}

export interface TankMeasurement {
  id: number;
  measuredAt: string;
  rawValue: number;
  unit: string | null;
  volumeLiters: number | null;
  isCorrection: boolean;
}

export interface TankCurrentState {
  tankId: string;
  tankNumber: number;
  displayName: string;
  sensorStatus: "online" | "offline" | "not_configured";
  heightMm: number | null;
  volumeLiters: number | null;
  volumeNotCalculableReason: string | null;
  volumeLiters15C: number | null;
  waterHeightMm: number | null;
  waterVolumeLiters: number | null;
  temperatureC: number | null;
  emptyVolumeLiters: number | null;
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

export function updateStation(organizationId: string, stationId: string, data: Partial<CreateStationInput>): Promise<Station> {
  return apiFetch<Station>(`/zylo-liquid/stations/${stationId}`, {
    method: "PATCH",
    organizationId,
    body: JSON.stringify(data),
  });
}

export function deactivateStation(organizationId: string, stationId: string): Promise<Station> {
  return apiFetch<Station>(`/zylo-liquid/stations/${stationId}/deactivate`, { method: "POST", organizationId });
}

export function reactivateStation(organizationId: string, stationId: string): Promise<Station> {
  return apiFetch<Station>(`/zylo-liquid/stations/${stationId}/reactivate`, { method: "POST", organizationId });
}

export function listTanks(organizationId: string, limit = 100, stationId?: string): Promise<Page<Tank>> {
  const search = new URLSearchParams({ limit: String(limit) });
  if (stationId) search.set("stationId", stationId);
  return apiFetch<Page<Tank>>(`/zylo-liquid/tanks?${search.toString()}`, withOrg(organizationId));
}

export function createTank(organizationId: string, data: CreateTankInput): Promise<Tank> {
  return apiFetch<Tank>("/zylo-liquid/tanks", {
    method: "POST",
    organizationId,
    body: JSON.stringify(data),
  });
}

export function getTank(organizationId: string, tankId: string): Promise<Tank> {
  return apiFetch<Tank>(`/zylo-liquid/tanks/${tankId}`, withOrg(organizationId));
}

export function updateTank(organizationId: string, tankId: string, data: Partial<CreateTankInput>): Promise<Tank> {
  return apiFetch<Tank>(`/zylo-liquid/tanks/${tankId}`, {
    method: "PATCH",
    organizationId,
    body: JSON.stringify(data),
  });
}

export function getTankCurrentState(organizationId: string, tankId: string): Promise<TankCurrentState> {
  return apiFetch<TankCurrentState>(`/zylo-liquid/tanks/${tankId}/current-state`, withOrg(organizationId));
}

export function listTankMeasurements(
  organizationId: string,
  tankId: string,
  params: { fromDate?: string; toDate?: string; limit?: number } = {}
): Promise<Page<TankMeasurement>> {
  const search = new URLSearchParams();
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  search.set("limit", String(params.limit ?? 200));
  return apiFetch<Page<TankMeasurement>>(`/zylo-liquid/tanks/${tankId}/measurements?${search.toString()}`, withOrg(organizationId));
}

export function listTankSensorMappings(organizationId: string, tankId: string): Promise<Page<TankSensorMapping>> {
  const search = new URLSearchParams({ tankId, limit: "20" });
  return apiFetch<Page<TankSensorMapping>>(`/zylo-liquid/tank-sensor-mappings?${search.toString()}`, withOrg(organizationId));
}

export function listTankCalibrationPoints(organizationId: string, tankId: string): Promise<CalibrationPoint[]> {
  return apiFetch<CalibrationPoint[]>(`/zylo-liquid/tanks/${tankId}/calibration-points`, withOrg(organizationId));
}

export function replaceTankCalibrationPoints(organizationId: string, tankId: string, points: CalibrationPoint[]): Promise<unknown> {
  return apiFetch(`/zylo-liquid/tanks/${tankId}/calibration-points`, {
    method: "PUT",
    organizationId,
    body: JSON.stringify({ points }),
  });
}

export function createTankSensorMapping(
  organizationId: string,
  data: { tankId: string; hkSerialNumber: string; measurementType: "product_level" | "water_level" | "temperature" }
): Promise<TankSensorMapping> {
  return apiFetch<TankSensorMapping>("/zylo-liquid/tank-sensor-mappings", {
    method: "POST",
    organizationId,
    body: JSON.stringify(data),
  });
}

export function listFuelProducts(organizationId: string, limit = 50): Promise<Page<FuelProduct>> {
  return apiFetch<Page<FuelProduct>>(`/zylo-liquid/fuel-products?limit=${limit}`, withOrg(organizationId));
}

export function createFuelProduct(organizationId: string, data: CreateFuelProductInput): Promise<FuelProduct> {
  return apiFetch<FuelProduct>("/zylo-liquid/fuel-products", {
    method: "POST",
    organizationId,
    body: JSON.stringify(data),
  });
}

export function updateFuelProduct(organizationId: string, fuelProductId: string, data: UpdateFuelProductInput): Promise<FuelProduct> {
  return apiFetch<FuelProduct>(`/zylo-liquid/fuel-products/${fuelProductId}`, {
    method: "PATCH",
    organizationId,
    body: JSON.stringify(data),
  });
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

export function listAlerts(
  organizationId: string,
  params: { status?: string; stationId?: string; tankId?: string; limit?: number } = {}
): Promise<Page<Alert>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.tankId) search.set("tankId", params.tankId);
  search.set("limit", String(params.limit ?? 20));
  return apiFetch<Page<Alert>>(`/zylo-liquid/alerts?${search.toString()}`, withOrg(organizationId));
}

export function resolveAlert(organizationId: string, alertId: string, resolutionNote?: string): Promise<Alert> {
  return apiFetch<Alert>(`/zylo-liquid/alerts/${alertId}`, {
    method: "PATCH",
    organizationId,
    body: JSON.stringify({ resolutionNote }),
  });
}

export function listDeliveries(organizationId: string, params: { stationId?: string; tankId?: string; limit?: number } = {}): Promise<Page<Delivery>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.tankId) search.set("tankId", params.tankId);
  search.set("limit", String(params.limit ?? 10));
  return apiFetch<Page<Delivery>>(`/zylo-liquid/deliveries?${search.toString()}`, withOrg(organizationId));
}

export function listLeakEvents(organizationId: string, params: { stationId?: string; tankId?: string; result?: string; limit?: number } = {}): Promise<Page<LeakEvent>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.tankId) search.set("tankId", params.tankId);
  if (params.result) search.set("result", params.result);
  search.set("limit", String(params.limit ?? 10));
  return apiFetch<Page<LeakEvent>>(`/zylo-liquid/leak-events?${search.toString()}`, withOrg(organizationId));
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  active: boolean;
}

export function listCurrencies(organizationId: string, limit = 50): Promise<Page<Currency>> {
  return apiFetch<Page<Currency>>(`/currencies?limit=${limit}`, withOrg(organizationId));
}

export interface City {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  countryId: string;
  countryName: string;
  currencyCode: string;
}

export function listCities(organizationId: string, params: { q?: string; limit?: number } = {}): Promise<Page<City>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<City>>(`/cities?${search.toString()}`, withOrg(organizationId));
}

export interface PriceHistoryEntry {
  id: string;
  stationId: string;
  fuelProductId: string;
  currencyId: string;
  priceAmount: number;
  costAmount: number | null;
  effectiveFrom: string;
  changeReason: string | null;
  createdBy: string;
  isFuture: boolean;
}

export interface CreatePriceHistoryInput {
  stationId: string;
  fuelProductId: string;
  priceAmount: number;
  costAmount?: number;
  currencyId?: string;
  effectiveFrom: string;
  changeReason?: string;
}

export function listPrices(
  organizationId: string,
  params: { stationId?: string; fuelProductId?: string; limit?: number } = {}
): Promise<Page<PriceHistoryEntry>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.fuelProductId) search.set("fuelProductId", params.fuelProductId);
  search.set("limit", String(params.limit ?? 50));
  return apiFetch<Page<PriceHistoryEntry>>(`/zylo-liquid/prices?${search.toString()}`, withOrg(organizationId));
}

export function createPriceHistory(organizationId: string, data: CreatePriceHistoryInput): Promise<PriceHistoryEntry> {
  return apiFetch<PriceHistoryEntry>("/zylo-liquid/prices", {
    method: "POST",
    organizationId,
    body: JSON.stringify(data),
  });
}

export function updatePriceHistory(
  organizationId: string,
  priceId: string,
  data: { priceAmount?: number; costAmount?: number; currencyId?: string; changeReason?: string }
): Promise<PriceHistoryEntry> {
  return apiFetch<PriceHistoryEntry>(`/zylo-liquid/prices/${priceId}`, {
    method: "PATCH",
    organizationId,
    body: JSON.stringify(data),
  });
}
