"use client";

import { useMemo } from "react";

import type { CashConfidence, NetworkCashSummary, Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";

export interface CaisseStationProductLine {
  fuelProductId: string;
  fuelProductName: string;
  displayColor: string | null;
  tankCount: number;
  volumeSoldLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
  confidence: CashConfidence;
}

export interface CaisseStationRow {
  station: Station;
  products: CaisseStationProductLine[];
  volumeSoldLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  monetaryValueNotCalculableReason: string | null;
  confidence: CashConfidence;
}

/** Reconstruit, pour chaque station, ses ventes du jour par produit — en
 * réorganisant par station les mêmes chiffres déjà renvoyés par
 * `getNetworkCashSummary` (`productBlocks[].stations[]` pour le détail
 * produit, `stationLines` pour le total station), jamais un second calcul
 * ni un appel réseau supplémentaire. Toute station active sans aucune
 * donnée de caisse (aucune cuve active) reste visible, avec une raison
 * explicite plutôt que de disparaître silencieusement du tableau. */
export function useCaisseStationRows(stations: Station[], cashData: NetworkCashSummary | null): CaisseStationRow[] {
  return useMemo(() => {
    if (!cashData) return [];

    const productsByStation = new Map<string, CaisseStationProductLine[]>();
    for (const product of cashData.productBlocks) {
      for (const line of product.stations) {
        const list = productsByStation.get(line.stationId) ?? [];
        list.push({
          fuelProductId: product.fuelProductId,
          fuelProductName: product.fuelProductName,
          displayColor: product.displayColor,
          tankCount: line.tankCount,
          volumeSoldLiters: line.volumeSoldLiters,
          monetaryValue: line.monetaryValue,
          currencyCode: line.currencyCode,
          monetaryValueNotCalculableReason: line.monetaryValueNotCalculableReason,
          confidence: line.confidence,
        });
        productsByStation.set(line.stationId, list);
      }
    }

    const totalsByStation = new Map(cashData.stationLines.map((line) => [line.stationId, line]));

    return stations.map((station) => {
      const total = totalsByStation.get(station.id);
      return {
        station,
        products: productsByStation.get(station.id) ?? [],
        volumeSoldLiters: total?.volumeSoldLiters ?? 0,
        monetaryValue: total?.monetaryValue ?? null,
        currencyCode: total?.currencyCode ?? null,
        monetaryValueNotCalculableReason: total?.monetaryValueNotCalculableReason ?? "insufficient_data",
        confidence: total?.confidence ?? "insufficient_data",
      };
    });
  }, [stations, cashData]);
}
