"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createShiftCashDeclaration,
  listCurrencies,
  listShiftCashDeclarations,
  listStations,
  listTanks,
  type CreateShiftCashDeclarationInput,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchShiftsData(organizationId: string) {
  // Stations/cuves en repli silencieux (pas un throw) — un pompiste
  // (rôle sans vue de pilotage station, aligné sur le prototype validé,
  // ROLES.POMP/MATRICE) n'a pas ces droits mais doit quand même voir
  // ses propres déclarations de shift ; seul le formulaire de nouvelle
  // déclaration est alors indisponible (pas la liste).
  const [declPage, stationsPage, tanksPage, currenciesPage] = await Promise.all([
    listShiftCashDeclarations(organizationId, { limit: 100 }),
    listStations(organizationId).catch(() => ({ data: [], meta: { total: 0, limit: 0, offset: 0 } })),
    listTanks(organizationId, 100).catch(() => ({ data: [], meta: { total: 0, limit: 0, offset: 0 } })),
    listCurrencies(organizationId, 100).catch(() => ({ data: [], meta: { total: 0, limit: 0, offset: 0 } })),
  ]);
  return {
    declarations: declPage.data,
    stations: stationsPage.data,
    tanks: tanksPage.data,
    currencies: currenciesPage.data,
  };
}

/** Prise/fin de poste et caisse déclarées (processus-double-sources-verite,
 * Phase 5-8) — rapprochées avec `TankCashDailyAggregate` (agrégat
 * télémétrique déjà existant), jamais un nouveau calcul de caisse. */
export function useShifts(organizationId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["zylo-liquid", "shifts", organizationId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchShiftsData(organizationId as string),
    enabled: !!organizationId,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  async function create(data: CreateShiftCashDeclarationInput) {
    if (!organizationId) return;
    await createShiftCashDeclaration(organizationId, data);
    await invalidate();
  }

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    declarations: query.data?.declarations ?? [],
    stations: query.data?.stations ?? [],
    tanks: query.data?.tanks ?? [],
    currencies: query.data?.currencies ?? [],
    create,
    reload: invalidate,
  };
}
