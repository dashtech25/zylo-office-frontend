"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { acknowledgeAlert, type Alert, type Station, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Card, Modal } from "@/shared/ui";

import { AlertCard } from "@/modules/zylo-liquid/components/AlertCard";
import { AlertRow } from "@/modules/zylo-liquid/screens/alerts/AlertRow";

const MAX_VISIBLE = 5;

/** Widget « alertes » du tableau de bord — jamais de redirection vers
 * `/zylo-liquid/alertes` (contrainte explicite du commanditaire) : le clic
 * ouvre `AlertRow` (déjà la vue de détail la plus riche disponible, aucune
 * donnée backend supplémentaire n'existe pour une alerte) dans une modale.
 * Réutilise les données déjà chargées par `useNetworkDashboard` — aucun
 * appel réseau supplémentaire. */
export function DashboardAlertsWidget({
  organizationId,
  alerts,
  count,
  stations,
  tanks,
}: {
  organizationId: string;
  alerts: Alert[];
  count: number;
  stations: Station[];
  tanks: Tank[];
}) {
  const t = useTranslations("zyloLiquid");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? null;

  function formatRelativeTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  async function handleAcknowledge(alertId: string) {
    if (!organizationId) return;
    setAcknowledgingId(alertId);
    try {
      await acknowledgeAlert(organizationId, alertId);
      await queryClient.invalidateQueries({ queryKey: ["zylo-liquid", "network-dashboard"] });
    } finally {
      setAcknowledgingId(null);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-h3 font-semibold text-text">{t("alerts.title")}</h3>
        <span className="text-body-sm font-medium text-text-muted">{count}</span>
      </div>
      {alerts.length === 0 ? (
        <p className="text-body-sm text-text-muted">{t("alerts.empty")}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {alerts.slice(0, MAX_VISIBLE).map((alert) => {
            const station = stations.find((s) => s.id === alert.stationId);
            const tank = tanks.find((tk) => tk.id === alert.tankId);
            return (
              <AlertCard
                key={alert.id}
                type={alert.type}
                severity={alert.severity}
                title={t(`alerts.types.${alert.type}`)}
                location={station ? (tank ? `${station.name} · ${tank.displayName}` : station.name) : "—"}
                timeAgo={formatRelativeTime(alert.triggeredAt)}
                onClick={() => setSelectedAlertId(alert.id)}
              />
            );
          })}
        </div>
      )}

      {selectedAlert && (
        <Modal open onOpenChange={(next) => !next && setSelectedAlertId(null)} title={t(`alerts.types.${selectedAlert.type}`)} size="lg" closeLabel={tCommon("actions.close")}>
          <AlertRow
            row={{
              alert: selectedAlert,
              tank: tanks.find((tk) => tk.id === selectedAlert.tankId) ?? null,
              station: stations.find((s) => s.id === selectedAlert.stationId) ?? null,
            }}
            acknowledgingId={acknowledgingId}
            onAcknowledge={handleAcknowledge}
          />
        </Modal>
      )}
    </Card>
  );
}
