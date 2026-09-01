"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface KpiProps {
  label: React.ReactNode;
  value: React.ReactNode;
  trend?: { direction: "up" | "down" | "flat"; value: string };
  className?: string;
}

/** Générique — aucune connaissance métier (pas de statut/couleur imposée
 * selon un domaine). Pattern repris de KPI.tsx/StatCard.tsx d'AlloTech
 * (rapport §13), utile dès maintenant vu la densité de KPI du prototype
 * Zylo Liquid (dashboards à base de .kpi tiles). */
export function Kpi({ label, value, trend, className }: KpiProps) {
  return (
    <div className={cn("rounded-card border border-border-subtle bg-surface p-5 shadow-card", className)}>
      <p className="text-caption font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="tabular-nums mt-1 text-h1 font-semibold text-text">{value}</p>
      {trend && (
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
    </div>
  );
}
