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
  /** CSV de jours ISO fermés (1=lundi..7=dimanche), ex. "6,7". null = ouvert
   * tous les jours. */
  closedWeekdays: string | null;
  notes: string | null;
  status: "active" | "maintenance" | "inactive";
  activeTankCount: number;
  exploitationType: string;
  currencyOverrideId: string | null;
  hasShop: boolean;
  shopName: string | null;
  shopSurfaceM2: number | null;
  hasLavage: boolean;
  hasVidange: boolean;
  hasGazDomestique: boolean;
  nbPistes: number | null;
  surfaceTotaleM2: number | null;
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
  closedWeekdays?: string | null;
  notes?: string;
  currencyOverrideId?: string | null;
  exploitationType?: string;
  hasShop?: boolean;
  shopName?: string;
  shopSurfaceM2?: number;
  hasLavage?: boolean;
  hasVidange?: boolean;
  hasGazDomestique?: boolean;
  nbPistes?: number;
  surfaceTotaleM2?: number;
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
  /** Volume net moins le seuil bas de chaque cuve — toujours calculable dès
   * que `totalVolumeLiters` l'est. Sa valeur monétaire partage exactement
   * la même devise/raison de non-calcul que `totalMonetaryValue`. */
  totalSellableVolumeLiters: number;
  totalSellableMonetaryValue: number | null;
}

export interface NetworkSummary {
  products: NetworkSummaryProductLine[];
  totalVolumeLiters: number;
  totalStationCount: number;
  totalTankCount: number;
  totalSellableVolumeLiters: number;
}

export type AlertType =
  | "level_high"
  | "level_high_pre_alarm"
  | "level_low"
  | "water"
  | "leak"
  | "sensor_offline"
  | "delivery_discrepancy"
  | "delivery_undeclared"
  | "delivery_declaration_pending"
  | "price_missing"
  | "sensor_mapping_missing"
  | "calibration_missing"
  | "truck_stop_unqualified"
  | "station_offline";

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type AlertResolutionMethod = "auto_verified" | "manual_justified";

