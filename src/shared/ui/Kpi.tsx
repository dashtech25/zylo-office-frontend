"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type KpiTone = "neutral" | "primary" | "success" | "warning" | "error" | "info";

const toneBorderClass: Record<KpiTone, string> = {
  neutral: "",
  primary: "border-l-4 border-l-primary",
  success: "border-l-4 border-l-success",
  warning: "border-l-4 border-l-warning",
  error: "border-l-4 border-l-error",
  info: "border-l-4 border-l-info",
};

export interface KpiProps {
  icon?: LucideIcon;
  label: React.ReactNode;
  value?: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  trend?: { direction: "up" | "down" | "flat"; value: string };
  tone?: KpiTone;
  /** Fonctionnalité pas encore disponible (donnée que le backend ne fournit
   * pas) : la carte garde sa place et son style, seule la valeur devient
   * "—" et `disabledLabel` remplace `sub` — jamais retirée, jamais une
   * valeur inventée à sa place. Le libellé est fourni par l'appelant (ex.
   * `tCommon("states.comingSoon")`) : ce composant reste agnostique de
   * toute clé de traduction, comme le reste de `shared/ui`. */
  disabled?: boolean;
  disabledLabel?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/** Générique et agnostique du métier — aucune connaissance d'un domaine
 * particulier (ni AlloTech, ni Zylo Liquid). Seule source de vérité pour
 * les tuiles KPI de l'app : ne pas recréer de variante locale à un module,
 * étendre ce composant à la place. */
export function Kpi({ icon: Icon, label, value, unit, sub, trend, tone = "neutral", disabled, disabledLabel, onClick, className }: KpiProps) {
  const interactive = Boolean(onClick) && !disabled;
  const Wrapper = interactive ? "button" : "div";

  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "rounded-card border border-border-subtle bg-surface p-5 text-left shadow-card",
        tone !== "neutral" && toneBorderClass[tone],
        disabled && "opacity-55",
        interactive && "cursor-pointer",
        className
      )}
    >
      <p className="flex items-center gap-1.5 text-caption font-medium uppercase tracking-wide text-text-muted">
        {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
        {label}
      </p>
      <p className="tabular-nums mt-1 text-h1 font-semibold text-text">
        {disabled ? "—" : value}
        {!disabled && unit && <span className="ml-1 text-body-sm font-semibold text-text-muted">{unit}</span>}
      </p>
      {(disabled ? disabledLabel : sub) && <p className="mt-1 text-caption text-text-muted">{disabled ? disabledLabel : sub}</p>}
      {trend && !disabled && (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-caption font-medium",
            trend.direction === "up" && "text-success",
            trend.direction === "down" && "text-error",
            trend.direction === "flat" && "text-text-muted"
          )}
        >
          {trend.direction === "up" && <TrendingUp className="size-3" aria-hidden />}
          {trend.direction === "down" && <TrendingDown className="size-3" aria-hidden />}
          {trend.value}
        </p>
      )}
    </Wrapper>
  );
}
