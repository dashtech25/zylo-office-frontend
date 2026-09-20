"use client";

import { useTranslations } from "next-intl";

import { Card, Checkbox } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import type { AlertSeverity, AlertStatus } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { SEVERITY_DOT_CLASS } from "@/modules/zylo-liquid/components/SeverityBadge";

export interface AlertTypeGroupOption {
  key: string;
  label: string;
  count: number;
}

export interface AlertFiltersPanelProps {
  typeGroups: AlertTypeGroupOption[];
  totalTypeCount: number;
  allTypesSelected: boolean;
  onToggleAllTypes: () => void;
  selectedTypeGroupKeys: string[];
  onToggleTypeGroup: (key: string) => void;

  severityCounts: Record<AlertSeverity, number>;
  selectedSeverities: AlertSeverity[];
  onToggleSeverity: (severity: AlertSeverity) => void;

  statusCounts: Record<AlertStatus, number>;
  selectedStatuses: AlertStatus[];
  onToggleStatus: (status: AlertStatus) => void;

  systemStatusLabel: string;
  systemStatusTimestamp: string;
}

function FilterRow({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: React.ReactNode; count: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Checkbox checked={checked} onChange={onChange} label={label} />
      <span className="text-caption tabular-nums text-text-muted">{count}</span>
    </div>
  );
}

/** Panneau de filtres avancés (colonne gauche du Centre d'alertes) — cases à
 * cocher par groupe de type, pastilles de gravité, statut. Purement
 * présentationnel : la sélection est portée par l'appelant (même contrat
 * que les autres blocs de ce chantier). Réutilise `SEVERITY_DOT_CLASS`
 * plutôt que de redéfinir une troisième fois le mapping sévérité→couleur
 * (déjà dans `SeverityBadge`, déjà dans `AlertDetailPanel`). */
export function AlertFiltersPanel({
  typeGroups,
  totalTypeCount,
  allTypesSelected,
  onToggleAllTypes,
  selectedTypeGroupKeys,
  onToggleTypeGroup,
  severityCounts,
  selectedSeverities,
  onToggleSeverity,
  statusCounts,
  selectedStatuses,
  onToggleStatus,
  systemStatusLabel,
  systemStatusTimestamp,
}: AlertFiltersPanelProps) {
  const t = useTranslations("zyloLiquid.alertCenter.filters");
  const tSeverity = useTranslations("zyloLiquid.alerts.page.severity");
  const tStatus = useTranslations("zyloLiquid.alerts.page.status");

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-body-sm font-semibold text-text">{t("typesTitle")}</h4>
          <FilterRow checked={allTypesSelected} onChange={onToggleAllTypes} label={t("all")} count={totalTypeCount} />
          {typeGroups.map((group) => (
            <FilterRow
              key={group.key}
              checked={selectedTypeGroupKeys.includes(group.key)}
              onChange={() => onToggleTypeGroup(group.key)}
              label={group.label}
              count={group.count}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
          <h4 className="text-body-sm font-semibold text-text">{t("severityTitle")}</h4>
          {(["critical", "high", "medium", "low"] as const).map((severity) => (
            <FilterRow
              key={severity}
              checked={selectedSeverities.includes(severity)}
              onChange={() => onToggleSeverity(severity)}
              label={
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-full", SEVERITY_DOT_CLASS[severity])} aria-hidden />
                  {tSeverity(severity)}
                </span>
              }
              count={severityCounts[severity]}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
          <h4 className="text-body-sm font-semibold text-text">{t("statusTitle")}</h4>
          {(["active", "acknowledged", "resolved"] as const).map((status) => (
            <FilterRow
              key={status}
              checked={selectedStatuses.includes(status)}
              onChange={() => onToggleStatus(status)}
              label={tStatus(status)}
              count={statusCounts[status]}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-border-subtle bg-surface-muted px-4 py-3">
        <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-caption font-medium text-text">{systemStatusLabel}</p>
          <p className="truncate text-caption text-text-muted">{systemStatusTimestamp}</p>
        </div>
      </div>
    </Card>
  );
}
