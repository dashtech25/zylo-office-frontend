"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createShiftCashDeclaration,
  listCurrencies,
  listShiftCashDeclarations,
  listStations,
  listTanks,
  type CreateShiftCashDeclarationInput,
  type Currency,
  type ShiftCashDeclaration,
  type Station,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Prise/fin de poste et caisse déclarées (processus-double-sources-verite,
 * Phase 5-8) — rapprochées avec `TankCashDailyAggregate` (agrégat
 * télémétrique déjà existant), jamais un nouveau calcul de caisse. */
export function useShifts(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [declarations, setDeclarations] = useState<ShiftCashDeclaration[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
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
      setDeclarations(declPage.data);
      setStations(stationsPage.data);
      setTanks(tanksPage.data);
      setCurrencies(currenciesPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(data: CreateShiftCashDeclarationInput) {
    if (!organizationId) return;
    await createShiftCashDeclaration(organizationId, data);
    await load();
  }

  return { loading, error, declarations, stations, tanks, currencies, create, reload: load };
}
