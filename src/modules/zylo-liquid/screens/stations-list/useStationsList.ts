"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getNetworkSummary,
  getStationCurrentState,
  listAlerts,
  listCities,
  listCurrencies,
  listFuelProducts,
  listStations,
  listTanks,
  type Alert,
  type City,
  type Currency,
  type FuelProduct,
  type NetworkSummary,
  type Station,
  type StationCurrentState,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { computeStationOnlineStatus } from "@/modules/zylo-liquid/utils/stationStatus";

export interface StationProductBreakdown {
  fuelProductId: string;
  fuelProductName: string;
  displayColor: string | null;
  tankCount: number;
  volumeLiters: number;
  capacityLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  sellableVolumeLiters: number;
  sellableMonetaryValue: number | null;
  /** Vrai si au moins une cuve de ce produit a atteint son seuil bas
   * (Tank.lowAlarmMm, comparé en hauteur nette comme le fait le backend
   * dans evaluate_threshold_alarms — jamais un pourcentage de capacité). */
  belowLowThreshold: boolean;
}

export interface StationRow {
  station: Station;
  online: boolean;
  state: "offline" | "critical" | "alert" | "online";
  alertsCount: number;
  lastMeasurementAt: string | null;
  products: StationProductBreakdown[];
  totalVolumeLiters: number;
  totalCapacityLiters: number;
  totalValue: number | null;
  totalCurrencyCode: string | null;
  totalSellableVolumeLiters: number;
  totalSellableValue: number | null;
  pricingStatus: "complete" | "partial" | "none" | "mixed_currency";
}

interface StationsListData {
  stations: Station[];
  tanks: Tank[];
  fuelProducts: FuelProduct[];
  statesByStation: Record<string, StationCurrentState>;
  activeAlertsCount: number;
  activeAlerts: Alert[];
  networkSummary: NetworkSummary | null;
  cities: City[];
  currencies: Currency[];
}

async function fetchStationsList(organizationId: string): Promise<StationsListData> {
  // La liste des stations est le SEUL appel dont l'échec doit faire échouer
  // toute la page (elle est la donnée principale de cet écran). Tout le
  // reste est un COMPLÉMENT (KPI réseau, produits, alertes) qui peut
  // légitimement être hors de portée pour un utilisateur scopé à une seule
  // station (ex. un pompiste sans `fuelProduct.read` — un rôle par défaut
  // plus restreint que le propriétaire) — un 403 sur l'un de ces compléments
  // ne doit jamais masquer la station que l'utilisateur A le droit de voir
  // (résout le point bloquant de `processus-double-sources-verite/02-modele-
  // double-source.md` §6 : la portée existait déjà côté vérification, elle
  // doit maintenant être VISIBLE et UTILISABLE de bout en bout, pas
  // seulement techniquement correcte).
  const emptyPage = { data: [], meta: { total: 0, limit: 0, offset: 0 } };
  const stationsPage = await listStations(organizationId);
  const [tanksPage, fuelProductsPage, alertsPage, summary, citiesPage, currenciesPage] = await Promise.all([
    listTanks(organizationId).catch(() => ({ ...emptyPage, data: [] as Tank[] })),
    listFuelProducts(organizationId).catch(() => ({ ...emptyPage, data: [] as FuelProduct[] })),
    listAlerts(organizationId, { status: "active", limit: 100 }).catch(() => ({ ...emptyPage, data: [] as Alert[] })),
    getNetworkSummary(organizationId).catch(() => null),
    listCities(organizationId, { limit: 100 }).catch(() => ({ data: [] as City[], meta: { total: 0, limit: 0, offset: 0 } })),
    listCurrencies(organizationId).catch(() => ({ data: [] as Currency[], meta: { total: 0, limit: 0, offset: 0 } })),
  ]);
  const activeStations = stationsPage.data.filter((s) => s.status === "active");
  const states = await Promise.all(activeStations.map((s) => getStationCurrentState(organizationId, s.id).catch(() => null)));
  const statesByStation: Record<string, StationCurrentState> = {};
  activeStations.forEach((s, i) => {
    const state = states[i];
    if (state) statesByStation[s.id] = state;
  });

  return {
    stations: stationsPage.data,
    tanks: tanksPage.data,
    fuelProducts: fuelProductsPage.data,
    statesByStation,
    activeAlertsCount: alertsPage.meta.total,
    activeAlerts: alertsPage.data,
    networkSummary: summary,
    cities: citiesPage.data,
    currencies: currenciesPage.data,
  };
}

/** Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * revenir sur la liste des stations après l'avoir quittée affiche
 * instantanément la dernière donnée connue au lieu de tout recharger. */
