"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { listHolykellAccounts, type HolykellAccountSyncStatus } from "@/modules/zylo-liquid/services/zyloLiquidApi";

const REFRESH_MS = 30_000;

/** Statut de synchro Holykell affiché dans la barre du haut — reflète
 * `lastSyncAt` du compte Holykell de l'organisation, mis à jour par
 * `sync_holykell_live.py` à chaque cycle réel (pas une valeur calculée côté
 * frontend à partir d'une mesure de capteur au hasard). Rafraîchi toutes les
 * 30s pour que "il y a X min" avance sans recharger la page.
 *
 * Migré vers React Query pour homogénéité avec le reste du module, mais le
 * comportement de polling est conservé tel quel (`refetchInterval` plutôt
 * qu'un simple staleTime long) : contrairement aux autres hooks migrés
 * cette session (dashboards, référentiels), ce n'est pas une donnée qu'on
 * veut mettre en cache pour éviter un refetch — c'est un statut qui doit
 * activement avancer pendant que l'écran reste ouvert. `refetchInterval`
 * gère ça nativement (avec retry/backoff intégrés par React Query, ce que
 * le `setInterval` manuel n'avait pas), donc pas de compromis fait ici. */
export function useHolykellSyncStatus(organizationId: string | null) {
  const [now, setNow] = useState(() => Date.now());

  const { data: account } = useQuery({
    queryKey: ["zylo-liquid", "holykell-sync-status", organizationId],
    queryFn: async () => {
      const accounts = await listHolykellAccounts(organizationId as string);
      return [...accounts].sort((a, b) => (b.lastSyncAt ?? "").localeCompare(a.lastSyncAt ?? ""))[0] ?? null;
    },
    enabled: !!organizationId,
    refetchInterval: REFRESH_MS,
    staleTime: REFRESH_MS,
  });

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => clearInterval(tick);
  }, []);

  const minutesAgo = account?.lastSyncAt ? Math.max(0, Math.round((now - new Date(account.lastSyncAt).getTime()) / 60000)) : null;

  return { account: (account ?? null) as HolykellAccountSyncStatus | null, minutesAgo };
}
