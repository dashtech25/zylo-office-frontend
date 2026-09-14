"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelProductSaleTransaction,
  createProductSaleTransaction,
  createSellableProduct,
  listCommercialAccounts,
  listCurrencies,
  listProductSaleTransactions,
  listSellableProducts,
  listStations,
  type CreateProductSaleTransactionInput,
  type CreateSellableProductInput,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchProduitsData(organizationId: string) {
  const [stationsPage, productsPage, transactionsPage, currenciesPage, accountsPage] = await Promise.all([
    listStations(organizationId),
    listSellableProducts(organizationId, { limit: 100 }),
    listProductSaleTransactions(organizationId, { limit: 100 }),
    listCurrencies(organizationId, 100),
    listCommercialAccounts(organizationId).catch(() => ({ data: [], meta: { total: 0, limit: 0, offset: 0 } })),
  ]);
  return {
    stations: stationsPage.data,
    products: productsPage.data,
    transactions: transactionsPage.data,
    currencies: currenciesPage.data,
    commercialAccounts: accountsPage.data,
  };
}

/** Catalogue produits boutique + ventes comptoir (Blocs 4 corrigé/5 de la
 * mission « vente-maintenant-reglementation ») — entité `ProductSaleTransaction`
 * volontairement séparée de `Sale` (carburant, jamais un fait nouveau
 * indépendant). */
export function useProduits(organizationId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["zylo-liquid", "produits", organizationId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchProduitsData(organizationId as string),
    enabled: !!organizationId,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  async function addProduct(data: CreateSellableProductInput) {
    if (!organizationId) return;
    await createSellableProduct(organizationId, data);
    await invalidate();
  }

  async function submitSale(data: CreateProductSaleTransactionInput) {
    if (!organizationId) return;
    await createProductSaleTransaction(organizationId, data);
    await invalidate();
  }

  async function cancelSale(transactionId: string) {
    if (!organizationId) return;
    await cancelProductSaleTransaction(organizationId, transactionId);
    await invalidate();
  }

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    stations: query.data?.stations ?? [],
    products: query.data?.products ?? [],
    transactions: query.data?.transactions ?? [],
    currencies: query.data?.currencies ?? [],
    commercialAccounts: query.data?.commercialAccounts ?? [],
    addProduct,
    submitSale,
    cancelSale,
    reload: invalidate,
  };
}
