"use client";

import { useTranslations } from "next-intl";

import { Card, EmptyState, Select } from "@/shared/ui";
import { Inbox } from "lucide-react";
import type { AlertSeverity, AlertType } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { AlertCard } from "@/modules/zylo-liquid/components/AlertCard";

export interface AlertListItem {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  location: string;
  timeAgo: string;
}

export type AlertListSort = "mostRecent" | "mostSevere";

export interface AlertListProps {
  items: AlertListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sort: AlertListSort;
  onSortChange: (sort: AlertListSort) => void;
}

/** Liste des alertes (colonne centrale du Centre d'alertes) — en-tête avec
 * compteur + tri, puis une `AlertCard` par alerte. Compose `AlertCard`,
 * jamais une ligne recomposée localement ici. */
export function AlertList({ items, selectedId, onSelect, sort, onSortChange }: AlertListProps) {
  const t = useTranslations("zyloLiquid.alertCenter.list");

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle p-4">
        <h4 className="text-body-md font-semibold text-text">{t("count", { count: items.length })}</h4>
        <div className="w-40 shrink-0">
          <Select
            aria-label={t("sortLabel")}
            value={sort}
            onValueChange={(value) => onSortChange(value as AlertListSort)}
            options={[
              { value: "mostRecent", label: t("sortMostRecent") },
              { value: "mostSevere", label: t("sortMostSevere") },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <EmptyState icon={Inbox} title={t("empty")} />
        ) : (
          items.map((item) => (
            <AlertCard
              key={item.id}
              type={item.type}
              severity={item.severity}
              title={item.title}
              location={item.location}
              timeAgo={item.timeAgo}
              selected={item.id === selectedId}
              onClick={() => onSelect(item.id)}
            />
          ))
        )}
      </div>
    </Card>
  );
}
