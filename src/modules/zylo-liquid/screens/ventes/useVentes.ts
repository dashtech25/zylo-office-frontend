"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSale,
  listCommercialAccounts,
  listCurrencies,
  listFuelProducts,
  listSales,
  listStations,
  type CreateSaleInput,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchVentesData(organizationId: string) {
  const [salesPage, stationsPage, productsPage, currenciesPage, accountsPage] = await Promise.all([
    listSales(organizationId, { limit: 100 }),
    listStations(organizationId),
    listFuelProducts(organizationId),
    listCurrencies(organizationId, 100),
    listCommercialAccounts(organizationId).catch(() => ({ data: [], meta: { total: 0, limit: 0, offset: 0 } })),
  ]);
  return {
    sales: salesPage.data,
    stations: stationsPage.data,
    fuelProducts: productsPage.data,
    currencies: currenciesPage.data,
    commercialAccounts: accountsPage.data,
  };
}

/** Vente — qualification commerciale d'une distribution déjà constatée
 * (processus-double-sources-verite, Phase 5 §5) : ne qualifie jamais un
 * fait nouveau, toujours une distribution déjà déclarée/mesurée ailleurs. */
export function useVentes(organizationId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["zylo-liquid", "ventes", organizationId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchVentesData(organizationId as string),
    enabled: !!organizationId,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  async function create(data: CreateSaleInput) {
    if (!organizationId) return;
    await createSale(organizationId, data);
    await invalidate();
  }

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    sales: query.data?.sales ?? [],
    stations: query.data?.stations ?? [],
    fuelProducts: query.data?.fuelProducts ?? [],
    currencies: query.data?.currencies ?? [],
    commercialAccounts: query.data?.commercialAccounts ?? [],
    create,
    reload: invalidate,
  };
}
