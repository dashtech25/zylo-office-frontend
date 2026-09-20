"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import type { AlertSeverity, AlertType } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { AlertTypeBadge } from "./AlertTypeBadge";
import { SeverityBadge } from "./SeverityBadge";

export interface AlertCardProps {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  location: string;
  timeAgo: string;
  selected?: boolean;
  onClick?: () => void;
}

/** Une ligne de la liste des alertes — compose `AlertTypeBadge` +
 * `SeverityBadge`, jamais un badge recomposé à la main ici (2026-09-20,
 * refonte suite au constat de blocs monolithiques). Purement
 * présentationnel : le texte (titre, localisation, temps écoulé) est déjà
 * formaté par l'appelant. */
export function AlertCard({ type, severity, title, location, timeAgo, selected, onClick }: AlertCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-card border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary-muted" : "border-transparent hover:bg-surface-muted"
      )}
    >
      <AlertTypeBadge type={type} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-semibold text-text">{title}</p>
        <p className="truncate text-caption text-text-muted">{location}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <SeverityBadge severity={severity} />
        <span className="text-caption text-text-muted">{timeAgo}</span>
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-text-muted" aria-hidden />
    </button>
  );
}
