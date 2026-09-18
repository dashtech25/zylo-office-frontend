"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getTankCash,
  listPumps,
  listReconciliationRecords,
  listSales,
  listStations,
  listTanks,
  reconcileStock,
  type Sale,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchOtherDiscrepancies(organizationId: string) {
  const page = await listReconciliationRecords(organizationId, { limit: 100 });
  return page.data.filter((r) => r.status === "discrepancy" && r.subjectType !== "TankStockDay");
}

/** Les 3 autres types d'écarts (livraisons, jaugeage manuel, contrôle
 * qualité) — inchangés, vue passive comme avant (voir historique de ce
 * fichier). Non prioritaire pour l'instant (demande commanditaire
 * 2026-09-18), la rangée « Ventes vs stock » ci-dessous est le focus. */
export function useOtherDiscrepancies(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "caisse-ecarts-other", organizationId],
    queryFn: () => fetchOtherDiscrepancies(organizationId as string),
    enabled: !!organizationId,
  });

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    records: query.data ?? [],
  };
}

export interface StockDiscrepancyRow {
  tankId: string;
  stationId: string;
  stationName: string;
  tankDisplayName: string;
  fuelProductName: string;
  day: string; // yyyy-mm-dd
  declaredVolumeLiters: number;
  detectedVolumeLiters: number | null;
  discrepancyValueLiters: number | null;
  toleranceApplied: number | null;
  status: "matched" | "discrepancy" | "insufficient_data";
}

/** Un jour calendaire par élément de la liste, entre `fromDate` (inclus) et
 * `toDate` (exclu si dans le futur, sinon inclus jusqu'à aujourd'hui) —
 * jamais plus de 31 jours (période "30 jours" au maximum côté appelant). */
function daysInRange(fromDate: string, toDate: string): string[] {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const days: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const last = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function sumDeclaredVolume(sales: Sale[], pumpIds: Set<string>, day: string): number {
  const dayStart = new Date(`${day}T00:00:00Z`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  return sales
    .filter((s) => s.pumpId !== null && pumpIds.has(s.pumpId))
    .filter((s) => {
      const t = new Date(s.eventAt).getTime();
      return t >= dayStart && t < dayEnd;
    })
    .reduce((sum, s) => sum + s.quantityLiters, 0);
}

async function fetchStockDiscrepancies(organizationId: string, fromDate: string, toDate: string): Promise<StockDiscrepancyRow[]> {
  const [stationsPage, tanksPage, pumpsPage, salesPage] = await Promise.all([
    listStations(organizationId, 200),
    listTanks(organizationId, 200),
    listPumps(organizationId, { limit: 200 }),
    listSales(organizationId, { limit: 500 }),
  ]);
  const stations = stationsPage.data;
  const activeTanks = tanksPage.data.filter((t) => t.active);
  const pumps = pumpsPage.data;
  const sales = salesPage.data;
  const days = daysInRange(fromDate, toDate);

  const stationNameById = new Map(stations.map((s) => [s.id, s.name]));
  const pumpIdsByTank = new Map<string, Set<string>>();
  for (const pump of pumps) {
    if (!pumpIdsByTank.has(pump.tankId)) pumpIdsByTank.set(pump.tankId, new Set());
    pumpIdsByTank.get(pump.tankId)!.add(pump.id);
  }

  const tasks: Promise<StockDiscrepancyRow>[] = [];
  for (const tank of activeTanks) {
    const pumpIds = pumpIdsByTank.get(tank.id) ?? new Set<string>();
    for (const day of days) {
      tasks.push(
        (async () => {
          const dayStartIso = `${day}T00:00:00.000Z`;
          // Jamais une fin de période dans le futur (rejeté par l'API,
          // cf. dashboard) — pour aujourd'hui, on s'arrête à l'instant
          // présent, pas à 23:59:59.
          const dayEnd = new Date(`${day}T23:59:59.999Z`);
          const now = new Date();
          const dayEndIso = (dayEnd > now ? now : dayEnd).toISOString();
          const [record, cash] = await Promise.all([
            reconcileStock(organizationId, tank.id, day),
            getTankCash(organizationId, tank.id, dayStartIso, dayEndIso).catch(() => null),
          ]);
          return {
            tankId: tank.id,
            stationId: tank.stationId,
            stationName: stationNameById.get(tank.stationId) ?? "—",
            tankDisplayName: tank.displayName,
            fuelProductName: cash?.fuelProductName ?? "—",
            day,
            declaredVolumeLiters: sumDeclaredVolume(sales, pumpIds, day),
            detectedVolumeLiters: cash?.volumeSoldLiters ?? null,
            discrepancyValueLiters: record.discrepancyValue,
            toleranceApplied: record.toleranceApplied,
            status: record.status === "pending" ? "insufficient_data" : record.status,
          };
        })()
      );
    }
  }

  return Promise.all(tasks);
}

/** Rangée « Ventes déclarées vs stock » de l'écran Écarts de caisse —
 * déclenche activement le rapprochement (`reconcileStock`, jusqu'ici
 * jamais appelé automatiquement) pour chaque cuve active et chaque jour de
 * la période choisie, au lieu de se contenter d'afficher ce qui existait
 * déjà. Le volume déclaré est recalculé ici (somme des ventes des pompes de
 * la cuve, jamais un second calcul serveur) ; le volume détecté vient de
 * `getTankCash`, déjà utilisé ailleurs (TankCashModal) pour la même
 * télémétrie — jamais une troisième implémentation. */
export function useCaisseEcartsStock(organizationId: string | null, fromDate: string, toDate: string) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "caisse-ecarts-stock", organizationId, fromDate, toDate],
    queryFn: () => fetchStockDiscrepancies(organizationId as string, fromDate, toDate),
    enabled: !!organizationId,
  });

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    rows: query.data ?? [],
    reload: query.refetch,
  };
}
