"use client";

import { Info } from "lucide-react";

import { Tooltip } from "@/shared/ui";

/** Libellé + icône d'information systématique, colocalisé à l'écran
 * Rapports (seul écran qui en a besoin aujourd'hui — cf.
 * `src/modules/CLAUDE.md`, ne pas promouvoir tant qu'un 2e écran n'en a
 * pas besoin). Au survol, explique CE QUE la donnée permet de savoir
 * concrètement — jamais juste répéter le nom du KPI. Demande explicite du
 * commanditaire : chaque information de la page Rapports doit être
 * expliquée au survol, pas seulement les boutons/liens. */
export function KpiLabel({ label, help }: { label: React.ReactNode; help: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip content={<span className="block max-w-64">{help}</span>}>
        <Info className="size-3.5 shrink-0 cursor-help text-text-disabled" aria-hidden />
      </Tooltip>
    </span>
  );
}
