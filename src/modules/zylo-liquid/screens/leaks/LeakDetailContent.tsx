"use client";

import { useFormatter, useTranslations } from "next-intl";

import { Badge, InfoRow } from "@/shared/ui";

import type { LeakEventRow } from "./useLeakEventsList";

/** Détail d'un test de fuite statique — aucune page de détail n'existait
 * avant (`LeaksScreen` n'affiche que la ligne de tableau) : ce composant
 * n'ajoute aucune donnée qui n'existe pas déjà dans `LeakEvent`, il expose
 * simplement `startTime` (présent dans le modèle mais jamais affiché nulle
 * part jusqu'ici) en plus des champs déjà visibles dans le tableau. Utilisé
 * par `LeaksBrowserModal`. */
export function LeakDetailContent({ row }: { row: LeakEventRow }) {
  const t = useTranslations("zyloLiquid.leaks");
  const format = useFormatter();
  const { leak, tank, station, fuelProduct } = row;

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 rounded-card border border-border-subtle p-4 sm:grid-cols-2">
      <InfoRow label={t("table.station")} value={station?.name ?? "—"} />
      <InfoRow label={t("table.tank")} value={`${tank?.displayName ?? "—"} · ${fuelProduct?.name ?? "—"}`} />
      <InfoRow label={t("detail.startTime")} value={formatDateTime(leak.startTime)} mono />
      <InfoRow label={t("detail.endTime")} value={formatDateTime(leak.endTime)} mono />
      <InfoRow label={t("table.rate")} value={leak.leakRateLph === null ? "—" : `${format.number(leak.leakRateLph, { maximumFractionDigits: 2 })} L/h`} mono />
      <InfoRow label={t("table.result")} value={<Badge tone={leak.result === "anomaly" ? "error" : "success"} dot>{t(`result.${leak.result}`)}</Badge>} />
    </div>
  );
}
