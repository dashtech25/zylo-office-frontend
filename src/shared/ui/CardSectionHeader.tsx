"use client";

import type { LucideIcon } from "lucide-react";

import { CardHeader, CardTitle } from "./Card";
import { cn } from "@/shared/lib/cn";

/** En-tête de carte générique (icône optionnelle + titre + action optionnelle
 * à droite — lien "Voir toutes", bouton, etc.). Factorise le motif répété
 * dans les cartes d'info et les cartes d'activité récente : ne jamais
 * réécrire ce flex à la main dans une page, toujours passer par ce
 * composant. S'appuie sur `CardHeader`/`CardTitle` du design system plutôt
 * que de dupliquer leur mise en page. */
export function CardSectionHeader({
  icon: Icon,
  title,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <CardHeader className={cn("mb-2 items-center", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 text-text-muted" aria-hidden />}
        <CardTitle className="text-body-md">{title}</CardTitle>
      </div>
      {action}
    </CardHeader>
  );
}
