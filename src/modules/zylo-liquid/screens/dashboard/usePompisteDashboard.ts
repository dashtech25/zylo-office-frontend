"use client";

import { useQueryClient, useQuery } from "@tanstack/react-query";

import {
  lockShiftCashDeclaration,
  listAlerts,
  listShiftCashDeclarations,
  type Alert,
  type ShiftCashDeclaration,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Tableau de bord du pompiste (« Mon shift ») — aligné strictement sur le
 * prototype validé (`prototype.html`, `dashPompiste()`, ~ligne 3644) :
 * aucune vue de pilotage réseau, seulement le shift en cours/le plus récent
 * du pompiste connecté et les alertes actives de sa station. Le backend
 * filtre déjà les déclarations à l'auteur (voir
 * `_list_declarations(restrict_to_own_author_unless_permission=STATION_READ)`)
 * — ce hook ne fait qu'afficher ce que le serveur a déjà restreint,
 * jamais un second filtrage côté client qui serait une fausse sécurité.
 *
 * Migré vers React Query (même traitement que `useNetworkDashboard`) — 2
 * requêtes indépendantes (shifts / alertes) pour que l'écran puisse
 * dégrader chaque section séparément plutôt que bloquer tout derrière un
 * seul spinner, et pour bénéficier du cache au retour sur l'écran. */
export function usePompisteDashboard(organizationId: string | null) {
  const queryClient = useQueryClient();

  const shiftsQuery = useQuery({
    queryKey: ["zylo-liquid", "pompiste-dashboard", "shifts", organizationId],
    queryFn: () => listShiftCashDeclarations(organizationId as string, { limit: 20 }),
    enabled: !!organizationId,
  });

  const alertsQuery = useQuery({
    queryKey: ["zylo-liquid", "pompiste-dashboard", "alerts", organizationId],
    queryFn: () =>
      listAlerts(organizationId as string, { limit: 20, status: "active" }).catch(() => ({
        data: [] as Alert[],
        meta: { total: 0, limit: 0, offset: 0 },
      })),
    enabled: !!organizationId,
  });

  const shifts = shiftsQuery.data?.data ?? [];
  const alerts = alertsQuery.data?.data ?? [];
  const shiftsLoading = !!organizationId && shiftsQuery.isPending;
  const alertsLoading = !!organizationId && alertsQuery.isPending;
  const loading = shiftsLoading;
  const error = shiftsQuery.error
    ? shiftsQuery.error instanceof Error
      ? shiftsQuery.error.message
      : String(shiftsQuery.error)
    : null;

  const currentShift =
    shifts.find((s) => s.lifecycleStatus === "declared") ??
    [...shifts].sort((a, b) => new Date(b.shiftStart).getTime() - new Date(a.shiftStart).getTime())[0] ??
    null;

  async function reload() {
    await Promise.all([shiftsQuery.refetch(), alertsQuery.refetch()]);
  }

  async function closeCurrentShift() {
    if (!organizationId || !currentShift) return;
    await lockShiftCashDeclaration(organizationId, currentShift.id);
    await queryClient.invalidateQueries({ queryKey: ["zylo-liquid", "pompiste-dashboard", "shifts", organizationId] });
  }

  return {
    loading,
    shiftsLoading,
    alertsLoading,
    error,
    shifts,
    alerts: alerts as Alert[],
    currentShift,
    closeCurrentShift,
    reload,
  };
}

export type { ShiftCashDeclaration };
