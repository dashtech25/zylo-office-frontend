"use client";

import { useCallback, useEffect, useState } from "react";

import {
  cancelProductSaleTransaction,
  createProductSaleTransaction,
  createSellableProduct,
  listCommercialAccounts,
  listCurrencies,
  listProductSaleTransactions,
  listSellableProducts,
  listStations,
  type CommercialAccount,
  type CreateProductSaleTransactionInput,
  type CreateSellableProductInput,
  type Currency,
  type ProductSaleTransaction,
  type SellableProduct,
  type Station,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Catalogue produits boutique + ventes comptoir (Blocs 4 corrigé/5 de la
 * mission « vente-maintenant-reglementation ») — entité `ProductSaleTransaction`
 * volontairement séparée de `Sale` (carburant, jamais un fait nouveau
 * indépendant). */
export function useProduits(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [products, setProducts] = useState<SellableProduct[]>([]);
  const [transactions, setTransactions] = useState<ProductSaleTransaction[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [commercialAccounts, setCommercialAccounts] = useState<CommercialAccount[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [stationsPage, productsPage, transactionsPage, currenciesPage, accountsPage] = await Promise.all([
        listStations(organizationId),
        listSellableProducts(organizationId, { limit: 100 }),
        listProductSaleTransactions(organizationId, { limit: 100 }),
        listCurrencies(organizationId, 100),
        listCommercialAccounts(organizationId).catch(() => ({ data: [], meta: { total: 0, limit: 0, offset: 0 } })),
      ]);
      setStations(stationsPage.data);
      setProducts(productsPage.data);
      setTransactions(transactionsPage.data);
      setCurrencies(currenciesPage.data);
      setCommercialAccounts(accountsPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addProduct(data: CreateSellableProductInput) {
    if (!organizationId) return;
    await createSellableProduct(organizationId, data);
    await load();
  }

  async function submitSale(data: CreateProductSaleTransactionInput) {
    if (!organizationId) return;
    await createProductSaleTransaction(organizationId, data);
    await load();
  }

  async function cancelSale(transactionId: string) {
    if (!organizationId) return;
    await cancelProductSaleTransaction(organizationId, transactionId);
    await load();
  }

  return { loading, error, stations, products, transactions, currencies, commercialAccounts, addProduct, submitSale, cancelSale, reload: load };
}
