"use client";

import { useQuery } from "@tanstack/react-query";

import {
  listCurrencies,
  listDeliveries,
  listFuelProducts,
  listPrices,
  listStations,
  listTanks,
  type Currency,
  type Delivery,
  type FuelProduct,
  type PriceHistoryEntry,
  type Station,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

export interface DeliveryFilters {
  stationId?: string;
  tankId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface DeliveryRow {
  delivery: Delivery;
  tank: Tank | null;
  station: Station | null;
  fuelProduct: FuelProduct | null;
  /** Valorisation au prix de vente **actuel** (aucun historique de prix par
   * livraison n'existe côté backend — ce n'est pas le prix en vigueur au
   * moment réel de la livraison). null si aucun prix n'est enregistré. */
  valueAmount: number | null;
  currencyCode: string | null;
}

export interface DeliveryProductSummary {
  fuelProductId: string;
  fuelProductName: string;
  displayColor: string | null;
  count: number;
  volumeLiters: number;
  valueAmount: number | null;
  currencyCode: string | null;
}

export interface DeliveryStationGroup {
  station: Station;
  count: number;
  volumeLiters: number;
  rows: DeliveryRow[];
}

interface DeliveriesListData {
  deliveries: Delivery[];
  tanks: Tank[];
  stations: Station[];
  fuelProducts: FuelProduct[];
  prices: PriceHistoryEntry[];
  currencies: Currency[];
}

/** Prix de vente actuellement en vigueur pour un couple (station, produit) —
 * la ligne non future dont `effectiveFrom` est la plus récente. */
function findCurrentPrice(prices: PriceHistoryEntry[], stationId: string, fuelProductId: string): PriceHistoryEntry | null {
  const candidates = prices.filter((p) => p.stationId === stationId && p.fuelProductId === fuelProductId && !p.isFuture);
  if (candidates.length === 0) return null;
  return candidates.reduce((latest, p) => (p.effectiveFrom > latest.effectiveFrom ? p : latest));
}

async function fetchDeliveriesList(organizationId: string, filters: DeliveryFilters): Promise<DeliveriesListData> {
  const [deliveriesPage, tanksPage, stationsPage, fuelProductsPage, pricesPage, currenciesPage] = await Promise.all([
    listDeliveries(organizationId, { stationId: filters.stationId, tankId: filters.tankId, fromDate: filters.fromDate, toDate: filters.toDate, limit: 100 }),
    listTanks(organizationId),
    listStations(organizationId),
    listFuelProducts(organizationId),
    listPrices(organizationId, { limit: 100 }),
    listCurrencies(organizationId),
  ]);
  return {
    deliveries: deliveriesPage.data,
    tanks: tanksPage.data,
    stations: stationsPage.data,
    fuelProducts: fuelProductsPage.data,
    prices: pricesPage.data,
    currencies: currenciesPage.data,
  };
}

/** Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * revenir sur cette liste après l'avoir quittée affiche instantanément la
 * dernière donnée connue au lieu de tout recharger. Utilisé aussi bien par
 * la page globale que par `DeliveriesBrowserModal` (scope station/cuve) —
 * `filters` (station/tank/dates) fait entièrement partie de la clé de
 * requête pour ne jamais partager le cache entre deux scopes différents. */
export function useDeliveriesList(organizationId: string | null, filters: DeliveryFilters) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "deliveries-list", organizationId, filters.stationId, filters.tankId, filters.fromDate, filters.toDate],
    queryFn: () => fetchDeliveriesList(organizationId as string, filters),
    enabled: !!organizationId,
  });

  const deliveries = query.data?.deliveries ?? [];
  const tanks = query.data?.tanks ?? [];
  const stations = query.data?.stations ?? [];
  const fuelProducts = query.data?.fuelProducts ?? [];
  const prices = query.data?.prices ?? [];
  const currencies = query.data?.currencies ?? [];
  const loading = !!organizationId && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

  const tankById = new Map(tanks.map((t) => [t.id, t]));
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));
  const currencyById = new Map(currencies.map((c) => [c.id, c]));

  const rows: DeliveryRow[] = deliveries
    .map((delivery) => {
      const tank = tankById.get(delivery.tankId) ?? null;
      const station = stationById.get(delivery.stationId) ?? null;
      const fuelProduct = tank ? fuelProductById.get(tank.fuelProductId) ?? null : null;

      let valueAmount: number | null = null;
      let currencyCode: string | null = null;
      if (fuelProduct && delivery.volumeLiters !== null) {
        const price = findCurrentPrice(prices, delivery.stationId, fuelProduct.id);
        const currency = price ? currencyById.get(price.currencyId) ?? null : null;
        if (price && currency) {
          valueAmount = price.priceAmount * delivery.volumeLiters;
          currencyCode = currency.code;
        }
      }

      return { delivery, tank, station, fuelProduct, valueAmount, currencyCode };
    })
    .sort((a, b) => (a.delivery.endTime < b.delivery.endTime ? 1 : -1));

  const totalVolumeLiters = rows.reduce((sum, r) => sum + (r.delivery.volumeLiters ?? 0), 0);

  const productSummaries: DeliveryProductSummary[] = (() => {
    const byProduct = new Map<string, DeliveryProductSummary>();
    for (const row of rows) {
      if (!row.fuelProduct) continue;
      const entry = byProduct.get(row.fuelProduct.id) ?? {
        fuelProductId: row.fuelProduct.id,
        fuelProductName: row.fuelProduct.name,
        displayColor: row.fuelProduct.displayColor,
        count: 0,
        volumeLiters: 0,
        valueAmount: null,
        currencyCode: null,
      };
      entry.count += 1;
      entry.volumeLiters += row.delivery.volumeLiters ?? 0;
      if (row.valueAmount !== null && row.currencyCode) {
        entry.valueAmount = (entry.valueAmount ?? 0) + row.valueAmount;
        entry.currencyCode = row.currencyCode;
      }
      byProduct.set(row.fuelProduct.id, entry);
    }
    return [...byProduct.values()];
  })();

  const stationGroups: DeliveryStationGroup[] = (() => {
    const byStation = new Map<string, DeliveryStationGroup>();
    for (const row of rows) {
      if (!row.station) continue;
      const entry = byStation.get(row.station.id) ?? { station: row.station, count: 0, volumeLiters: 0, rows: [] };
      entry.count += 1;
      entry.volumeLiters += row.delivery.volumeLiters ?? 0;
      entry.rows.push(row);
      byStation.set(row.station.id, entry);
    }
    return [...byStation.values()].sort((a, b) => a.station.name.localeCompare(b.station.name));
  })();

  return {
    loading,
    error,
    rows,
    stations,
    tanks,
    fuelProducts,
    totalVolumeLiters,
    productSummaries,
    stationGroups,
    reload: async () => {
      await query.refetch();
    },
  };
}
