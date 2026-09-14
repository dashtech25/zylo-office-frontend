"use client";

import { useQuery } from "@tanstack/react-query";

import {
  createFuelProduct,
  listFuelProducts,
  updateFuelProduct,
  type CreateFuelProductInput,
  type FuelProduct,
  type UpdateFuelProductInput,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchFuelCatalog(organizationId: string): Promise<FuelProduct[]> {
  const page = await listFuelProducts(organizationId, 100);
  return page.data;
}

/** Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * requête indépendante des autres onglets de `ConfigurationScreen`
 * (prix, associations produit×station) : son propre chargement/skeleton
 * n'attend jamais celui des autres sections. */
export function useFuelCatalog(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "fuel-catalog", organizationId],
    queryFn: () => fetchFuelCatalog(organizationId as string),
    enabled: !!organizationId,
  });

  const products = query.data ?? [];
  const loading = !!organizationId && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

  async function create(data: CreateFuelProductInput) {
    if (!organizationId) return;
    await createFuelProduct(organizationId, data);
    await query.refetch();
  }

  async function update(id: string, data: UpdateFuelProductInput) {
    if (!organizationId) return;
    await updateFuelProduct(organizationId, id, data);
    await query.refetch();
  }

  return {
    loading,
    error,
    products,
    create,
    update,
    reload: async () => {
      await query.refetch();
    },
  };
}
