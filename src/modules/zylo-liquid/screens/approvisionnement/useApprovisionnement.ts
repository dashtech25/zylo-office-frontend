"use client";

import { useCallback, useEffect, useState } from "react";

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

/** Livraisons déclarées par un humain (processus-double-sources-verite,
 * Phase 5) — distinctes des livraisons détectées automatiquement (écran
 * Livraisons/`DeliveriesScreen`, télémétrie pure). Les deux coexistent,
 * rapprochées seulement à la demande (bouton "Rapprocher"), jamais fusionnées. */
export function useApprovisionnement(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [declarations, setDeclarations] = useState<DeliveryDeclaration[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [fuelProducts, setFuelProducts] = useState<FuelProduct[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [declPage, stationsPage, productsPage] = await Promise.all([
        listDeliveryDeclarations(organizationId, { limit: 100 }),
        listStations(organizationId),
        listFuelProducts(organizationId),
      ]);
      setDeclarations(declPage.data);
      setStations(stationsPage.data);
      setFuelProducts(productsPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(data: CreateDeliveryDeclarationInput) {
    if (!organizationId) return;
    await createDeliveryDeclaration(organizationId, data);
    await load();
  }

  return { loading, error, declarations, stations, fuelProducts, create, reload: load };
}
