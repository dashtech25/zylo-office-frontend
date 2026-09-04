"use client";

import { useEffect, useState } from "react";

import { listHolykellAccounts, type HolykellAccountSyncStatus } from "@/modules/zylo-liquid/services/zyloLiquidApi";

const REFRESH_MS = 30_000;

/** Statut de synchro Holykell affiché dans la barre du haut — reflète
 * `lastSyncAt` du compte Holykell de l'organisation, mis à jour par
 * `sync_holykell_live.py` à chaque cycle réel (pas une valeur calculée côté
 * frontend à partir d'une mesure de capteur au hasard). Rafraîchi toutes les
 * 30s pour que "il y a X min" avance sans recharger la page. */
export function useHolykellSyncStatus(organizationId: string | null) {
  const [account, setAccount] = useState<HolykellAccountSyncStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;

    async function load() {
      try {
        const accounts = await listHolykellAccounts(organizationId!);
        if (cancelled) return;
        const chosen = [...accounts].sort((a, b) => (b.lastSyncAt ?? "").localeCompare(a.lastSyncAt ?? ""))[0] ?? null;
        setAccount(chosen);
      } catch {
        if (!cancelled) setAccount(null);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [organizationId]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => clearInterval(tick);
  }, []);

  const minutesAgo = account?.lastSyncAt ? Math.max(0, Math.round((now - new Date(account.lastSyncAt).getTime()) / 60000)) : null;

  return { account, minutesAgo };
}
