"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createPriceHistory,
  listCurrencies,
  listPrices,
  listStations,
  updatePriceHistory,
  type CreatePriceHistoryInput,
  type Currency,
  type PriceHistoryEntry,
  type Station,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

export function usePrices(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceHistoryEntry[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [pricesPage, stationsPage, currenciesPage] = await Promise.all([
        listPrices(organizationId, { limit: 50 }),
        listStations(organizationId),
        listCurrencies(organizationId),
      ]);
      setPrices(pricesPage.data);
      setStations(stationsPage.data);
      setCurrencies(currenciesPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(data: CreatePriceHistoryInput) {
    if (!organizationId) return;
    await createPriceHistory(organizationId, data);
    await load();
  }

  async function update(priceId: string, data: { priceAmount?: number; costAmount?: number; changeReason?: string }) {
    if (!organizationId) return;
    await updatePriceHistory(organizationId, priceId, data);
    await load();
  }

  return { loading, error, prices, stations, currencies, create, update, reload: load };
}
