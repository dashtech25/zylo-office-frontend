"use client";

import { useQuery } from "@tanstack/react-query";

import { listTankMeasurements, type TankMeasurement } from "@/modules/zylo-liquid/services/zyloLiquidApi";

const PAGE_SIZE = 100; // plafond réel du backend (PaginationParams, le=100)
const MAX_PAGES = 20; // borne de sécurité (2000 mesures) — évite une boucle non bornée si la fenêtre est anormalement longue

async function fetchAllMeasurements(organizationId: string, tankId: string, fromDate: string, toDate: string | null): Promise<TankMeasurement[]> {
  const all: TankMeasurement[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await listTankMeasurements(organizationId, tankId, { fromDate, toDate: toDate ?? undefined, limit: PAGE_SIZE, offset });
    all.push(...result.data);
    offset += result.data.length;
    if (offset >= result.meta.total || result.data.length === 0) break;
  }
  return [...all].sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1));
}

/** Mesures réelles prises pendant la fenêtre d'une livraison — montre la
 * montée progressive du niveau (hauteur + volume à chaque instant).
 * `toDate` omis = livraison encore en cours (les mesures vont jusqu'à
 * l'instant présent, pas jusqu'à une fin qui n'existe pas encore).
 * Le backend plafonne `limit` à 100 : au-delà, on pagine via `offset`
 * plutôt que de demander une limite invalide (bug corrigé — l'appel
 * précédent avec limit:500 échouait silencieusement en 422). Migré vers
 * React Query — `tankId` + `fromDate` + `toDate` composent entièrement la
 * clé pour ne jamais partager le cache entre deux livraisons/cuves. */
export function useDeliveryMeasurements(organizationId: string | null, tankId: string | null, fromDate: string | null, toDate: string | null) {
  const enabled = !!organizationId && !!tankId && !!fromDate;

  const query = useQuery({
    queryKey: ["zylo-liquid", "delivery-measurements", organizationId, tankId, fromDate, toDate],
    queryFn: () => fetchAllMeasurements(organizationId as string, tankId as string, fromDate as string, toDate),
    enabled,
  });

  const loading = enabled && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;
  const measurements = query.data ?? [];

  return { loading, error, measurements };
}
