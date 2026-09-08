"use client";

import { useCallback, useEffect, useState } from "react";

import { listReconciliationRecords, type ReconciliationRecord } from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Vue consolidée des écarts détectés par le mécanisme de rapprochement
 * (processus-double-sources-verite, Phase 6-8), tous types confondus —
 * filtre côté client sur `status = discrepancy`, jamais un nouveau calcul :
 * cet écran ne fait qu'exposer ce que `/reconciliation-records` renvoie déjà. */
export function useCaisseEcarts(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await listReconciliationRecords(organizationId, { limit: 100 });
      setRecords(page.data.filter((r) => r.status === "discrepancy"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, error, records, reload: load };
}
