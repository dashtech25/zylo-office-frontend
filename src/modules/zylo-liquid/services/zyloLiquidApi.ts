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
  timezone: string;
  phone: string | null;
  email: string | null;
  openingTime: string;
  closingTime: string;
  is24h: boolean;
  notes: string | null;
  status: "active" | "maintenance" | "inactive";
  activeTankCount: number;
  exploitationType: string;
  currencyOverrideId: string | null;
}

export interface CreateStationInput {
  name: string;
  code: string;
  cityId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  phone?: string;
  email?: string;
  openingTime?: string;
  closingTime?: string;
  is24h?: boolean;
  notes?: string;
  currencyOverrideId?: string | null;
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
  displayColor: string | null;
  active: boolean;
}

export interface CreateFuelProductInput {
  name: string;
  code: string;
  densityGPerCm3?: number;
  displayColor?: string;
}

export interface UpdateFuelProductInput {
  name?: string;
  densityGPerCm3?: number;
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
  /** Dernier état *mesuré* du sensor côté registre Holykell (télémétrie) —
   * distinct de la vérité *déclarée* du mapping. `null` quand le sensor
   * n'a pas d'entrée registre connue (jamais un état inventé). */
  live: HolykellSensorLiveState | null;
}

/** Miroir frontend de `HolykellSensorLiveState` (schéma backend). Tous les
 * champs sont optionnels côté API : absence = état inconnu. */