// Refonte alertes (2026-09) — `severity` vient désormais du backend (D7) :
// ne plus dériver la gravité d'un `Set` de types dupliqué côté frontend.
export interface Alert {
  id: string;
  stationId: string | null;
  truckId: string | null;
  tankId: string | null;
  productId: string | null;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  sourceType: string | null;
  sourceId: string | null;
  triggeredAt: string;
  triggeredValue: number | null;
  thresholdValue: number | null;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolutionMethod: AlertResolutionMethod | null;
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

// ================================================================
// Page Exploitation (Centre administratif de la station) — vue
// d'ensemble carburants (seuils + stock agrégé + prix courant), catalogue
// de services, politique commerciale par produit (mockup
// emalioration/page de station.docx page Exploitation).
// ================================================================

export type StockStatus = "normal" | "attention" | "critique" | "inconnu";

export interface StationFuelProductOverview {
  id: string;
  stationId: string;
  fuelProductId: string;
  fuelProductName: string;
  fuelProductCode: string;
  displayColor: string | null;
  active: boolean;
  minThresholdLiters: number | null;
  criticalThresholdLiters: number | null;
  safetyStockLiters: number | null;
  capacityLiters: number;
  currentVolumeLiters: number | null;
  status: StockStatus;
  currentPriceAmount: number | null;
  currencyCode: string | null;
  priceEffectiveFrom: string | null;
}

export function listStationFuelProductsOverview(organizationId: string, stationId: string): Promise<StationFuelProductOverview[]> {
  return apiFetch<StationFuelProductOverview[]>(`/zylo-liquid/stations/${stationId}/fuel-products-overview`, withOrg(organizationId));
}

export interface UpdateStationFuelProductThresholdsInput {
  minThresholdLiters?: number | null;
  criticalThresholdLiters?: number | null;
  safetyStockLiters?: number | null;
}

export function updateStationFuelProductThresholds(organizationId: string, associationId: string, data: UpdateStationFuelProductThresholdsInput): Promise<StationFuelProduct> {
  return apiFetch<StationFuelProduct>(`/zylo-liquid/station-fuel-products/${associationId}/thresholds`, {
    method: "PATCH",
    organizationId,
    body: JSON.stringify(data),
  });
}

export interface StationService {
  id: string;
  stationId: string;
  type: string;
  label: string;
  available: boolean;
}

export function listStationServices(organizationId: string, stationId: string): Promise<StationService[]> {
  const search = new URLSearchParams({ stationId });
  return apiFetch<StationService[]>(`/zylo-liquid/station-services?${search.toString()}`, withOrg(organizationId));
}

export function createStationService(organizationId: string, data: { stationId: string; type: string; label: string; available?: boolean }): Promise<StationService> {
  return apiFetch<StationService>("/zylo-liquid/station-services", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateStationService(organizationId: string, serviceId: string, data: { label?: string; available?: boolean }): Promise<StationService> {
  return apiFetch<StationService>(`/zylo-liquid/station-services/${serviceId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

export interface PricingPolicy {
  id: string;
  stationId: string;
  fuelProductId: string;
  policyType: string;
  applicationPeriod: string;
  promotionsEnabled: boolean;
  differentPriceByPeriod: boolean;
  volumeDiscount: boolean;
  corporateRate: boolean;
}

export function getPricingPolicy(organizationId: string, stationId: string, fuelProductId: string): Promise<PricingPolicy | null> {
  const search = new URLSearchParams({ stationId, fuelProductId });
  return apiFetch<PricingPolicy | null>(`/zylo-liquid/station-product-pricing-policy?${search.toString()}`, withOrg(organizationId));
}

export function updatePricingPolicy(
  organizationId: string,
  stationId: string,
  fuelProductId: string,
  data: Partial<Omit<PricingPolicy, "id" | "stationId" | "fuelProductId">>
): Promise<PricingPolicy> {
  const search = new URLSearchParams({ stationId, fuelProductId });
  return apiFetch<PricingPolicy>(`/zylo-liquid/station-product-pricing-policy?${search.toString()}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
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
  params: { status?: string; stationId?: string; truckId?: string; tankId?: string; type?: AlertType; limit?: number } = {}
): Promise<Page<Alert>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.truckId) search.set("truckId", params.truckId);
  if (params.tankId) search.set("tankId", params.tankId);
  if (params.type) search.set("type", params.type);
  search.set("limit", String(params.limit ?? 20));
  return apiFetch<Page<Alert>>(`/zylo-liquid/alerts?${search.toString()}`, withOrg(organizationId));
}

// D3 (refonte alertes) : "je m'en occupe" — ne referme jamais l'alerte,
// distinct de resolveAlert. Ouvert à des rôles qui n'ont pas le droit de
// résolution manuelle (ALERT_ACKNOWLEDGE vs ALERT_MANAGE).
export function acknowledgeAlert(organizationId: string, alertId: string): Promise<Alert> {
  return apiFetch<Alert>(`/zylo-liquid/alerts/${alertId}/acknowledge`, {
    method: "POST",
    organizationId,
  });
}

// D2 : réservé aux types sans vérification automatique possible — le
// backend renvoie 422 (code "alert_requires_automatic_verification") pour
// un type auto-vérifiable (seuils, eau, sonde, fuite, livraison) : ces
// types se referment tout seuls dès que la condition réelle disparaît,
// jamais par ce clic. `resolutionNote` est obligatoire côté backend.
export function resolveAlert(organizationId: string, alertId: string, resolutionNote: string): Promise<Alert> {
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

export interface Country {
  id: string;
  name: string;
  isoCode2: string;
  currencyId: string | null;
  currencyCode: string;
  defaultTimezone: string;
}

export function listCountries(organizationId: string, params: { q?: string; limit?: number } = {}): Promise<Page<Country>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 300));
  return apiFetch<Page<Country>>(`/countries?${search.toString()}`, withOrg(organizationId));
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
  params: { stationId?: string; fuelProductId?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number } = {}
): Promise<Page<PriceHistoryEntry>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  if (params.fuelProductId) search.set("fuelProductId", params.fuelProductId);
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  search.set("limit", String(params.limit ?? 50));
  search.set("offset", String(params.offset ?? 0));
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

export interface NetworkProductCashLine {
  fuelProductId: string;
  fuelProductName: string;
  displayColor: string | null;
  tankCount: number;
  stationCount: number;
  volumeSoldLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
  confidence: CashConfidence;
  stations: StationCashSummary[];
}

