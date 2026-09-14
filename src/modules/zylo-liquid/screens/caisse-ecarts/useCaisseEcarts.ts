"use client";

import { useQuery } from "@tanstack/react-query";

import { listReconciliationRecords } from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchCaisseEcarts(organizationId: string) {
  const page = await listReconciliationRecords(organizationId, { limit: 100 });
  return page.data.filter((r) => r.status === "discrepancy");
}

/** Vue consolidée des écarts détectés par le mécanisme de rapprochement
 * (processus-double-sources-verite, Phase 6-8), tous types confondus —
 * filtre côté client sur `status = discrepancy`, jamais un nouveau calcul :
 * cet écran ne fait qu'exposer ce que `/reconciliation-records` renvoie déjà. */
export function useCaisseEcarts(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "caisse-ecarts", organizationId],
    queryFn: () => fetchCaisseEcarts(organizationId as string),
    enabled: !!organizationId,
  });

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    records: query.data ?? [],
  };
}
