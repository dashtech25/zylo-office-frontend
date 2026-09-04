"use client";

import { cn } from "@/shared/lib/cn";

/** Barre de progression générique (taux de remplissage, avancement...) —
 * remplace le `.bar-track` recopié à la main dans plusieurs pages. */
export function ProgressBar({ percent, color, className, trackClassName }: { percent: number; color?: string; className?: string; trackClassName?: string }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-pill bg-surface-muted", trackClassName)}>
      <div className={cn("h-full rounded-pill transition-all", !color && "bg-primary", className)} style={color ? { width: `${clamped}%`, background: color } : { width: `${clamped}%` }} />
    </div>
  );
}