export function useStationsList(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "stations-list", organizationId],
    queryFn: () => fetchStationsList(organizationId as string),
    enabled: !!organizationId,
  });

  const data = query.data;
  const loading = !!organizationId && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;
  const stations = data?.stations ?? [];
  const tanks = data?.tanks ?? [];
  const fuelProducts = data?.fuelProducts ?? [];
  const statesByStation = data?.statesByStation ?? {};
  const activeAlertsCount = data?.activeAlertsCount ?? 0;
  const activeAlerts = data?.activeAlerts ?? [];
  const networkSummary = data?.networkSummary ?? null;
  const cities = data?.cities ?? [];
  const currencies = data?.currencies ?? [];

  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));
  const tankById = new Map(tanks.map((t) => [t.id, t]));
  const alertsByStation = new Map<string, Alert[]>();
  for (const alert of activeAlerts) {
    // Étape 2 tracking — une alerte de camion n'a pas de station, jamais
    // regroupée ici (cette carte est spécifiquement "alertes par station").
    if (alert.stationId === null) continue;
    const list = alertsByStation.get(alert.stationId) ?? [];
    list.push(alert);
    alertsByStation.set(alert.stationId, list);
  }

  const rows: StationRow[] = stations.map((station) => {
    const state = statesByStation[station.id];
    const tankStates = state?.tanks ?? [];
    const { online } = computeStationOnlineStatus(tankStates);

    const byProduct = new Map<string, StationProductBreakdown>();
    let lastMeasurementAt: string | null = null;

    for (const tankState of tankStates) {
      const tank = tankById.get(tankState.tankId);
      if (!tank) continue;
      const product = fuelProductById.get(tank.fuelProductId);
      const key = tank.fuelProductId;
      const entry =
        byProduct.get(key) ??
        ({
          fuelProductId: key,
          fuelProductName: product?.name ?? "?",
          displayColor: product?.displayColor ?? null,
          tankCount: 0,
          volumeLiters: 0,
          capacityLiters: 0,
          monetaryValue: 0,
          currencyCode: null,
          sellableVolumeLiters: 0,
          sellableMonetaryValue: 0,
          belowLowThreshold: false,
        } satisfies StationProductBreakdown);

      entry.tankCount += 1;
      entry.volumeLiters += tankState.volumeLiters ?? 0;
      entry.capacityLiters += tank.calibratedCapacityLiters ?? tank.capacityLiters;
      entry.sellableVolumeLiters += tankState.sellableVolumeLiters ?? 0;
      if (tankState.monetaryValue !== null && tankState.currencyCode) {
        entry.monetaryValue = (entry.monetaryValue ?? 0) + tankState.monetaryValue;
        entry.currencyCode = tankState.currencyCode;
        if (tankState.sellableVolumeLiters !== null && tankState.unitPriceAmount !== null) {
          entry.sellableMonetaryValue = (entry.sellableMonetaryValue ?? 0) + tankState.sellableVolumeLiters * tankState.unitPriceAmount;
        }
      }
      if (tankState.heightMm !== null) {
        const netHeightMm = tankState.heightMm - (tankState.waterHeightMm ?? 0);
        if (netHeightMm <= tank.lowAlarmMm) entry.belowLowThreshold = true;
      }
      byProduct.set(key, entry);

      if (tankState.lastMeasurementAt && (!lastMeasurementAt || tankState.lastMeasurementAt > lastMeasurementAt)) {
        lastMeasurementAt = tankState.lastMeasurementAt;
      }
    }

    const products = [...byProduct.values()];
    const totalVolumeLiters = products.reduce((sum, p) => sum + p.volumeLiters, 0);
    const totalCapacityLiters = tanks
      .filter((t) => t.stationId === station.id && t.active)
      .reduce((sum, t) => sum + (t.calibratedCapacityLiters ?? t.capacityLiters), 0);
    const currencyCodes = new Set(products.map((p) => p.currencyCode).filter((c): c is string => c !== null));
    const pricedCount = products.filter((p) => p.currencyCode !== null).length;
    const pricingStatus: "complete" | "partial" | "none" | "mixed_currency" =
      currencyCodes.size > 1 ? "mixed_currency" : pricedCount === 0 ? "none" : pricedCount < products.length ? "partial" : "complete";
    const totalValue = currencyCodes.size === 1 ? products.reduce((sum, p) => sum + (p.monetaryValue ?? 0), 0) : null;
    const totalSellableVolumeLiters = products.reduce((sum, p) => sum + p.sellableVolumeLiters, 0);
    const totalSellableValue = currencyCodes.size === 1 ? products.reduce((sum, p) => sum + (p.sellableMonetaryValue ?? 0), 0) : null;

    const stationAlerts = alertsByStation.get(station.id) ?? [];
    const hasCriticalAlert = stationAlerts.some((a) => a.type === "leak" || a.type === "level_high");
    const rowState: "offline" | "critical" | "alert" | "online" = !online ? "offline" : hasCriticalAlert ? "critical" : stationAlerts.length > 0 ? "alert" : "online";

    return {
      station,
      online,
      state: rowState,
      alertsCount: stationAlerts.length,
      lastMeasurementAt,
      products,
      totalVolumeLiters,
      totalCapacityLiters,
      totalValue,
      totalCurrencyCode: currencyCodes.size === 1 ? [...currencyCodes][0] : null,
      totalSellableVolumeLiters,
      totalSellableValue,
      pricingStatus,
    };
  });

  const stationsActiveCount = stations.filter((s) => s.status === "active").length;
  const stationsOfflineCount = rows.filter((r) => r.station.status === "active" && !r.online).length;

  return {
    loading,
    error,
    rows,
    stations,
    tanks,
    fuelProducts,
    cities,
    currencies,
    activeAlertsCount,
    activeAlerts,
    stationsActiveCount,
    stationsOfflineCount,
    networkSummary,
    stationStates: statesByStation,
    reload: async () => {
      await query.refetch();
    },
  };
}