export interface NetworkCashSummary {
  periodStart: string;
  periodEnd: string;
  currencyBlocks: CurrencyCashBlock[];
  productBlocks: NetworkProductCashLine[];
  stationLines: StationCashSummary[];
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
  supplierId: string | null;
  truckId: string | null;
  purchaseOrderId: string | null;
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
  supplierId?: string;
  truckId?: string;
  purchaseOrderId?: string;
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

// Camions-citernes et transporteurs — référentiels réseau (pas de portée
// station, un camion dessert plusieurs stations).
export interface Carrier {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
}

export interface CreateCarrierInput {
  name: string;
}

export function listCarriers(organizationId: string, params: { limit?: number } = {}): Promise<Page<Carrier>> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<Carrier>>(`/zylo-liquid/carriers?${search.toString()}`, withOrg(organizationId));
}

export function createCarrier(organizationId: string, data: CreateCarrierInput): Promise<Carrier> {
  return apiFetch<Carrier>("/zylo-liquid/carriers", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateCarrier(organizationId: string, carrierId: string, data: Partial<CreateCarrierInput> & { active?: boolean }): Promise<Carrier> {
  return apiFetch<Carrier>(`/zylo-liquid/carriers/${carrierId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

export interface Truck {
  id: string;
  organizationId: string;
  carrierId: string | null;
  plateNumber: string;
  capacityLiters: number | null;
  compartmentsCount: number | null;
}

export interface CreateTruckInput {
  carrierId?: string;
  plateNumber: string;
  capacityLiters?: number;
  compartmentsCount?: number;
}

export function listTrucks(organizationId: string, params: { carrierId?: string; limit?: number } = {}): Promise<Page<Truck>> {
  const search = new URLSearchParams();
  if (params.carrierId) search.set("carrierId", params.carrierId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<Truck>>(`/zylo-liquid/trucks?${search.toString()}`, withOrg(organizationId));
}

export function createTruck(organizationId: string, data: CreateTruckInput): Promise<Truck> {
  return apiFetch<Truck>("/zylo-liquid/trucks", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateTruck(organizationId: string, truckId: string, data: Partial<CreateTruckInput>): Promise<Truck> {
  return apiFetch<Truck>(`/zylo-liquid/trucks/${truckId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

/** Tracking GPS des camions-citernes (mission « tracking », étape 1 —
 * position + arrêts sur carte, 2026-09-11). Un boîtier GPS enregistré,
 * rattaché optionnellement à un camion — même schéma que les sondes
 * Holykell pour les cuves : référentiel → journal brut → état dérivé,
 * jamais mélangés. */
export interface GpsDevice {
  id: string;
  organizationId: string;
  truckId: string | null;
  deviceIdentifier: string;
  label: string | null;
  active: boolean;
}

export interface CreateGpsDeviceInput {
  truckId?: string;
  deviceIdentifier: string;
  label?: string;
}

export function listGpsDevices(organizationId: string, params: { truckId?: string; limit?: number } = {}): Promise<Page<GpsDevice>> {
  const search = new URLSearchParams();
  if (params.truckId) search.set("truckId", params.truckId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<GpsDevice>>(`/zylo-liquid/gps-devices?${search.toString()}`, withOrg(organizationId));
}

export function createGpsDevice(organizationId: string, data: CreateGpsDeviceInput): Promise<GpsDevice> {
  return apiFetch<GpsDevice>("/zylo-liquid/gps-devices", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateGpsDevice(organizationId: string, gpsDeviceId: string, data: Partial<CreateGpsDeviceInput> & { active?: boolean }): Promise<GpsDevice> {
  return apiFetch<GpsDevice>(`/zylo-liquid/gps-devices/${gpsDeviceId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

/** Secret d'ingestion de l'organisation — à copier dans la configuration
 * de renvoi (forwarding) de la passerelle Traccar, jamais reloggé
 * ailleurs que dans cet écran d'administration. */
export function getGpsIngestCredential(organizationId: string): Promise<{ secretToken: string }> {
  return apiFetch<{ secretToken: string }>("/zylo-liquid/gps-ingest-credential", withOrg(organizationId));
}

export function regenerateGpsIngestCredential(organizationId: string): Promise<{ secretToken: string }> {
  return apiFetch<{ secretToken: string }>("/zylo-liquid/gps-ingest-credential/regenerate", { method: "POST", organizationId });
}

export function unassignGpsDevice(organizationId: string, gpsDeviceId: string): Promise<GpsDevice> {
  return apiFetch<GpsDevice>(`/zylo-liquid/gps-devices/${gpsDeviceId}/unassign`, { method: "POST", organizationId });
}

// ================================================================
// Tracking GPS des camions-citernes — étape 2 (flux métier, 2026-09)
// ================================================================

export interface TraccarConnection {
  id: string;
  organizationId: string;
  baseUrl: string;
  username: string;
  password: string;
}

export interface TraccarConnectionInput {
  baseUrl: string;
  username: string;
  password: string;
}

export function getTraccarConnection(organizationId: string): Promise<TraccarConnection | null> {
  return apiFetch<TraccarConnection | null>("/zylo-liquid/traccar-connection", withOrg(organizationId));
}

export function setTraccarConnection(organizationId: string, data: TraccarConnectionInput): Promise<TraccarConnection> {
  return apiFetch<TraccarConnection>("/zylo-liquid/traccar-connection", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export interface TraccarDeviceListItem {
  deviceIdentifier: string;
  name: string | null;
  online: boolean;
  lastPositionAt: string | null;
  truckId: string | null;
  truckPlateNumber: string | null;
}

export function listTraccarDevices(organizationId: string): Promise<TraccarDeviceListItem[]> {
  return apiFetch<TraccarDeviceListItem[]>("/zylo-liquid/gps-devices/from-traccar", withOrg(organizationId));
}

export type TrackingLocationType = "port" | "entrepot" | "depot_fournisseur" | "libre";

export interface TrackingLocation {
  id: string;
  organizationId: string;
  name: string;
  type: TrackingLocationType;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: "active" | "deleted";
}

export interface CreateTrackingLocationInput {
  name: string;
  type?: TrackingLocationType;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}

export function listTrackingLocations(organizationId: string, includeDeleted = false): Promise<TrackingLocation[]> {
  return apiFetch<TrackingLocation[]>(`/zylo-liquid/tracking-locations?includeDeleted=${includeDeleted}`, withOrg(organizationId));
}

export function createTrackingLocation(organizationId: string, data: CreateTrackingLocationInput): Promise<TrackingLocation> {
  return apiFetch<TrackingLocation>("/zylo-liquid/tracking-locations", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateTrackingLocation(organizationId: string, locationId: string, data: Partial<CreateTrackingLocationInput>): Promise<TrackingLocation> {
  return apiFetch<TrackingLocation>(`/zylo-liquid/tracking-locations/${locationId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

export function deleteTrackingLocation(organizationId: string, locationId: string): Promise<TrackingLocation> {
  return apiFetch<TrackingLocation>(`/zylo-liquid/tracking-locations/${locationId}`, { method: "DELETE", organizationId });
}

export interface TruckStopReconciliation {
  id: string;
  stopEventId: string;
  candidateLocationIds: string[];
  status: "pending" | "resolved";
  resolvedLocationId: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
}

export function listTruckStopReconciliations(organizationId: string, status: string | null = "pending"): Promise<TruckStopReconciliation[]> {
  const search = new URLSearchParams();
  if (status !== null) search.set("status", status);
  return apiFetch<TruckStopReconciliation[]>(`/zylo-liquid/truck-stop-reconciliations?${search.toString()}`, withOrg(organizationId));
}

export function resolveTruckStopReconciliation(organizationId: string, reconciliationId: string, locationId: string | null): Promise<TruckStopReconciliation> {
  return apiFetch<TruckStopReconciliation>(`/zylo-liquid/truck-stop-reconciliations/${reconciliationId}/resolve`, {
    method: "POST", organizationId, body: JSON.stringify({ locationId }),
  });
}

export interface TruckStopComment {
  id: string;
  stopEventId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export function listTruckStopComments(organizationId: string, stopId: string): Promise<TruckStopComment[]> {
  return apiFetch<TruckStopComment[]>(`/zylo-liquid/truck-stops/${stopId}/comments`, withOrg(organizationId));
}

export function createTruckStopComment(organizationId: string, stopId: string, body: string): Promise<TruckStopComment> {
  return apiFetch<TruckStopComment>(`/zylo-liquid/truck-stops/${stopId}/comments`, { method: "POST", organizationId, body: JSON.stringify({ body }) });
}

export function updateTruckStopComment(organizationId: string, commentId: string, body: string): Promise<TruckStopComment> {
  return apiFetch<TruckStopComment>(`/zylo-liquid/truck-stop-comments/${commentId}`, { method: "PATCH", organizationId, body: JSON.stringify({ body }) });
}

export function deleteTruckStopComment(organizationId: string, commentId: string): Promise<void> {
  return apiFetch<void>(`/zylo-liquid/truck-stop-comments/${commentId}`, { method: "DELETE", organizationId });
}

export interface TruckOrderAssignment {
  id: string;
  truckId: string;
  purchaseOrderId: string;
  active: boolean;
}

export function listTrucksForPurchaseOrder(organizationId: string, purchaseOrderId: string): Promise<TruckOrderAssignment[]> {
  return apiFetch<TruckOrderAssignment[]>(`/zylo-liquid/purchase-orders/${purchaseOrderId}/trucks`, withOrg(organizationId));
}

export function assignTruckToPurchaseOrder(organizationId: string, purchaseOrderId: string, truckId: string): Promise<TruckOrderAssignment> {
  return apiFetch<TruckOrderAssignment>(`/zylo-liquid/purchase-orders/${purchaseOrderId}/trucks`, {
    method: "POST", organizationId, body: JSON.stringify({ truckId }),
  });
}

export function unassignTruckFromPurchaseOrder(organizationId: string, purchaseOrderId: string, truckId: string): Promise<void> {
  return apiFetch<void>(`/zylo-liquid/purchase-orders/${purchaseOrderId}/trucks/${truckId}`, { method: "DELETE", organizationId });
}

export function listOrdersForTruck(organizationId: string, truckId: string): Promise<TruckOrderAssignment[]> {
  return apiFetch<TruckOrderAssignment[]>(`/zylo-liquid/trucks/${truckId}/orders`, withOrg(organizationId));
}

export interface TrackingSettings {
  organizationId: string;
  stopStabilizationMinutes: number | null;
  stopRadiusMeters: number | null;
  liveViewThrottleMs: number | null;
}

export function getTrackingSettings(organizationId: string): Promise<TrackingSettings> {
  return apiFetch<TrackingSettings>("/zylo-liquid/tracking-settings", withOrg(organizationId));
}

export function updateTrackingSettings(organizationId: string, data: Partial<Omit<TrackingSettings, "organizationId">>): Promise<TrackingSettings> {
  return apiFetch<TrackingSettings>("/zylo-liquid/tracking-settings", { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

export interface TruckStopEvent {
  id: string;
  truckId: string;
  latitude: number;
  longitude: number;
  startAt: string;
  endAt: string | null;
  locationId: string | null;
  reconciliationStatus: "none" | "pending" | "resolved";
}

export interface TruckCurrentPosition {
  truckId: string;
  latitude: number | null;
  longitude: number | null;
  recordedAt: string | null;
  channel: string | null;
  currentStop: TruckStopEvent | null;
}

export function listTruckCurrentPositions(organizationId: string): Promise<TruckCurrentPosition[]> {
  return apiFetch<TruckCurrentPosition[]>("/zylo-liquid/trucks/current-positions", withOrg(organizationId));
}

export interface TruckPositionPing {
  id: string;
  gpsDeviceId: string;
  recordedAt: string;
  receivedAt: string;
  latitude: number;
  longitude: number;
  channel: string | null;
  accuracyMeters: number | null;
  speedKmh: number | null;
}

export function listTruckPositions(organizationId: string, truckId: string, params: { since?: string; until?: string } = {}): Promise<TruckPositionPing[]> {
  const search = new URLSearchParams();
  if (params.since) search.set("since", params.since);
  if (params.until) search.set("until", params.until);
  return apiFetch<TruckPositionPing[]>(`/zylo-liquid/trucks/${truckId}/positions?${search.toString()}`, withOrg(organizationId));
}

export function listTruckStops(organizationId: string, truckId: string, params: { since?: string; until?: string } = {}): Promise<TruckStopEvent[]> {
  const search = new URLSearchParams();
  if (params.since) search.set("since", params.since);
  if (params.until) search.set("until", params.until);
  return apiFetch<TruckStopEvent[]>(`/zylo-liquid/trucks/${truckId}/stops?${search.toString()}`, withOrg(organizationId));
}

// Approvisionnement — commandes fournisseur (PurchaseOrder), portée
// station, produit/fournisseur/cuve toujours en sélection depuis le
// référentiel déjà défini pour la station — jamais une saisie libre
// (mission « flux de livraison station »).
export interface PurchaseOrder {
  id: string;
  stationId: string;
  tankId: string;
  supplierId: string;
  authorUserId: string;
  orderReference: string;
  orderedVolumeLiters: number;
  orderedAt: string;
  expectedAt: string | null;
  status: "open" | "received";
}

export interface CreatePurchaseOrderInput {
  stationId: string;
  tankId: string;
  supplierId: string;
  orderReference: string;
  orderedVolumeLiters: number;
  expectedAt?: string;
}

export function listPurchaseOrders(organizationId: string, params: { stationId?: string; limit?: number } = {}): Promise<Page<PurchaseOrder>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<PurchaseOrder>>(`/zylo-liquid/purchase-orders?${search.toString()}`, withOrg(organizationId));
}

export function createPurchaseOrder(organizationId: string, data: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  return apiFetch<PurchaseOrder>("/zylo-liquid/purchase-orders", { method: "POST", organizationId, body: JSON.stringify(data) });
}

/** Génère un bon de commande PDF ou DOCX, rattaché à la commande via le
 * mécanisme Document/DocumentLink générique (mission « bon de commande +
 * aperçu/partage », 2026-09-10). */
export function generatePurchaseOrderDocument(organizationId: string, purchaseOrderId: string, format: "pdf" | "docx"): Promise<ZyloDocument> {
  return apiFetch<ZyloDocument>(`/zylo-liquid/purchase-orders/${purchaseOrderId}/generate-document`, {
    method: "POST", organizationId, body: JSON.stringify({ format }),
  });
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
  stockQuantity: number;
  lowStockThreshold: number | null;
}

export interface CreateSellableProductInput {
  stationId?: string;
  name: string;
  sku?: string;
  barcodeValue?: string;
  category?: string;
  unitPriceAmount: number;
  currencyId: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
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
  notes: string | null;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  responsibleUserEmail: string | null;
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
  notes?: string;
  responsibleUserId?: string;
}

export interface UpdateRegulatoryDocumentInput {
  authority?: string;
  sourceReference?: string;
  notes?: string;
  responsibleUserId?: string | null;
}

export function updateRegulatoryDocument(organizationId: string, documentId: string, data: UpdateRegulatoryDocumentInput): Promise<RegulatoryDocument> {
  return apiFetch<RegulatoryDocument>(`/zylo-liquid/regulatory-documents/${documentId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
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

// ================================================================
// Centre administratif et opérationnel de la station — Sécurité
// (SecurityEquipment), Fournisseurs par station (StationSupplier), Finances,
// et référentiel Supplier (jusqu'ici absent du frontend — seule la couche
// backend « Approvisionnement » (mission précédente) existait).
// ================================================================

export type SupplierCategory = "carburant" | "equipement" | "maintenance" | "securite" | "service" | "autre";

export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  type: string | null;
  category: SupplierCategory | null;
  contactName: string | null;
  contactRole: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
  address: string | null;
  taxId: string | null;
  active: boolean;
}

export interface CreateSupplierInput {
  name: string;
  type?: string;
  category?: SupplierCategory;
  contactName?: string;
  contactRole?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  address?: string;
  taxId?: string;
}

export function listSuppliers(organizationId: string, params: { limit?: number } = {}): Promise<Page<Supplier>> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<Supplier>>(`/zylo-liquid/suppliers?${search.toString()}`, withOrg(organizationId));
}

export function createSupplier(organizationId: string, data: CreateSupplierInput): Promise<Supplier> {
  return apiFetch<Supplier>("/zylo-liquid/suppliers", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateSupplier(organizationId: string, supplierId: string, data: Partial<CreateSupplierInput> & { active?: boolean }): Promise<Supplier> {
  return apiFetch<Supplier>(`/zylo-liquid/suppliers/${supplierId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

export type SecurityEquipmentCategory = "extincteur" | "systeme_incendie" | "arret_urgence" | "point_evacuation" | "zone_atex" | "autre";
export type SecurityEquipmentConformityStatus = "conforme" | "non_conforme" | "a_controler";

export interface SecurityEquipment {
  id: string;
  stationId: string;
  category: SecurityEquipmentCategory;
  label: string;
  lastControlAt: string | null;
  nextControlDueAt: string | null;
  conformityStatus: SecurityEquipmentConformityStatus;
  notes: string | null;
}

export interface CreateSecurityEquipmentInput {
  stationId: string;
  category: SecurityEquipmentCategory;
  label: string;
  lastControlAt?: string;
  nextControlDueAt?: string;
  conformityStatus?: SecurityEquipmentConformityStatus;
  notes?: string;
}

export function listSecurityEquipment(organizationId: string, params: { stationId?: string; limit?: number } = {}): Promise<Page<SecurityEquipment>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<SecurityEquipment>>(`/zylo-liquid/security-equipment?${search.toString()}`, withOrg(organizationId));
}

export function createSecurityEquipment(organizationId: string, data: CreateSecurityEquipmentInput): Promise<SecurityEquipment> {
  return apiFetch<SecurityEquipment>("/zylo-liquid/security-equipment", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateSecurityEquipment(organizationId: string, securityEquipmentId: string, data: Partial<CreateSecurityEquipmentInput>): Promise<SecurityEquipment> {
  return apiFetch<SecurityEquipment>(`/zylo-liquid/security-equipment/${securityEquipmentId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

export type SupplierContractStatus = "valid" | "renew_soon" | "expired" | "unknown";

export interface StationSupplier {
  id: string;
  stationId: string;
  supplierId: string;
  active: boolean;
  notes: string | null;
  contractReference: string | null;
  contractType: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  equipmentTags: string | null;
  contractStatus: SupplierContractStatus;
}

export interface CreateStationSupplierInput {
  stationId: string;
  supplierId: string;
  notes?: string;
  contractReference?: string;
  contractType?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  equipmentTags?: string;
}

export type UpdateStationSupplierInput = Partial<Omit<CreateStationSupplierInput, "stationId" | "supplierId">> & { active?: boolean };

export function listStationSuppliers(organizationId: string, params: { stationId?: string; limit?: number } = {}): Promise<Page<StationSupplier>> {
  const search = new URLSearchParams();
  if (params.stationId) search.set("stationId", params.stationId);
  search.set("limit", String(params.limit ?? 100));
  return apiFetch<Page<StationSupplier>>(`/zylo-liquid/station-suppliers?${search.toString()}`, withOrg(organizationId));
}

export function createStationSupplier(organizationId: string, data: CreateStationSupplierInput): Promise<StationSupplier> {
  return apiFetch<StationSupplier>("/zylo-liquid/station-suppliers", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateStationSupplier(organizationId: string, stationSupplierId: string, data: UpdateStationSupplierInput): Promise<StationSupplier> {
  return apiFetch<StationSupplier>(`/zylo-liquid/station-suppliers/${stationSupplierId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

/** Sous-ressource dédiée — jamais fusionnée dans `Station`/`StationResponse`
 * standard, gardée par `STATION_FINANCIAL_READ`/`MANAGE` côté backend (même
 * principe que la valorisation du stock gardée par `PRICE_HISTORY_READ`). */
export interface StationFinancial {
  stationId: string;
  taxId: string | null;
  billingAddress: string | null;
  costCenterCode: string | null;
  bankAccountInfo: string | null;
}

export function getStationFinancial(organizationId: string, stationId: string): Promise<StationFinancial> {
  return apiFetch<StationFinancial>(`/zylo-liquid/stations/${stationId}/financial`, withOrg(organizationId));
}

export function updateStationFinancial(organizationId: string, stationId: string, data: Partial<Omit<StationFinancial, "stationId">>): Promise<StationFinancial> {
  return apiFetch<StationFinancial>(`/zylo-liquid/stations/${stationId}/financial`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

export interface ZyloDocument {
  id: string;
  organizationId: string;
  storageReference: string;
  fileName: string;
  mimeType: string | null;
  uploadedByUserId: string;
  sensitivityLevel: "normal" | "restreint";
  supersedesDocumentId: string | null;
  deletedAt: string | null;
}

export function listDocumentsByEntity(organizationId: string, linkedEntityType: string, linkedEntityId: string): Promise<ZyloDocument[]> {
  const search = new URLSearchParams({ linkedEntityType, linkedEntityId });
  return apiFetch<ZyloDocument[]>(`/zylo-liquid/documents/by-entity?${search.toString()}`, withOrg(organizationId));
}

/** Un seul appel réseau pour le nombre de pièces jointes de PLUSIEURS
 * entités (table Réglementation/Fournisseurs) — remplace un
 * `listDocumentsByEntity` par ligne, cause directe de lenteur constatée
 * sur une base distante (audit performance). */
export function countDocumentsByEntity(organizationId: string, linkedEntityType: string, linkedEntityIds: string[]): Promise<Record<string, number>> {
  if (linkedEntityIds.length === 0) return Promise.resolve({});
  const search = new URLSearchParams({ linkedEntityType, linkedEntityIds: linkedEntityIds.join(",") });
  return apiFetch<{ counts: Record<string, number> }>(`/zylo-liquid/documents/counts-by-entity?${search.toString()}`, withOrg(organizationId)).then((r) => r.counts);
}

export function createDocument(
  organizationId: string,
  data: { storageReference: string; fileName: string; mimeType?: string; linkedEntityType?: string; linkedEntityId?: string; sensitivityLevel?: "normal" | "restreint" }
): Promise<ZyloDocument> {
  return apiFetch<ZyloDocument>("/zylo-liquid/documents", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function deleteDocument(organizationId: string, documentId: string): Promise<ZyloDocument> {
  return apiFetch<ZyloDocument>(`/zylo-liquid/documents/${documentId}`, { method: "DELETE", organizationId });
}

export function getDocumentDownloadUrl(organizationId: string, documentId: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(`/zylo-liquid/documents/${documentId}/download-url`, withOrg(organizationId));
}

// ================================================================
// Module Personnel — création de compte + profil de poste pour un membre du
// personnel d'une station (mockup emalioration/personnel/). Le rôle
// lui-même reste géré par le RBAC existant (@/core/api/rbac), jamais
// dupliqué ici.
// ================================================================

export interface StationStaff {
  id: string;
  userId: string;
  organizationId: string;
  email: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  photoUrl: string | null;
  status: string;
  employeeNumber: string | null;
  contractType: string | null;
  assignedStationId: string | null;
  directManagerUserId: string | null;
  assignedAt: string;
}

export interface CreateStationStaffInput {
  stationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photoStorageReference?: string;
  roleId?: string;
  employeeNumber?: string;
  contractType?: string;
  directManagerUserId?: string;
}

export interface CreateStationStaffResult {
  staff: StationStaff;
  /** N'apparaît que dans cette réponse, une seule fois — jamais rejoué par
   * aucun autre appel. À afficher au gérant puis oublier côté client. */
  temporaryPassword: string;
}

export function createStationStaff(organizationId: string, data: CreateStationStaffInput): Promise<CreateStationStaffResult> {
  return apiFetch<CreateStationStaffResult>("/zylo-liquid/station-staff", { method: "POST", organizationId, body: JSON.stringify(data) });
}

export function updateStationStaff(
  organizationId: string,
  userId: string,
  data: Partial<Omit<CreateStationStaffInput, "stationId" | "email" | "roleId">> & { assignedStationId?: string }
): Promise<StationStaff> {
  return apiFetch<StationStaff>(`/zylo-liquid/station-staff/${userId}`, { method: "PATCH", organizationId, body: JSON.stringify(data) });
}

export function deactivateStationStaff(organizationId: string, userId: string): Promise<StationStaff> {
  return apiFetch<StationStaff>(`/zylo-liquid/station-staff/${userId}/deactivate`, { method: "POST", organizationId });
}

/** Remplace, pour ce membre du personnel, son rôle scopé à sa station
 * d'affectation — depuis la fiche Personnel, sans passer par l'écran RBAC
 * global `/roles/{roleId}` (gestion des droits, 2026-09-16). */
export function changeStationStaffRole(organizationId: string, userId: string, roleId: string): Promise<StationStaff> {
  return apiFetch<StationStaff>(`/zylo-liquid/station-staff/${userId}/role`, { method: "PUT", organizationId, body: JSON.stringify({ roleId }) });
}

export interface ResetStationStaffPasswordResult {
  /** N'apparaît que dans cette réponse, une seule fois — même contrat que
   * `CreateStationStaffResult.temporaryPassword`. */
  temporaryPassword: string;
}

export function resetStationStaffPassword(organizationId: string, userId: string): Promise<ResetStationStaffPasswordResult> {
  return apiFetch<ResetStationStaffPasswordResult>(`/zylo-liquid/station-staff/${userId}/reset-password`, { method: "POST", organizationId });
}

export function listStationStaff(organizationId: string, stationId: string): Promise<StationStaff[]> {
  const search = new URLSearchParams({ stationId });
  return apiFetch<StationStaff[]>(`/zylo-liquid/station-staff?${search.toString()}`, withOrg(organizationId));
}
