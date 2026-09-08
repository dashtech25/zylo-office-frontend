"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createSale,
  listCommercialAccounts,
  listCurrencies,
  listFuelProducts,
  listSales,
  listStations,
  type CommercialAccount,
  type CreateSaleInput,
  type Currency,
  type FuelProduct,
  type Sale,
  type Station,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Vente — qualification commerciale d'une distribution déjà constatée
 * (processus-double-sources-verite, Phase 5 §5) : ne qualifie jamais un
 * fait nouveau, toujours une distribution déjà déclarée/mesurée ailleurs. */
export function useVentes(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [fuelProducts, setFuelProducts] = useState<FuelProduct[]>([]);
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
      const [salesPage, stationsPage, productsPage, currenciesPage, accountsPage] = await Promise.all([
        listSales(organizationId, { limit: 100 }),
        listStations(organizationId),
        listFuelProducts(organizationId),
        listCurrencies(organizationId, 100),
        listCommercialAccounts(organizationId).catch(() => ({ data: [], meta: { total: 0, limit: 0, offset: 0 } })),
      ]);
      setSales(salesPage.data);
      setStations(stationsPage.data);
      setFuelProducts(productsPage.data);
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

  async function create(data: CreateSaleInput) {
    if (!organizationId) return;
    await createSale(organizationId, data);
    await load();
  }

  return { loading, error, sales, stations, fuelProducts, currencies, commercialAccounts, create, reload: load };
}
