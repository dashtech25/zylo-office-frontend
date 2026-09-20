"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

/** Générique et agnostique du métier : le composant ne connaît aucun statut
 * réel (ni AlloTech, ni Zylo Liquid). Le mapping "statut métier → tone" doit
 * être déclaré dans le module consommateur, jamais ici — cf. rapport
 * AlloTech §13/§16 (pattern STATUS_VARIANT observé, à conserver). */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-caption font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-text-muted",
        primary: "bg-primary-muted text-primary",
        secondary: "bg-secondary-muted text-secondary",
        success: "bg-success-muted text-success",
        warning: "bg-warning-muted text-warning",
        error: "bg-error-muted text-error",
        info: "bg-info-muted text-info",
        // "Faible"/low — seul ton sans équivalent dans le quatuor
        // success/warning/error/info d'origine (2026-09-20, refonte Centre
        // d'alertes) : sans lui, une sévérité "Faible" retombait sur
        // `neutral` (gris), la couleur "terne à la place d'une couleur
        // sémantique" explicitement signalée à corriger.
        low: "bg-low-muted text-low",
        critical: "bg-severity-critical-bg text-severity-critical",
        major: "bg-severity-major-bg text-severity-major",
        minor: "bg-severity-minor-bg text-severity-minor",
        ok: "bg-severity-ok-bg text-severity-ok",
        maintenance: "bg-severity-maintenance-bg text-severity-maintenance",
        pending: "bg-severity-pending-bg text-severity-pending",
        idle: "bg-severity-idle-bg text-severity-idle",
      },
      size: {
        sm: "text-caption",
        md: "text-body-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
