"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/core/api/client";

/** Cache de données partagé de toute l'application (React Query) — un seul
 * `QueryClient`, monté une fois à la racine, survit à toute la navigation
 * client-side. Objectif direct : plus besoin de recharger une page déjà
 * visitée récemment (retour sur une station, un onglet…) — la donnée en
 * cache s'affiche immédiatement, une revalidation silencieuse se fait
 * derrière si elle a dépassé `staleTime`.
 *
 * Réglages choisis délibérément, pas les valeurs par défaut de la
 * librairie :
 * - `staleTime` 60s : une donnée de moins d'une minute est servie telle
 *   quelle, aucun aller-retour réseau — c'est la fenêtre où la lenteur
 *   perçue disparaît (navigation Station A -> Liste -> Station A).
 * - `gcTime` 10 min : le cache d'un onglet quitté reste disponible pour un
 *   retour rapide, sans grossir indéfiniment (purge après 10 min d'inactivité).
 * - `retry` 1 (au lieu de 3 par défaut) : sur une base distante déjà lente,
 *   3 tentatives silencieuses avant d'afficher l'erreur aggrave la lenteur
 *   perçue au lieu de la cacher utilement — mieux vaut échouer vite et
 *   clairement.
 * - `refetchOnWindowFocus` true : revérifie en arrière-plan quand l'onglet
 *   redevient actif (donnée jamais figée trop longtemps), sans jamais
 *   bloquer l'affichage du cache pendant ce temps.
 * - Une erreur 401 n'est jamais retentée : après l'échec du rafraîchissement
 *   de session dans `apiFetch`, le jeton est déjà invalide, une nouvelle
 *   tentative ne peut pas réussir (voir aussi `AuthContext` — écoute
 *   désormais l'évènement `auth:session-expired` pour refléter la
 *   déconnexion immédiatement au lieu de laisser l'interface dans un état
 *   incohérent). */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status === 401) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
