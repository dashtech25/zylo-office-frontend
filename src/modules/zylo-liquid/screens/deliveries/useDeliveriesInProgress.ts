"use client";

import { useEffect, useState } from "react";

import { listDeliveriesInProgress, type DeliveryInProgress, type FuelProduct, type Station, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";

const REFRESH_MS = 10_000;

export interface DeliveryInProgressRow {
  delivery: DeliveryInProgress;
  tank: Tank | null;
  station: Station | null;
  fuelProduct: FuelProduct | null;
  volumeSoFarLiters: number | null;
}

/** Rafraîchi en continu (10s) — c'est le seul endroit du module où l'état
 * n'est jamais persisté : une hausse en cours peut disparaître d'un appel
 * à l'autre (stabilisée entre-temps, donc devenue une vraie livraison
 * confirmée ailleurs). */
export function useDeliveriesInProgress(organizationId: string | null, tanks: Tank[], stations: Station[], fuelProducts: FuelProduct[]) {
  const [rows, setRows] = useState<DeliveryInProgressRow[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;

    async function load() {
      try {
        const items = await listDeliveriesInProgress(organizationId!);
        if (cancelled) return;
        const tankById = new Map(tanks.map((t) => [t.id, t]));
        const stationById = new Map(stations.map((s) => [s.id, s]));
        const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));
        setRows(
          items.map((delivery) => {
            const tank = tankById.get(delivery.tankId) ?? null;
            const volumeSoFarLiters =
              delivery.currentVolumeLiters !== null && delivery.startVolumeLiters !== null
                ? delivery.currentVolumeLiters - delivery.startVolumeLiters
                : null;
            return {
              delivery,
              tank,
              station: stationById.get(delivery.stationId) ?? null,
              fuelProduct: tank ? fuelProductById.get(tank.fuelProductId) ?? null : null,
              volumeSoFarLiters,
            };
          })
        );
      } catch {
        if (!cancelled) setRows([]);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [organizationId, tanks, stations, fuelProducts]);

  return { rows };
}
