"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert as AlertBanner, EmptyState, Stack } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { AlertRow } from "../alerts/AlertRow";
import type { AlertRow as AlertRowData } from "../alerts/useAlertsList";
import { useDeliveryFlow } from "../station-detail/useDeliveryFlow";

/** Onglet « Alertes » (mission « flux de livraison station », 2026-09-10)
 * — étape 3 du flux : toutes les alertes du système pour CETTE station,
 * pas seulement celles liées aux livraisons (mêmes droits que le centre
 * d'alertes réseau) — réutilise `listAlerts(stationId=...)` via
 * `useDeliveryFlow`, déjà filtrable par station côté backend, jamais une
 * seconde source de données.
 *
 * Refonte alertes (2026-09-11, correction du constat de l'Étape 1) : cette
 * section réimplémentait entièrement le rendu d'une ligne d'alerte au lieu
 * de réutiliser `AlertRow` — deux présentations divergentes de la même
 * donnée. Corrigé : construit les `AlertRowData` (alert + tank + station,
 * même forme que `useAlertsList`) à partir des données déjà chargées par
 * `useDeliveryFlow`, puis délègue tout le rendu à `AlertRow`. */
export function StationAlertsSection({ organizationId, station }: { organizationId: string; station: Station }) {
  const t = useTranslations("zyloLiquid.stationAdmin.stationAlerts");
  const tCommon = useTranslations("common");
  const data = useDeliveryFlow(organizationId, station.id);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  async function handleAcknowledge(alertId: string) {
    setAcknowledgingId(alertId);
    try {
      await data.acknowledgeAlert(alertId);
    } finally {
      setAcknowledgingId(null);
    }
  }

  if (data.loading) return <PageSpinner label={tCommon("states.loading")} />;

  const tankById = new Map(data.tanks.map((tank) => [tank.id, tank]));
  const activeAlerts = data.alerts.filter((a) => a.status !== "resolved");
  const resolvedAlerts = data.alerts.filter((a) => a.status === "resolved");
  const rows: AlertRowData[] = [...activeAlerts, ...resolvedAlerts].map((alert) => ({
    alert,
    tank: alert.tankId ? (tankById.get(alert.tankId) ?? null) : null,
    station,
  }));

  return (
    <div className="flex flex-col gap-4">
      {data.error && <AlertBanner tone="error">{data.error}</AlertBanner>}

      <div>
        <h2 className="text-h4 font-semibold text-text">{t("pageTitle")}</h2>
        <p className="text-body-sm text-text-muted">{t("pageSubtitle")}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={ShieldAlert} title={t("empty")} />
      ) : (
        <Stack gap="sm">
          {rows.map((row) => (
            <AlertRow key={row.alert.id} row={row} acknowledgingId={acknowledgingId} onAcknowledge={handleAcknowledge} />
          ))}
        </Stack>
      )}
    </div>
  );
}
