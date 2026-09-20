"use client";

import { AlertTriangle, Bell, CheckCircle2, ChevronRight, Droplet, Filter, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, PageHeader } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

export interface AlertCenterCounts {
  active: number;
  toHandle: number;
  informational: number;
  resolved24h: number;
}

type SummaryTone = "error" | "warning" | "info" | "success";

const TONE_CLASSES: Record<SummaryTone, { bg: string; border: string; icon: string; value: string }> = {
  error: { bg: "bg-error-muted", border: "border-error/20", icon: "bg-error", value: "text-error" },
  warning: { bg: "bg-warning-muted", border: "border-warning/20", icon: "bg-warning", value: "text-warning" },
  info: { bg: "bg-info-muted", border: "border-info/20", icon: "bg-info", value: "text-info" },
  success: { bg: "bg-success-muted", border: "border-success/20", icon: "bg-success", value: "text-success" },
};

function SummaryCard({
  icon: Icon,
  tone,
  value,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: SummaryTone;
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const classes = TONE_CLASSES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-card border p-5 text-left shadow-card transition-shadow hover:shadow-elevated",
        classes.bg,
        classes.border
      )}
    >
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", classes.icon)}>
        <Icon className="size-6 text-white" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-h1 font-bold tabular-nums", classes.value)}>{value}</p>
        <p className="text-body-sm text-text-muted">{label}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-text-muted" aria-hidden />
    </button>
  );
}

export interface AlertCenterSummaryHeaderProps {
  counts: AlertCenterCounts;
  onMarkAllAsRead?: () => void;
  onOpenFilters?: () => void;
  onCardClick?: (card: keyof AlertCenterCounts) => void;
}

/** Bloc titre + cartes de résumé de la page "Gestion des alertes" (Centre
 * d'alertes, refonte 2026-09) — première brique construite dans l'ordre
 * convenu (zone 1 « En-tête de la page » + zone 2 « Résumé des alertes » du
 * découpage validé). Purement présentationnel : les compteurs et les
 * gestionnaires de clic sont fournis par l'écran parent (branchement sur les
 * vraies alertes traité dans une étape ultérieure), pour rester cohérent
 * avec le reste de `shared/ui`/`modules/zylo-liquid/components` qui ne
 * connaissent jamais eux-mêmes leur source de données. */
export function AlertCenterSummaryHeader({ counts, onMarkAllAsRead, onOpenFilters, onCardClick }: AlertCenterSummaryHeaderProps) {
  const t = useTranslations("zyloLiquid.alertCenter");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("header.title")}
        description={t("header.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={onMarkAllAsRead}>
              <ListChecks className="size-4" aria-hidden />
              {t("header.markAllAsRead")}
            </Button>
            <Button variant="secondary" onClick={onOpenFilters}>
              <Filter className="size-4" aria-hidden />
              {t("header.filters")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={AlertTriangle} tone="error" value={counts.active} label={t("summary.active")} onClick={() => onCardClick?.("active")} />
        <SummaryCard icon={Bell} tone="warning" value={counts.toHandle} label={t("summary.toHandle")} onClick={() => onCardClick?.("toHandle")} />
        <SummaryCard icon={Droplet} tone="info" value={counts.informational} label={t("summary.informational")} onClick={() => onCardClick?.("informational")} />
        <SummaryCard icon={CheckCircle2} tone="success" value={counts.resolved24h} label={t("summary.resolved24h")} onClick={() => onCardClick?.("resolved24h")} />
      </div>
    </div>
  );
}
