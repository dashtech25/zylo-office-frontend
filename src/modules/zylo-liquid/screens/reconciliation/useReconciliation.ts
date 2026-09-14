"use client";

import { useQuery } from "@tanstack/react-query";

import {
  listReconciliationRecords,
  listStations,
  listTanks,
  reconcileStock,
  type ReconciliationRecord,
  type Station,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

interface ReconciliationData {
  records: ReconciliationRecord[];
  stations: Station[];
  tanks: Tank[];
}

async function fetchReconciliationData(organizationId: string): Promise<ReconciliationData> {
  const [recordsPage, stationsPage, tanksPage] = await Promise.all([
    listReconciliationRecords(organizationId, { subjectType: "TankStockDay", limit: 100 }),
    listStations(organizationId),
    listTanks(organizationId, 100),
  ]);
  return { records: recordsPage.data, stations: stationsPage.data, tanks: tanksPage.data };
}

/** Rapprochement ventes/déclarations <-> stock (processus-double-sources-
 * verite, Phase 6-8) — calcul paresseux à la demande, jamais une tâche
 * planifiée : un `ReconciliationRecord` n'existe que si ce bouton (ou son
 * équivalent pour les autres types de déclaration) a été actionné.
 *
 * Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * revenir sur cet écran après l'avoir quitté affiche instantanément la
 * dernière donnée connue au lieu de tout recharger. */
export function useReconciliation(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "reconciliation", organizationId],
    queryFn: () => fetchReconciliationData(organizationId as string),
    enabled: !!organizationId,
  });

  const records = query.data?.records ?? [];
  const stations = query.data?.stations ?? [];
  const tanks = query.data?.tanks ?? [];
  const loading = !!organizationId && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

  async function reconcile(tankId: string, day: string) {
    if (!organizationId) return;
    await reconcileStock(organizationId, tankId, day);
    await query.refetch();
  }

  return {
    loading,
    error,
    records,
    stations,
    tanks,
    reconcile,
    reload: async () => {
      await query.refetch();
    },
  };
}
