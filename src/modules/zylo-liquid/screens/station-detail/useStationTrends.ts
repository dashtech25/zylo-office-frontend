"use client";

import { useEffect, useState } from "react";

import { getStationCashDetail, listTankMeasurements, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";

const DAYS = 30;
const PAGE_SIZE = 100;
// Bornes de sécurité (mêmes principes que useDeliveryMeasurements.ts) :
// évite une boucle non bornée si la fenêtre de 30 jours contient un volume
// de mesures anormalement élevé pour une cuve donnée.
const MAX_PAGES_PER_TANK = 30;

export interface StockTrendPoint {
  at: string;
  totalVolumeLiters: number;
}

export interface SalesDayBar {
  date: string;
  byProduct: { fuelProductId: string; volumeSoldLiters: number }[];
  totalVolumeSoldLiters: number;
}

const COVERAGE_WINDOW_DAYS = 7;

/** Volume vendu total sur les 7 derniers jours, par produit — sous-ensemble
 * des 30 jours déjà chargés par `salesByDay` (aucun nouvel appel réseau).
 * Sert au tri « produit le plus vendu » et au calcul de couverture estimée
 * (mission « amélioration zylo liquid », page de station.docx : « couverture
 * ... déterminée en fonction des 7 derniers jours »). */
export function last7DaysVolumeByProduct(salesByDay: SalesDayBar[]): Map<string, number> {
  const cutoff = dayKey(new Date(Date.now() - COVERAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString());
  const totals = new Map<string, number>();
  for (const day of salesByDay) {
    if (day.date < cutoff) continue;
    for (const p of day.byProduct) {
      totals.set(p.fuelProductId, (totals.get(p.fuelProductId) ?? 0) + p.volumeSoldLiters);
    }
  }
  return totals;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Deux séries réelles pour les 2 graphiques « Vue d'ensemble » de la
 * station (référence validée, prototype.html) — aucune donnée simulée :
 *
 * - `stockPoints` : somme, jour par jour, du dernier relevé réel de chaque
 *   cuve active (`GET /tanks/{id}/measurements`, déjà paginé au même
 *   principe que `useDeliveryMeasurements.ts`) — jamais de valeur
 *   interpolée entre deux jours, jamais de jour où une cuve n'a pas
 *   transmis n'est simplement absente de la somme de ce jour (elle n'est
 *   ni comptée à 0 ni extrapolée).
 * - `salesByDay` : `volumeSoldLiters` par produit et par jour, calculé par
 *   le backend (`GET /cash/stations/{id}`, déjà utilisé ailleurs pour la
 *   caisse) — appelé une fois par jour sur la fenêtre plutôt qu'un seul
 *   appel sur toute la période, car l'API ne renvoie qu'un total agrégé
 *   pour l'intervalle demandé, jamais une répartition quotidienne toute
 *   faite (aucun endpoint de ce type n'existe aujourd'hui). Le calcul lui
 *   même (volume vendu = baisse de niveau hors fenêtres de livraison)
 *   reste entièrement côté backend, jamais dupliqué ici. */
export function useStationTrends(organizationId: string | null, stationId: string | null, activeTanks: Tank[]) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockPoints, setStockPoints] = useState<StockTrendPoint[]>([]);
  const [salesByDay, setSalesByDay] = useState<SalesDayBar[]>([]);

  useEffect(() => {
    if (!organizationId || !stationId || activeTanks.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const now = new Date();
    const windowStart = new Date(now.getTime() - DAYS * 24 * 60 * 60 * 1000);
    const dayStarts = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(windowStart.getTime() + i * 24 * 60 * 60 * 1000);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    });

    async function loadStock() {
      const perTank = await Promise.all(
        activeTanks.map(async (tank) => {
          const all: { measuredAt: string; volumeLiters: number | null }[] = [];
          let offset = 0;
          for (let page = 0; page < MAX_PAGES_PER_TANK; page++) {
            const result = await listTankMeasurements(organizationId!, tank.id, {
              fromDate: windowStart.toISOString(),
              toDate: now.toISOString(),
              limit: PAGE_SIZE,
              offset,
            });
            all.push(...result.data);
            offset += result.data.length;
            if (offset >= result.meta.total || result.data.length === 0) break;
          }
          return all;
        })
      );

      // Dernier relevé réel de chaque cuve pour chaque jour où elle a
      // transmis — jamais une valeur comblée pour un jour sans mesure.
      const lastOfDayByTank = perTank.map((measurements) => {
        const byDay = new Map<string, { at: string; volume: number }>();
        for (const m of measurements) {
          if (m.volumeLiters === null) continue;
          const key = dayKey(m.measuredAt);
          const existing = byDay.get(key);
          if (!existing || m.measuredAt > existing.at) {
            byDay.set(key, { at: m.measuredAt, volume: m.volumeLiters });
          }
        }
        return byDay;
      });

      const points: StockTrendPoint[] = [];
      for (const d of dayStarts) {
        const key = dayKey(d.toISOString());
        let sum = 0;
        let anyTankReported = false;
        for (const byDay of lastOfDayByTank) {
          const entry = byDay.get(key);
          if (entry !== undefined) {
            sum += entry.volume;
            anyTankReported = true;
          }
        }
        if (anyTankReported) points.push({ at: d.toISOString(), totalVolumeLiters: sum });
      }
      return points;
    }

    async function loadSales() {
      const bars = await Promise.all(
        dayStarts.map(async (d) => {
          const dayEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000);
          const detail = await getStationCashDetail(organizationId!, stationId!, d.toISOString(), dayEnd.toISOString(), "calendar").catch(() => null);
          const byProduct = (detail?.products ?? []).map((p) => ({ fuelProductId: p.fuelProductId, volumeSoldLiters: p.volumeSoldLiters }));
          return {
            date: dayKey(d.toISOString()),
            byProduct,
            totalVolumeSoldLiters: byProduct.reduce((sum, p) => sum + p.volumeSoldLiters, 0),
          };
        })
      );
      return bars;
    }

    Promise.all([loadStock(), loadSales()])
      .then(([stock, sales]) => {
        if (cancelled) return;
        setStockPoints(stock);
        setSalesByDay(sales);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, stationId, activeTanks.map((t) => t.id).join(",")]);

  return { loading, error, stockPoints, salesByDay };
}
