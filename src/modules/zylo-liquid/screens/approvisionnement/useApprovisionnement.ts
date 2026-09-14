"use client";

import { useQuery } from "@tanstack/react-query";

import {
  createDeliveryDeclaration,
  listDeliveryDeclarations,
  listFuelProducts,
  listStations,
  type CreateDeliveryDeclarationInput,
  type DeliveryDeclaration,
  type FuelProduct,
  type Station,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

interface ApprovisionnementData {
  declarations: DeliveryDeclaration[];
  stations: Station[];
  fuelProducts: FuelProduct[];
}

async function fetchApprovisionnement(organizationId: string): Promise<ApprovisionnementData> {
  const [declPage, stationsPage, productsPage] = await Promise.all([
    listDeliveryDeclarations(organizationId, { limit: 100 }),
    listStations(organizationId),
    listFuelProducts(organizationId),
  ]);
  return { declarations: declPage.data, stations: stationsPage.data, fuelProducts: productsPage.data };
}

/** Livraisons déclarées par un humain (processus-double-sources-verite,
 * Phase 5) — distinctes des livraisons détectées automatiquement (écran
 * Livraisons/`DeliveriesScreen`, télémétrie pure). Les deux coexistent,
 * rapprochées seulement à la demande (bouton "Rapprocher"), jamais fusionnées.
 *
 * Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * revenir sur cet écran affiche instantanément la dernière donnée connue
 * au lieu de tout recharger. */
export function useApprovisionnement(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "approvisionnement", organizationId],
    queryFn: () => fetchApprovisionnement(organizationId as string),
    enabled: !!organizationId,
  });

  const declarations = query.data?.declarations ?? [];
  const stations = query.data?.stations ?? [];
  const fuelProducts = query.data?.fuelProducts ?? [];
  const loading = !!organizationId && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

  async function create(data: CreateDeliveryDeclarationInput) {
    if (!organizationId) return;
    await createDeliveryDeclaration(organizationId, data);
    await query.refetch();
  }

  return {
    loading,
    error,
    declarations,
    stations,
    fuelProducts,
    create,
    reload: async () => {
      await query.refetch();
    },
  };
}
