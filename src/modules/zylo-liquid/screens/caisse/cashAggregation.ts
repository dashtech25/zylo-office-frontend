import type { CashConfidence, CurrencyCashBlock, NetworkProductCashLine, StationCashSummary } from "@/modules/zylo-liquid/services/zyloLiquidApi";

import type { CaisseStationRow } from "./useCaisseStationRows";

const CONFIDENCE_RANK: Record<CashConfidence, number> = { reliable: 0, partial: 1, incomplete_data: 2, insufficient_data: 3, anomaly: 4 };

/** Même règle que `_worse_cash_confidence` côté backend (service.py) : ne
 * jamais moyenner ni masquer une dégradation, la pire des deux gagne
 * toujours. */
export function worseCashConfidence(a: CashConfidence, b: CashConfidence): CashConfidence {
  return CONFIDENCE_RANK[a] >= CONFIDENCE_RANK[b] ? a : b;
}

/** Recalcule les cartes "Ventes du jour" par produit sur un sous-ensemble de
 * stations (celles visibles après filtrage/recherche) — en resommant des
 * chiffres déjà calculés côté backend (jamais une deuxième interpolation ni
 * un second calcul de prix), exactement comme `networkProducts` le fait déjà
 * pour le stock sur la page Stations. */
export function aggregateCaisseProducts(rows: CaisseStationRow[]): NetworkProductCashLine[] {
  const byProduct = new Map<
    string,
    {
      name: string;
      color: string | null;
      volume: number;
      monetary: number;
      currencies: Set<string>;
      incomplete: boolean;
      stationIds: Set<string>;
      tankCount: number;
      confidence: CashConfidence;
      stations: StationCashSummary[];
    }
  >();

  for (const row of rows) {
    for (const p of row.products) {
      const entry =
        byProduct.get(p.fuelProductId) ??
        {
          name: p.fuelProductName,
          color: p.displayColor,
          volume: 0,
          monetary: 0,
          currencies: new Set<string>(),
          incomplete: false,
          stationIds: new Set<string>(),
          tankCount: 0,
          confidence: "reliable" as CashConfidence,
          stations: [],
        };
      entry.volume += p.volumeSoldLiters;
      entry.stationIds.add(row.station.id);
      entry.tankCount += p.tankCount;
      entry.confidence = worseCashConfidence(entry.confidence, p.confidence);
      entry.stations.push({
        stationId: row.station.id,
        stationName: row.station.name,
        tankCount: p.tankCount,
        volumeSoldLiters: p.volumeSoldLiters,
        monetaryValue: p.monetaryValue,
        currencyCode: p.currencyCode,
        monetaryValueNotCalculableReason: p.monetaryValueNotCalculableReason,
        confidence: p.confidence,
      });
      if (p.monetaryValue === null) {
        entry.incomplete = true;
      } else {
        entry.monetary += p.monetaryValue;
        if (p.currencyCode) entry.currencies.add(p.currencyCode);
      }
      byProduct.set(p.fuelProductId, entry);
    }
  }

  return [...byProduct.entries()].map(([fuelProductId, e]) => {
    let monetaryValue: number | null;
    let currencyCode: string | null;
    let reason: string | null;
    if (e.incomplete) {
      monetaryValue = null;
      currencyCode = null;
      reason = "incomplete_pricing";
    } else if (e.currencies.size > 1) {
      monetaryValue = null;
      currencyCode = null;
      reason = "mixed_currencies";
    } else if (e.currencies.size === 1) {
      monetaryValue = e.monetary;
      currencyCode = [...e.currencies][0];
      reason = null;
    } else {
      monetaryValue = null;
      currencyCode = null;
      reason = "no_applicable_price";
    }
    return {
      fuelProductId,
      fuelProductName: e.name,
      displayColor: e.color,
      tankCount: e.tankCount,
      stationCount: e.stationIds.size,
      volumeSoldLiters: e.volume,
      monetaryValue,
      currencyCode,
      monetaryValueNotCalculableReason: reason,
      confidence: e.confidence,
      stations: e.stations,
    };
  });
}

/** Recalcule les blocs "TOTAL RÉSEAU" par devise sur le même sous-ensemble
 * filtré — une station sans devise résolue contribue son volume (comme le
 * fait déjà `volumeSoldLitersTotal` côté backend) mais jamais un montant. */
export function aggregateCaisseCurrencyBlocks(rows: CaisseStationRow[]): CurrencyCashBlock[] {
  const buckets = new Map<string, { monetary: number; volume: number; stations: StationCashSummary[] }>();

  for (const row of rows) {
    const key = row.currencyCode ?? "__uncalculable__";
    const bucket = buckets.get(key) ?? { monetary: 0, volume: 0, stations: [] };
    bucket.volume += row.volumeSoldLiters;
    if (row.currencyCode !== null && row.monetaryValue !== null) bucket.monetary += row.monetaryValue;
    bucket.stations.push({
      stationId: row.station.id,
      stationName: row.station.name,
      tankCount: row.products.reduce((sum, p) => sum + p.tankCount, 0),
      volumeSoldLiters: row.volumeSoldLiters,
      monetaryValue: row.monetaryValue,
      currencyCode: row.currencyCode,
      monetaryValueNotCalculableReason: row.monetaryValueNotCalculableReason,
      confidence: row.confidence,
    });
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .filter(([key]) => key !== "__uncalculable__")
    .map(([currencyCode, b]) => ({ currencyCode, monetaryValue: b.monetary, volumeSoldLiters: b.volume, stationCount: b.stations.length, stations: b.stations }));
}
