"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

/** Ligne d'activité générique (livraison, fuite, alerte…) : icône +
 * titre + méta, avec un badge/statut optionnel à droite. Réutilisable
 * pour toute liste d'événements récents dans Zylo Liquid. */
export function ActivityRow({
  icon: Icon,
  iconTone = "neutral",
  title,
  meta,
  trailing,
  className,
  onClick,
}: {
  icon: LucideIcon;
  iconTone?: "neutral" | "success" | "error" | "warning";
  title: React.ReactNode;
  meta: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  /** Rend la ligne cliquable (ex. ouvrir son détail dans une modal) — même
   * pattern que `Kpi` (`Wrapper` conditionnel button/div). Omis, la ligne
   * reste un simple affichage, comme avant. */
  onClick?: () => void;
}) {
  const iconToneClass = {
    neutral: "bg-surface-muted text-text-muted",
    success: "bg-success-muted text-success",
    error: "bg-error-muted text-error",
    warning: "bg-warning-muted text-warning",
  }[iconTone];

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn("flex w-full items-center gap-3 py-2 text-left", onClick && "cursor-pointer rounded-button hover:bg-surface-muted", className)}
    >
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", iconToneClass)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-body-sm font-medium text-text">{title}</div>
        <div className="truncate text-caption text-text-muted">{meta}</div>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </Wrapper>
  );
}
