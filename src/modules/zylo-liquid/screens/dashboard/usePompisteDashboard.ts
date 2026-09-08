"use client";

import { useCallback, useEffect, useState } from "react";

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
 * jamais un second filtrage côté client qui serait une fausse sécurité. */
export function usePompisteDashboard(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<ShiftCashDeclaration[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [shiftsPage, alertsPage] = await Promise.all([
        listShiftCashDeclarations(organizationId, { limit: 20 }),
        listAlerts(organizationId, { limit: 20, status: "active" }).catch(() => ({ data: [], meta: { total: 0, limit: 0, offset: 0 } })),
      ]);
      setShifts(shiftsPage.data);
      setAlerts(alertsPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentShift =
    shifts.find((s) => s.lifecycleStatus === "declared") ??
    [...shifts].sort((a, b) => new Date(b.shiftStart).getTime() - new Date(a.shiftStart).getTime())[0] ??
    null;

  async function closeCurrentShift() {
    if (!organizationId || !currentShift) return;
    await lockShiftCashDeclaration(organizationId, currentShift.id);
    await load();
  }

  return { loading, error, shifts, alerts, currentShift, closeCurrentShift, reload: load };
}
