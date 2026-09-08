"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createStationFuelProduct,
  listStationFuelProducts,
  updateStationFuelProduct,
  type StationFuelProduct,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Association explicite produit ↔ station (page_configuration.md §15) —
 * jamais déduite d'une cuve existante ou d'un prix déjà saisi. Charge tout
 * le réseau en une fois (organisation de taille modeste à ce stade) plutôt
 * que par produit, pour permettre l'affichage simultané de plusieurs
 * cartes produit sans re-fetcher à chaque expansion. */
export function useStationFuelProducts(organizationId: string | null) {
  const [associations, setAssociations] = useState<StationFuelProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Le backend plafonne `limit` à 100 (PaginationParams, `le=100`) — 500
      // renvoyait systématiquement un 422 (bug préexistant découvert par le
      // test E2E réel de refonte-configuration-zylo-liquid.md, jamais visible
      // avant faute de test bout-en-bout).
      const page = await listStationFuelProducts(organizationId, { limit: 100 });
      setAssociations(page.data);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(fuelProductId: string, stationId: string, currentlyActive: boolean) {
    if (!organizationId) return;
    const existing = associations.find((a) => a.fuelProductId === fuelProductId && a.stationId === stationId);
    if (existing) {
      await updateStationFuelProduct(organizationId, existing.id, { active: !currentlyActive });
    } else {
      await createStationFuelProduct(organizationId, { stationId, fuelProductId });
    }
    await load();
  }

  function isActive(fuelProductId: string, stationId: string): boolean {
    const existing = associations.find((a) => a.fuelProductId === fuelProductId && a.stationId === stationId);
    return existing?.active ?? false;
  }

  return { associations, loading, toggle, isActive, reload: load };
}
