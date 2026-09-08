"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listReconciliationRecords,
  listStations,
  listTanks,
  reconcileStock,
  type ReconciliationRecord,
  type Station,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Rapprochement ventes/déclarations <-> stock (processus-double-sources-
 * verite, Phase 6-8) — calcul paresseux à la demande, jamais une tâche
 * planifiée : un `ReconciliationRecord` n'existe que si ce bouton (ou son
 * équivalent pour les autres types de déclaration) a été actionné. */
export function useReconciliation(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [recordsPage, stationsPage, tanksPage] = await Promise.all([
        listReconciliationRecords(organizationId, { subjectType: "TankStockDay", limit: 100 }),
        listStations(organizationId),
        listTanks(organizationId, 100),
      ]);
      setRecords(recordsPage.data);
      setStations(stationsPage.data);
      setTanks(tanksPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function reconcile(tankId: string, day: string) {
    if (!organizationId) return;
    await reconcileStock(organizationId, tankId, day);
    await load();
  }

  return { loading, error, records, stations, tanks, reconcile, reload: load };
}
