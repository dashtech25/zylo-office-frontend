"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  bulkImportSellableProducts,
  cancelProductSaleTransaction,
  createProductSaleTransaction,
  createSellableProduct,
  createSellableProductPrice,
  listCommercialAccounts,
  listCurrencies,
  listProductSaleTransactions,
  listSellableProducts,
  listStations,
  updateSellableProduct,
  type BulkImportSellableProductRow,
  type CreateProductSaleTransactionInput,
  type CreateSellableProductInput,
  type CreateSellableProductPriceInput,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchProduitsData(organizationId: string, stationId: string | null) {
  const [stationsPage, productsPage, transactionsPage, currenciesPage, accountsPage] = await Promise.all([
    listStations(organizationId),
    listSellableProducts(organizationId, { limit: 100, stationId: stationId ?? undefined }),
    listProductSaleTransactions(organizationId, { limit: 100, stationId: stationId ?? undefined }),
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
 * mission « vente-maintenant-reglementation », Phase 4 mission Boutique pour
 * le stock) — entité `ProductSaleTransaction` volontairement séparée de
 * `Sale` (carburant, jamais un fait nouveau indépendant). Passer `stationId`
 * scope le catalogue/l'historique à cette station (+ catalogue réseau
 * partagé, `stationId` nul côté backend) — utilisé par la section
 * « Boutique » de `StationAdminCenter` ; `null` (défaut) donne la vue réseau
 * consolidée de l'écran `/produits`. */
export function useProduits(organizationId: string | null, stationId: string | null = null) {
  const queryClient = useQueryClient();
  const queryKey = ["zylo-liquid", "produits", organizationId, stationId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchProduitsData(organizationId as string, stationId),
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

  async function editProduct(productId: string, data: Partial<CreateSellableProductInput> & { active?: boolean }) {
    if (!organizationId) return;
    await updateSellableProduct(organizationId, productId, data);
    await invalidate();
  }

  async function setPrice(productId: string, data: CreateSellableProductPriceInput) {
    if (!organizationId) return;
    await createSellableProductPrice(organizationId, productId, data);
    await invalidate();
  }

  async function importProducts(rows: BulkImportSellableProductRow[]) {
    if (!organizationId) return { createdCount: 0, errors: [] };
    const result = await bulkImportSellableProducts(organizationId, rows);
    await invalidate();
    return result;
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
    editProduct,
    setPrice,
    importProducts,
    submitSale,
    cancelSale,
    reload: invalidate,
  };
}
