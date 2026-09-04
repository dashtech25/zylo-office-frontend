"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createFuelProduct,
  listFuelProducts,
  updateFuelProduct,
  type CreateFuelProductInput,
  type FuelProduct,
  type UpdateFuelProductInput,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

export function useFuelCatalog(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<FuelProduct[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await listFuelProducts(organizationId, 100);
      setProducts(page.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(data: CreateFuelProductInput) {
    if (!organizationId) return;
    await createFuelProduct(organizationId, data);
    await load();
  }

  async function update(id: string, data: UpdateFuelProductInput) {
    if (!organizationId) return;
    await updateFuelProduct(organizationId, id, data);
    await load();
  }

  return { loading, error, products, create, update, reload: load };
}
