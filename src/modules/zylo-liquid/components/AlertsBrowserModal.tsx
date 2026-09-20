"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { AlertRow } from "@/modules/zylo-liquid/screens/alerts/AlertRow";
import { useAlertsList, type AlertRow as AlertRowData, type AlertStatusFilter } from "@/modules/zylo-liquid/screens/alerts/useAlertsList";
import { ActivityRow, Button, EmptyState, Modal, SearchableSelect, Stack } from "@/shared/ui";
import { ListSkeleton } from "@/shared/ui/Skeleton";

const STATUS_VALUES: AlertStatusFilter[] = ["all", "active", "acknowledged", "resolved"];

/** Modale maître/détail des alertes d'une station OU d'une cuve — ouverte
 * depuis `StationDetailScreen` et `TankDetailScreen`. Réutilise
 * `useAlertsList` (avec `scope`) et `AlertRow` (déjà la vue "détail" la
 * plus complète qui existe pour une alerte — aucune donnée supplémentaire
 * n'existe côté backend, cf. analyse `AlertsScreen`) : jamais une deuxième
 * présentation d'une alerte. Remplace la redirection vers `/zylo-liquid/alerts`. */
export function AlertsBrowserModal({
  organizationId,
  open,
  onOpenChange,
  title,
  stationId,
  tankId,
  initialAlertId,
}: {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  stationId?: string;
  tankId?: string;
  initialAlertId?: string | null;
}) {
  const t = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialAlertId ?? null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const data = useAlertsList(organizationId, statusFilter, null, { stationId, tankId });

  // La modale reste montée en permanence (jamais démontée/remontée) — sans
  // cet effet, un 2e clic sur une ligne différente depuis la station/cuve
  // ne changerait jamais la sélection (`useState` ne se ré-initialise
  // qu'au montage, pas à chaque nouvelle valeur de `initialAlertId`).
  useEffect(() => {
    if (open) setSelectedId(initialAlertId ?? null);
  }, [open, initialAlertId]);

  const selected: AlertRowData | null = selectedId ? data.rows.find((row) => row.alert.id === selectedId) ?? null : null;

  async function handleAcknowledge(alertId: string) {
    setAcknowledgingId(alertId);
    try {
      await data.acknowledge(alertId);
    } finally {
      setAcknowledgingId(null);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedId(null);
    onOpenChange(next);
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} size="full" closeLabel={tCommon("actions.close")} title={selected ? t(`types.${selected.alert.type}`) : title}>
      {selected ? (
        <Stack>
          <Button variant="link" size="inline" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="size-4" aria-hidden />
            {tCommon("actions.back")}
          </Button>
          <AlertRow row={selected} acknowledgingId={acknowledgingId} onAcknowledge={handleAcknowledge} />
        </Stack>
      ) : (
        <Stack>
          <div className="w-full sm:w-56">
            <SearchableSelect
              aria-label={t("page.filterStatus")}
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as AlertStatusFilter)}
              options={STATUS_VALUES.map((value) => ({ value, label: t(`page.status.${value}`) }))}
            />
          </div>

          {data.loading ? (
            <ListSkeleton rows={5} />
          ) : data.rows.length === 0 ? (
            <EmptyState icon={AlertTriangle} title={t("empty")} />
          ) : (
            <Stack gap="sm">
              {data.rows.map((row) => (
                <ActivityRow
                  key={row.alert.id}
                  icon={AlertTriangle}
                  iconTone={row.alert.status === "resolved" ? "neutral" : row.alert.severity === "critical" ? "error" : "warning"}
                  title={t(`types.${row.alert.type}`)}
                  meta={row.tank?.displayName ?? "—"}
                  onClick={() => setSelectedId(row.alert.id)}
                />
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </Modal>
  );
}
