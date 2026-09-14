"use client";

import { useQuery } from "@tanstack/react-query";

import { listDeliveriesInProgress, type DeliveryInProgress, type FuelProduct, type Station, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";

const REFRESH_MS = 10_000;

export interface DeliveryInProgressRow {
  delivery: DeliveryInProgress;
  tank: Tank | null;
  station: Station | null;
  fuelProduct: FuelProduct | null;
  volumeSoFarLiters: number | null;
}

/** Rafraîchi en continu (10s, via `refetchInterval`) — c'est le seul endroit
 * du module où l'état n'est jamais persisté durablement : une hausse en
 * cours peut disparaître d'un appel à l'autre (stabilisée entre-temps, donc
 * devenue une vraie livraison confirmée ailleurs). `tanks`/`stations`/
 * `fuelProducts` viennent d'un autre hook déjà chargé (`useDeliveriesList`)
 * — ils ne participent pas au fetch, seulement au mapping des lignes après
 * coup, donc ils restent hors clé de requête. */
export function useDeliveriesInProgress(organizationId: string | null, tanks: Tank[], stations: Station[], fuelProducts: FuelProduct[]) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "deliveries-in-progress", organizationId],
    queryFn: () => listDeliveriesInProgress(organizationId as string),
    enabled: !!organizationId,
    refetchInterval: REFRESH_MS,
  });

  const items = query.data ?? [];
  const tankById = new Map(tanks.map((t) => [t.id, t]));
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));

  const rows: DeliveryInProgressRow[] = items.map((delivery) => {
    const tank = tankById.get(delivery.tankId) ?? null;
    const volumeSoFarLiters =
      delivery.currentVolumeLiters !== null && delivery.startVolumeLiters !== null ? delivery.currentVolumeLiters - delivery.startVolumeLiters : null;
    return {
      delivery,
      tank,
      station: stationById.get(delivery.stationId) ?? null,
      fuelProduct: tank ? fuelProductById.get(tank.fuelProductId) ?? null : null,
      volumeSoFarLiters,
    };
  });

  return { rows };
}
