"use client";

import { useQuery } from "@tanstack/react-query";

import {
  createStationFuelProduct,
  listStationFuelProducts,
  updateStationFuelProduct,
  type StationFuelProduct,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchStationFuelProducts(organizationId: string): Promise<StationFuelProduct[]> {
  // Le backend plafonne `limit` à 100 (PaginationParams, `le=100`) — 500
  // renvoyait systématiquement un 422 (bug préexistant découvert par le
  // test E2E réel de refonte-configuration-zylo-liquid.md, jamais visible
  // avant faute de test bout-en-bout).
  const page = await listStationFuelProducts(organizationId, { limit: 100 });
  return page.data;
}

/** Association explicite produit ↔ station (page_configuration.md §15) —
 * jamais déduite d'une cuve existante ou d'un prix déjà saisi. Charge tout
 * le réseau en une fois (organisation de taille modeste à ce stade) plutôt
 * que par produit, pour permettre l'affichage simultané de plusieurs
 * cartes produit sans re-fetcher à chaque expansion.
 *
 * Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * requête indépendante des autres onglets de `ConfigurationScreen` (prix,
 * catalogue carburants) : son propre chargement/skeleton n'attend jamais
 * celui des autres sections. */
export function useStationFuelProducts(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "station-fuel-products", organizationId],
    queryFn: () => fetchStationFuelProducts(organizationId as string),
    enabled: !!organizationId,
  });

  const associations = query.data ?? [];
  const loading = !!organizationId && query.isPending;

  async function toggle(fuelProductId: string, stationId: string, currentlyActive: boolean) {
    if (!organizationId) return;
    const existing = associations.find((a) => a.fuelProductId === fuelProductId && a.stationId === stationId);
    if (existing) {
      await updateStationFuelProduct(organizationId, existing.id, { active: !currentlyActive });
    } else {
      await createStationFuelProduct(organizationId, { stationId, fuelProductId });
    }
    await query.refetch();
  }

  function isActive(fuelProductId: string, stationId: string): boolean {
    const existing = associations.find((a) => a.fuelProductId === fuelProductId && a.stationId === stationId);
    return existing?.active ?? false;
  }

  return {
    associations,
    loading,
    toggle,
    isActive,
    reload: async () => {
      await query.refetch();
    },
  };
}
