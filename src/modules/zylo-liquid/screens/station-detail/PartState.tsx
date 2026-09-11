"use client";

import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode } from "react";

import { ApiError } from "@/core/api/client";
import { Alert, EmptyState } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

/** État d'une partie scopée du détail station (un onglet) : en cours de
 * chargement, refusée par RBAC (403 — le rôle n'a pas la permission de ce
 * domaine), en erreur réseau, ou prête. Un refus n'est jamais comblé par une
 * absence de données ni par une valeur inventée : la partie affiche la
 * raison (voir `useStationDetail` pour le même principe sur les compléments
 * de page). */
export type PartState<T> =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "error"; error: string }
  | { status: "ready"; data: T };

export function isForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

/** Charge une partie quand son onglet est ouvert (le contenu d'un onglet
 * Radix n'est monté qu'à l'ouverture). `load` doit être stable
 * (`useCallback`) — même pattern que `useStationDetail`.
 *
 * Migré vers React Query (cache applicatif, cf. `QueryProvider`) : revenir
 * sur un onglet déjà consulté récemment (le contenu d'un onglet Radix est
 * démonté à la fermeture, donc remonté à chaque réouverture) affiche
 * instantanément la dernière donnée connue au lieu de tout recharger avec un
 * spinner plein écran — c'était la cause directe du symptôme « je change
 * d'onglet et ça recharge tout ». `queryKey` doit inclure tout ce dont
 * `load` dépend (mêmes valeurs que ses dépendances `useCallback`), sans quoi
 * deux appels différents partageraient le même cache. */
export function usePartData<T>(queryKey: readonly unknown[], load: () => Promise<T>): PartState<T> {
  const query = useQuery({
    queryKey,
    queryFn: load,
  });

  if (query.isPending) return { status: "loading" };
  if (query.isError) {
    if (isForbidden(query.error)) return { status: "denied" };
    return { status: "error", error: query.error instanceof Error ? query.error.message : String(query.error) };
  }
  return { status: "ready", data: query.data as T };
}

/** Rendu commun des états chargement / refus (403) / erreur d'une partie.
 * Le refus s'affiche « non visible pour votre rôle » — jamais comme une
 * erreur bloquante de la page entière. */
export function PartStateBox({ state, children }: { state: PartState<unknown>; children: ReactNode }) {
  const t = useTranslations("zyloLiquid.stationDetail.parts");
  const tCommon = useTranslations("common");

  if (state.status === "loading") {
    return (
      <div className="flex justify-center py-12">
        <PageSpinner label={tCommon("states.loading")} />
      </div>
    );
  }
  if (state.status === "denied") {
    return <EmptyState icon={Lock} title={t("unavailable.title")} description={t("unavailable.description")} />;
  }
  if (state.status === "error") {
    return <Alert tone="error">{state.error}</Alert>;
  }
  return <>{children}</>;
}