export interface HolykellSensorLiveState {
  hkSerialNumber: string | null;
  hkSensorName: string | null;
  hkUnit: string | null;
  hkReportCycleSec: number | null;
  /** 1 = OK, 0 = KO côté Holykell */
  hkLastStatus: number | null;
  hkLastSeenAt: string | null;
  lastValue: number | null;
  lastValueAt: string | null;
  syncFrom: string | null;
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
  sellableVolumeLiters: number | null;
  waterHeightMm: number | null;
  waterVolumeLiters: number | null;
  temperatureC: number | null;
  emptyVolumeLiters: number | null;
  lastMeasurementAt: string | null;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
  unitPriceAmount: number | null;
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

export interface DeliveryInProgress {
  tankId: string;
  stationId: string;
  startTime: string;
  startHeightMm: number;
  startVolumeLiters: number | null;
  currentTime: string;
  currentHeightMm: number;
  currentVolumeLiters: number | null;
}

/** Jamais persistée côté backend : recalculée à chaque appel à partir des
 * mesures récentes (hausse en cours, pas encore stabilisée). Disparaît
 * dès que la livraison est confirmée (elle devient alors une vraie
 * `Delivery` via `listDeliveries`). */
export function listDeliveriesInProgress(organizationId: string): Promise<DeliveryInProgress[]> {
  return apiFetch<DeliveryInProgress[]>("/zylo-liquid/deliveries-in-progress", withOrg(organizationId));
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

/** `limit` est plafonné à 100 côté backend (PaginationParams) — jamais
 * dépasser cette valeur ici ; l'appelant qui a besoin de plus de 100
 * mesures doit paginer via `offset` (voir useDeliveryMeasurements). */
export function listTankMeasurements(
  organizationId: string,
  tankId: string,
  params: { fromDate?: string; toDate?: string; limit?: number; offset?: number } = {}
): Promise<Page<TankMeasurement>> {
  const search = new URLSearchParams();
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  search.set("limit", String(params.limit ?? 100));
  search.set("offset", String(params.offset ?? 0));
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

export interface StationFuelProduct {
  id: string;
  stationId: string;
  fuelProductId: string;
  active: boolean;
}

export function listStationFuelProducts(
  organizationId: string,
  params: { stationId?: string; fuelProductId?: string; limit?: number } = {}
): Promise<Page<StationFuelProduct>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.fuelProductId) search.set("fuelProductId", params.fuelProductId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<StationFuelProduct>>(`/zylo-liquid/station-fuel-products?${search.toString()}`, withOrg(organizationId));
}

export function createStationFuelProduct(organizationId: string, data: { stationId: string; fuelProductId: string }): Promise<StationFuelProduct> {
  return apiFetch<StationFuelProduct>("/zylo-liquid/station-fuel-products", {
    method: "POST",
    organizationId,
    body: JSON.stringify(data),
  });
}

export function updateStationFuelProduct(organizationId: string, associationId: string, data: { active: boolean }): Promise<StationFuelProduct> {
  return apiFetch<StationFuelProduct>(`/zylo-liquid/station-fuel-products/${associationId}`, {
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
  params: { status?: string; stationId?: string; tankId?: string; type?: AlertType; limit?: number } = {}
): Promise<Page<Alert>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.tankId) search.set("tankId", params.tankId);
  if (params.type) search.set("type", params.type);
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

export function listDeliveries(
  organizationId: string,
  params: { stationId?: string; tankId?: string; fromDate?: string; toDate?: string; limit?: number } = {}
): Promise<Page<Delivery>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.tankId) search.set("tankId", params.tankId);
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  search.set("limit", String(params.limit ?? 100));
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

export function listCurrencies(organizationId: string, limit = 50, offset = 0): Promise<Page<Currency>> {
  return apiFetch<Page<Currency>>(`/currencies?limit=${limit}&offset=${offset}`, withOrg(organizationId));
}

export interface City {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  countryId: string;
  countryName: string;
  currencyId: string | null;
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
  /** `null` = prix par défaut réseau, non rattaché à une station précise (audit Configuration carburant P2). */
  stationId: string | null;
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
  /** `null`/absent = prix par défaut réseau — `currencyId` devient alors obligatoire. */
  stationId?: string | null;
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

export interface HolykellAccountSyncStatus {
  id: string;
  organizationId: string;
  lastSyncAt: string | null;
  lastSyncStatus: "success" | "partial" | "failed" | null;
  lastSyncError: string | null;
  syncEnabled: boolean;
}

export function listHolykellAccounts(organizationId: string): Promise<HolykellAccountSyncStatus[]> {
  return apiFetch<HolykellAccountSyncStatus[]>("/zylo-liquid/holykell-accounts", withOrg(organizationId));
}

export interface SystemDefaults {
  leakThresholdLph: number;
  deliveryRiseThresholdMm: number;
  deliveryStabilityDeltaMm: number;
  deliveryStabilizationMinutes: number;
}

export function getSystemDefaults(organizationId: string): Promise<SystemDefaults> {
  // L'endpoint lui-même n'a besoin d'aucune portée organisation (constantes
  // globales, cf. commentaire de `get_system_defaults` côté backend), mais
  // TOUT le routeur zylo_liquid exige X-Organization-Id via
  // `require_module_active` — l'appel échouait systématiquement en 422 sans
  // cet en-tête (bug préexistant découvert par le test E2E réel de
  // refonte-configuration-zylo-liquid.md : l'onglet Système était vide
  // depuis toujours, l'erreur étant silencieusement avalée).
  return apiFetch<SystemDefaults>("/zylo-liquid/system-defaults", withOrg(organizationId));
}

// ================================================================
// CAISSE (page_caisse.md) — ventes estimées à partir des baisses de volume
// mesurées, jamais un état comptable officiel. `confidence` et les champs
// "*NotCalculableReason" ne doivent jamais être masqués côté UI : un
// montant `null` avec une raison explicite prime toujours sur un 0 silencieux.
// ================================================================

export type CashConfidence = "reliable" | "partial" | "incomplete_data" | "insufficient_data" | "anomaly";

export type CashSegmentType =
  | "sale"
  | "delivery"
  | "stable"
  | "anomaly_unexplained_rise"
  | "anomaly_extreme_variation"
  | "insufficient_data";

export interface CashSegment {
  startTime: string;
  endTime: string;
  type: CashSegmentType;
  startHeightMm: number | null;
  endHeightMm: number | null;
  startVolumeLiters: number | null;
  endVolumeLiters: number | null;
  volumeLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
}

export interface TankCash {
  tankId: string;
  stationId: string;
  fuelProductId: string;
  displayName: string;
  fuelProductName: string;
  periodStart: string;
  periodEnd: string;
  volumeSoldLiters: number | null;
  volumeNotCalculableReason: string | null;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
  confidence: CashConfidence;
  anomalyTypes: string[];
  segments: CashSegment[];
}

export interface TankCashSummary {
  tankId: string;
  displayName: string;
  fuelProductId: string;
  fuelProductName: string;
  volumeSoldLiters: number | null;
  volumeNotCalculableReason: string | null;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
  confidence: CashConfidence;
}

export interface ProductCashLine {
  fuelProductId: string;
  fuelProductName: string;
  tankCount: number;
  volumeSoldLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
  confidence: CashConfidence;
  tanks: TankCashSummary[];
}

export interface StationCashDetail {
  stationId: string;
  stationName: string;
  periodStart: string;
  periodEnd: string;
  tankCount: number;
  volumeSoldLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
  confidence: CashConfidence;
  products: ProductCashLine[];
}

export interface StationCashSummary {
  stationId: string;
  stationName: string;
  tankCount: number;
  volumeSoldLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
  confidence: CashConfidence;
}

export interface CurrencyCashBlock {
  currencyCode: string;
  monetaryValue: number;
  volumeSoldLiters: number;
  stationCount: number;
  stations: StationCashSummary[];
}

export interface NetworkCashSummary {
  periodStart: string;
  periodEnd: string;
  currencyBlocks: CurrencyCashBlock[];
  volumeSoldLitersTotal: number;
  stationsWithDataCount: number;
  stationsTotalCount: number;
  productCount: number;
  incompletePricingStationCount: number;
  lastMeasurementAt: string | null;
}

export type CashMode = "calendar" | "operational";

function cashPeriodQuery(fromDate: string, toDate: string, mode: CashMode = "calendar"): string {
  return `fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&mode=${mode}`;
}

export function getNetworkCashSummary(
  organizationId: string,
  fromDate: string,
  toDate: string,
  mode: CashMode = "calendar"
): Promise<NetworkCashSummary> {
  return apiFetch<NetworkCashSummary>(`/zylo-liquid/cash/network-summary?${cashPeriodQuery(fromDate, toDate, mode)}`, withOrg(organizationId));
}

export function getStationCashDetail(
  organizationId: string,
  stationId: string,
  fromDate: string,
  toDate: string,
  mode: CashMode = "calendar"
): Promise<StationCashDetail> {
  return apiFetch<StationCashDetail>(
    `/zylo-liquid/cash/stations/${stationId}?${cashPeriodQuery(fromDate, toDate, mode)}`,
    withOrg(organizationId)
  );
}

export function getTankCash(
  organizationId: string,
  tankId: string,
  fromDate: string,
  toDate: string,
  mode: CashMode = "calendar"
): Promise<TankCash> {
  return apiFetch<TankCash>(`/zylo-liquid/cash/tanks/${tankId}?${cashPeriodQuery(fromDate, toDate, mode)}`, withOrg(organizationId));
}

// ================================================================
// Couche déclarative (processus-double-sources-verite, Phase 5-8) — un
// fait opérationnel constaté par un humain, cycle de vie declared/locked
// (jamais réécrit après verrouillage, une correction est une nouvelle
// ligne référençant l'originale via correctsDeclarationId).
// ================================================================

export interface DeliveryDeclaration {
  id: string;
  stationId: string;
  authorUserId: string;
  fuelProductId: string;
  eventAt: string;
  declaredAt: string;
  declaredVolumeLiters: number;
  supplierName: string | null;
  deliveryNoteReference: string | null;
  lifecycleStatus: "declared" | "locked";
  changeReason: string | null;
  correctsDeclarationId: string | null;
  reconciledWithId: string | null;
  reconciledWithType: string | null;
}

export interface CreateDeliveryDeclarationInput {
  stationId: string;
  fuelProductId: string;
  eventAt: string;
  declaredVolumeLiters: number;
  supplierName?: string;
  deliveryNoteReference?: string;
  changeReason?: string;
}

export function listDeliveryDeclarations(organizationId: string, params: { stationId?: string; limit?: number } = {}): Promise<Page<DeliveryDeclaration>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<DeliveryDeclaration>>(`/zylo-liquid/delivery-declarations?${search.toString()}`, withOrg(organizationId));
}

export function createDeliveryDeclaration(organizationId: string, data: CreateDeliveryDeclarationInput): Promise<DeliveryDeclaration> {
  return apiFetch<DeliveryDeclaration>("/zylo-liquid/delivery-declarations", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function lockDeliveryDeclaration(organizationId: string, id: string): Promise<DeliveryDeclaration> {
  return apiFetch<DeliveryDeclaration>(`/zylo-liquid/delivery-declarations/${id}/lock`, { method: "POST", organizationId });
}

export function reconcileDeliveryDeclaration(organizationId: string, id: string): Promise<ReconciliationRecord> {
  return apiFetch<ReconciliationRecord>(`/zylo-liquid/delivery-declarations/${id}/reconcile`, { method: "POST", organizationId });
}

export interface ShiftCashDeclaration {
  id: string;
  stationId: string;
  authorUserId: string;
  tankId: string;
  eventAt: string;
  declaredAt: string;
  shiftStart: string;
  shiftEnd: string;
  openingReadingMm: number | null;
  closingReadingMm: number | null;
  declaredCashAmount: number;
  currencyId: string;
  lifecycleStatus: "declared" | "locked";
  changeReason: string | null;
  correctsDeclarationId: string | null;
  reconciledWithId: string | null;
  reconciledWithType: string | null;
}

export interface CreateShiftCashDeclarationInput {
  stationId: string;
  tankId: string;
  eventAt: string;
  shiftStart: string;
  shiftEnd: string;
  declaredCashAmount: number;
  currencyId: string;
  openingReadingMm?: number;
  closingReadingMm?: number;
  changeReason?: string;
}

export function listShiftCashDeclarations(organizationId: string, params: { stationId?: string; limit?: number } = {}): Promise<Page<ShiftCashDeclaration>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<ShiftCashDeclaration>>(`/zylo-liquid/shift-cash-declarations?${search.toString()}`, withOrg(organizationId));
}

export function createShiftCashDeclaration(organizationId: string, data: CreateShiftCashDeclarationInput): Promise<ShiftCashDeclaration> {
  return apiFetch<ShiftCashDeclaration>("/zylo-liquid/shift-cash-declarations", { method: "POST", organizationId, body: JSON.stringify(data) });
}

/** Clôture un shift déclaré (« Clôturer mon shift » du prototype,
 * dashPompiste()) — jamais réversible, une correction passe par une
 * nouvelle déclaration corrective, pas un déverrouillage. */
export function lockShiftCashDeclaration(organizationId: string, declarationId: string): Promise<ShiftCashDeclaration> {
  return apiFetch<ShiftCashDeclaration>(`/zylo-liquid/shift-cash-declarations/${declarationId}/lock`, { method: "POST", organizationId });
}

// ================================================================
// Couche Commercial (Phase 5 §5, Phase 7) — CommercialAccount jamais
// confondu avec Organization (le tenant).
// ================================================================

export interface CommercialAccount {
  id: string;
  organizationId: string;
  name: string;
  currencyId: string;
  creditLimit: number;
  active: boolean;
}

export interface CreateCommercialAccountInput {
  name: string;
  currencyId: string;
  creditLimit: number;
}

export function listCommercialAccounts(organizationId: string, limit = 100): Promise<Page<CommercialAccount>> {
  return apiFetch<Page<CommercialAccount>>(`/zylo-liquid/commercial-accounts?limit=${limit}`, withOrg(organizationId));
}

export function createCommercialAccount(organizationId: string, data: CreateCommercialAccountInput): Promise<CommercialAccount> {
  return apiFetch<CommercialAccount>("/zylo-liquid/commercial-accounts", { method: "POST", organizationId, body: JSON.stringify(data) });
}

// Élargi mission « vente-maintenant-reglementation » Bloc 3 — mobile money
// (Phase 2 §2 de la mission : dominance confirmée d'Orange Money/MTN MoMo
// au Cameroun). Reflète exactement PAYMENT_METHODS côté backend.
export type PaymentMethod = "cash" | "card" | "fleet" | "credit" | "orange_money" | "mtn_momo" | "bank_transfer" | "cheque" | "other";

export interface Sale {
  id: string;
  stationId: string;
  authorUserId: string;
  eventAt: string;
  fuelProductId: string;
  quantityLiters: number;
  priceAmount: number;
  currencyId: string;
  paymentMethod: PaymentMethod;
  commercialAccountId: string | null;
  vehicleId: string | null;
  driverId: string | null;
}

export interface CreateSaleInput {
  stationId: string;
  eventAt: string;
  fuelProductId: string;
  quantityLiters: number;
  priceAmount: number;
  currencyId: string;
  paymentMethod: PaymentMethod;
  commercialAccountId?: string;
  vehicleId?: string;
  driverId?: string;
}

export function listSales(organizationId: string, params: { stationId?: string; limit?: number } = {}): Promise<Page<Sale>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<Sale>>(`/zylo-liquid/sales?${search.toString()}`, withOrg(organizationId));
}

export function createSale(organizationId: string, data: CreateSaleInput): Promise<Sale> {
  return apiFetch<Sale>("/zylo-liquid/sales", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export interface Receivable {
  id: string;
  commercialAccountId: string;
  // Exactement l'un des deux (extension mission « vente-maintenant-reglementation »
  // Bloc 4 corrigé — une créance carburant garde saleId, une créance boutique
  // utilise productSaleTransactionId).
  saleId: string | null;
  productSaleTransactionId: string | null;
  amount: number;
  currencyId: string;
  status: "open" | "partially_settled" | "settled";
}

export function listReceivables(organizationId: string, params: { commercialAccountId?: string; limit?: number } = {}): Promise<Page<Receivable>> {
  const search = new URLSearchParams();
  if (params.commercialAccountId) search.set("commercialAccountId", params.commercialAccountId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<Receivable>>(`/zylo-liquid/receivables?${search.toString()}`, withOrg(organizationId));
}

export interface Payment {
  id: string;
  receivableId: string;
  authorUserId: string;
  paidAt: string;
  amount: number;
  currencyId: string;
  exchangeRateApplied: number | null;
  method: string | null;
}

export interface CreatePaymentInput {
  receivableId: string;
  paidAt: string;
  amount: number;
  currencyId: string;
  exchangeRateApplied?: number;
  method?: string;
}

export function createPayment(organizationId: string, data: CreatePaymentInput): Promise<Payment> {
  return apiFetch<Payment>("/zylo-liquid/payments", { method: "POST", organizationId, body: JSON.stringify(data) });
}

// ================================================================
// Rapprochement (Phase 6-8) — calcul paresseux à la demande, jamais créé
// automatiquement à la déclaration.
// ================================================================

export interface ReconciliationRecord {
  id: string;
  subjectType: string;
  subjectId: string;
  counterpartType: string | null;
  counterpartId: string | null;
  family: "quantitative" | "consistency";
  status: "matched" | "discrepancy" | "pending" | "insufficient_data";
  discrepancyValue: number | null;
  discrepancyUnit: string | null;
  toleranceApplied: number | null;
  evaluatedAt: string;
  evaluatedByUserId: string | null;
}

export function listReconciliationRecords(organizationId: string, params: { subjectType?: string; subjectId?: string; limit?: number } = {}): Promise<Page<ReconciliationRecord>> {
  const search = new URLSearchParams();
  if (params.subjectType) search.set("subjectType", params.subjectType);
  if (params.subjectId) search.set("subjectId", params.subjectId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<ReconciliationRecord>>(`/zylo-liquid/reconciliation-records?${search.toString()}`, withOrg(organizationId));
}

export function reconcileStock(organizationId: string, tankId: string, day: string): Promise<ReconciliationRecord> {
  return apiFetch<ReconciliationRecord>(`/zylo-liquid/tanks/${tankId}/reconcile-stock?day=${day}`, { method: "POST", organizationId });
}

// ================================================================
// Mission « vente-maintenant-reglementation » — Bloc 5 : catalogue de
// produits vendables (boutique/non-carburant).
// ================================================================

export interface SellableProduct {
  id: string;
  organizationId: string;
  stationId: string | null;
  name: string;
  sku: string | null;
  barcodeValue: string | null;
  category: string | null;
  unitPriceAmount: number;
  currencyId: string;
  active: boolean;
}

export interface CreateSellableProductInput {
  stationId?: string;
  name: string;
  sku?: string;
  barcodeValue?: string;
  category?: string;
  unitPriceAmount: number;
  currencyId: string;
}

export function listSellableProducts(organizationId: string, params: { stationId?: string; search?: string; limit?: number } = {}): Promise<Page<SellableProduct>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.search) search.set("search", params.search);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<SellableProduct>>(`/zylo-liquid/sellable-products?${search.toString()}`, withOrg(organizationId));
}

export function createSellableProduct(organizationId: string, data: CreateSellableProductInput): Promise<SellableProduct> {
  return apiFetch<SellableProduct>("/zylo-liquid/sellable-products", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateSellableProduct(organizationId: string, productId: string, data: Partial<CreateSellableProductInput> & { active?: boolean }): Promise<SellableProduct> {
  return apiFetch<SellableProduct>(`/zylo-liquid/sellable-products/${productId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

// ================================================================
// Mission « vente-maintenant-reglementation » — Bloc 4 (corrigé) : ventes
// de produits boutique (paniers) — entité séparée de Sale (voir zyloLiquidApi
// Sale ci-dessus, réservée aux distributions carburant déjà constatées).
// ================================================================

export interface ProductSaleLine {
  id: string;
  transactionId: string;
  sellableProductId: string;
  quantity: number;
  unitPriceAmount: number;
  lineTotalAmount: number;
}

export interface ProductSaleTransaction {
  id: string;
  stationId: string;
  authorUserId: string;
  eventAt: string;
  currencyId: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  status: "completed" | "cancelled";
  commercialAccountId: string | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  lines: ProductSaleLine[];
}

export interface CreateProductSaleTransactionInput {
  stationId: string;
  eventAt: string;
  currencyId: string;
  paymentMethod: PaymentMethod;
  lines: { sellableProductId: string; quantity: number; unitPriceAmount: number }[];
  commercialAccountId?: string;
}

export function listProductSaleTransactions(organizationId: string, params: { stationId?: string; limit?: number } = {}): Promise<Page<ProductSaleTransaction>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<ProductSaleTransaction>>(`/zylo-liquid/product-sales?${search.toString()}`, withOrg(organizationId));
}

export function createProductSaleTransaction(organizationId: string, data: CreateProductSaleTransactionInput): Promise<ProductSaleTransaction> {
  return apiFetch<ProductSaleTransaction>("/zylo-liquid/product-sales", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function cancelProductSaleTransaction(organizationId: string, transactionId: string): Promise<ProductSaleTransaction> {
  return apiFetch<ProductSaleTransaction>(`/zylo-liquid/product-sales/${transactionId}/cancel`, { method: "POST", organizationId });
}

// ================================================================
// Mission « vente-maintenant-reglementation » — Bloc 6 : Maintenance.
// ================================================================

export interface Technician {
  id: string;
  organizationId: string;
  name: string;
  company: string | null;
  contact: string | null;
  linkedUserId: string | null;
  active: boolean;
}

export function listTechnicians(organizationId: string, params: { limit?: number } = {}): Promise<Page<Technician>> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<Technician>>(`/zylo-liquid/technicians?${search.toString()}`, withOrg(organizationId));
}

export function createTechnician(organizationId: string, data: { name: string; company?: string; contact?: string; linkedUserId?: string }): Promise<Technician> {
  return apiFetch<Technician>("/zylo-liquid/technicians", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export type EquipmentStatus = "in_service" | "out_of_order" | "out_of_service";

export interface Equipment {
  id: string;
  stationId: string;
  type: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  status: EquipmentStatus;
  installedAt: string | null;
  warrantyUntil: string | null;
  lastMaintenanceAt: string | null;
  nextMaintenanceDueAt: string | null;
}

export interface CreateEquipmentInput {
  stationId: string;
  type: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installedAt?: string;
  warrantyUntil?: string;
}

export function listEquipment(organizationId: string, params: { stationId?: string; limit?: number } = {}): Promise<Page<Equipment>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<Equipment>>(`/zylo-liquid/equipment?${search.toString()}`, withOrg(organizationId));
}

export function createEquipment(organizationId: string, data: CreateEquipmentInput): Promise<Equipment> {
  return apiFetch<Equipment>("/zylo-liquid/equipment", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateEquipment(organizationId: string, equipmentId: string, data: Partial<CreateEquipmentInput> & { status?: EquipmentStatus; lastMaintenanceAt?: string; nextMaintenanceDueAt?: string }): Promise<Equipment> {
  return apiFetch<Equipment>(`/zylo-liquid/equipment/${equipmentId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

export type InterventionPriority = "critical" | "high" | "medium" | "low";
export type InterventionType = "preventive" | "corrective";
export type InterventionStatus = "planned" | "in_progress" | "closed";

export interface Intervention {
  id: string;
  equipmentId: string;
  stationId: string;
  priority: InterventionPriority;
  type: InterventionType;
  description: string;
  technicianId: string | null;
  status: InterventionStatus;
  openedAt: string;
  plannedAt: string | null;
  closedAt: string | null;
  cost: number | null;
  diagnosis: string | null;
  actionTaken: string | null;
  linkedAlertId: string | null;
}

export interface CreateInterventionInput {
  equipmentId: string;
  stationId: string;
  priority: InterventionPriority;
  type: InterventionType;
  description: string;
  plannedAt?: string;
  linkedAlertId?: string;
}

export function listInterventions(organizationId: string, params: { stationId?: string; limit?: number } = {}): Promise<Page<Intervention>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<Intervention>>(`/zylo-liquid/interventions?${search.toString()}`, withOrg(organizationId));
}

export function createIntervention(organizationId: string, data: CreateInterventionInput): Promise<Intervention> {
  return apiFetch<Intervention>("/zylo-liquid/interventions", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function assignIntervention(organizationId: string, interventionId: string, technicianId: string): Promise<Intervention> {
  return apiFetch<Intervention>(`/zylo-liquid/interventions/${interventionId}/assign`, { method: "POST", organizationId, body: JSON.stringify({ technicianId }) });
}

export function closeIntervention(organizationId: string, interventionId: string, data: { diagnosis?: string; actionTaken?: string; cost?: number }): Promise<Intervention> {
  return apiFetch<Intervention>(`/zylo-liquid/interventions/${interventionId}/close`, { method: "POST", organizationId, body: JSON.stringify(data) });
}

// ================================================================
// Mission « vente-maintenant-reglementation » — Bloc 7 : Réglementation.
// ================================================================

export type RegulatoryCertaintyLevel = "high" | "medium" | "low";
export type RegulatoryDocumentStatus = "valid" | "renew_soon" | "expired" | "unknown";

export interface RegulatoryDocument {
  id: string;
  stationId: string;
  documentType: string;
  authority: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  sourceReference: string | null;
  certaintyLevel: RegulatoryCertaintyLevel;
  supersededByDocumentId: string | null;
  computedStatus: RegulatoryDocumentStatus;
}

export interface CreateRegulatoryDocumentInput {
  stationId: string;
  documentType: string;
  authority?: string;
  issuedAt?: string;
  expiresAt?: string;
  sourceReference?: string;
  certaintyLevel?: RegulatoryCertaintyLevel;
}

export function listRegulatoryDocuments(organizationId: string, params: { stationId?: string; needsActionOnly?: boolean; limit?: number } = {}): Promise<Page<RegulatoryDocument>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.needsActionOnly) search.set("needsActionOnly", "true");
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<RegulatoryDocument>>(`/zylo-liquid/regulatory-documents?${search.toString()}`, withOrg(organizationId));
}

export function createRegulatoryDocument(organizationId: string, data: CreateRegulatoryDocumentInput): Promise<RegulatoryDocument> {
  return apiFetch<RegulatoryDocument>("/zylo-liquid/regulatory-documents", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function renewRegulatoryDocument(organizationId: string, documentId: string, data: CreateRegulatoryDocumentInput): Promise<RegulatoryDocument> {
  return apiFetch<RegulatoryDocument>(`/zylo-liquid/regulatory-documents/${documentId}/renew`, { method: "POST", organizationId, body: JSON.stringify(data) });
}

export interface RegulatoryDeclaration {
  id: string;
  stationId: string;
  type: string;
  authority: string | null;
  triggerIncidentId: string | null;
  status: "to_produce" | "produced";
  reserve: string | null;
}

export function listRegulatoryDeclarations(organizationId: string, params: { stationId?: string; limit?: number } = {}): Promise<Page<RegulatoryDeclaration>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<RegulatoryDeclaration>>(`/zylo-liquid/regulatory-declarations?${search.toString()}`, withOrg(organizationId));
}

export interface CreateRegulatoryDeclarationRequest {
  stationId: string;
  type: string;
  authority?: string;
  triggerIncidentId?: string;
  reserve?: string;
}

export function createRegulatoryDeclaration(organizationId: string, data: CreateRegulatoryDeclarationRequest): Promise<RegulatoryDeclaration> {
  return apiFetch<RegulatoryDeclaration>("/zylo-liquid/regulatory-declarations", { method: "POST", organizationId, body: JSON.stringify(data) });
}
