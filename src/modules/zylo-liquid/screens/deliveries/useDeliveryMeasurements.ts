"use client";

import { useEffect, useState } from "react";

import { listTankMeasurements, type TankMeasurement } from "@/modules/zylo-liquid/services/zyloLiquidApi";

const PAGE_SIZE = 100; // plafond réel du backend (PaginationParams, le=100)
const MAX_PAGES = 20; // borne de sécurité (2000 mesures) — évite une boucle non bornée si la fenêtre est anormalement longue

/** Mesures réelles prises pendant la fenêtre d'une livraison — montre la
 * montée progressive du niveau (hauteur + volume à chaque instant).
 * `toDate` omis = livraison encore en cours (les mesures vont jusqu'à
 * l'instant présent, pas jusqu'à une fin qui n'existe pas encore).
 * Le backend plafonne `limit` à 100 : au-delà, on pagine via `offset`
 * plutôt que de demander une limite invalide (bug corrigé — l'appel
 * précédent avec limit:500 échouait silencieusement en 422). */
export function useDeliveryMeasurements(organizationId: string | null, tankId: string | null, fromDate: string | null, toDate: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<TankMeasurement[]>([]);

  useEffect(() => {
    if (!organizationId || !tankId || !fromDate) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadAllPages() {
      const all: TankMeasurement[] = [];
      let offset = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const result = await listTankMeasurements(organizationId!, tankId!, { fromDate: fromDate!, toDate: toDate ?? undefined, limit: PAGE_SIZE, offset });
        all.push(...result.data);
        offset += result.data.length;
        if (offset >= result.meta.total || result.data.length === 0) break;
      }
      return all;
    }

    loadAllPages()
      .then((all) => {
        if (cancelled) return;
        setMeasurements([...all].sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1)));
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
  }, [organizationId, tankId, fromDate, toDate]);

  return { loading, error, measurements };
}
