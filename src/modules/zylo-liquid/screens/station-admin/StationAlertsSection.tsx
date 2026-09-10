"use client";

import { AlertTriangle, Check, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert as AlertBanner, Badge, Button, Card, EmptyState } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useDeliveryFlow } from "../station-detail/useDeliveryFlow";

const CRITICAL_TYPES = new Set(["leak", "level_high", "delivery_discrepancy", "delivery_undeclared"]);
const VOLUME_ALERT_TYPES = new Set(["delivery_discrepancy", "delivery_undeclared"]);

/** Onglet « Alertes » (mission « flux de livraison station », 2026-09-10)
 * — étape 3 du flux : toutes les alertes du système pour CETTE station,
 * pas seulement celles liées aux livraisons (mêmes droits que le centre
 * d'alertes réseau, `ALERT_MANAGE` pour la résolution) — réutilise
 * `listAlerts(stationId=...)`, déjà filtrable par station côté backend,
 * jamais une seconde source de données. */
export function StationAlertsSection({ organizationId, station }: { organizationId: string; station: Station }) {
  const t = useTranslations("zyloLiquid.stationAdmin.stationAlerts");
  const tAlertTypes = useTranslations("zyloLiquid.alerts.types");
  const tCommon = useTranslations("common");
  const data = useDeliveryFlow(organizationId, station.id);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function handleResolve(alertId: string) {
    setResolvingId(alertId);
    try {
      await data.closeAlert(alertId);
    } finally {
      setResolvingId(null);
    }
  }

  if (data.loading) return <PageSpinner label={tCommon("states.loading")} />;

  const activeAlerts = data.alerts.filter((a) => a.status === "active");
  const resolvedAlerts = data.alerts.filter((a) => a.status === "resolved");

  return (
    <div className="flex flex-col gap-4">
      {data.error && <AlertBanner tone="error">{data.error}</AlertBanner>}

      <div>
        <h2 className="text-h4 font-semibold text-text">{t("pageTitle")}</h2>
        <p className="text-body-sm text-text-muted">{t("pageSubtitle")}</p>
      </div>

      {data.alerts.length === 0 ? (
        <EmptyState icon={ShieldAlert} title={t("empty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {[...activeAlerts, ...resolvedAlerts].map((alert) => {
            const critical = CRITICAL_TYPES.has(alert.type);
            const unit = VOLUME_ALERT_TYPES.has(alert.type) ? "L" : "mm";
            return (
              <Card key={alert.id} className={alert.status === "active" ? (critical ? "border-l-4 border-l-error" : "border-l-4 border-l-warning") : ""}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={critical ? "mt-0.5 size-5 text-error" : "mt-0.5 size-5 text-warning"} aria-hidden />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-text">{tAlertTypes(alert.type)}</span>
                        <Badge tone={alert.status === "active" ? (critical ? "error" : "warning") : "success"} dot>
                          {t(`status.${alert.status}`)}
                        </Badge>
                      </div>
                      <div className="mt-1 text-body-sm text-text-muted">{new Date(alert.triggeredAt).toLocaleString()}</div>
                      {(alert.triggeredValue !== null || alert.thresholdValue !== null) && (
                        <div className="mt-2 flex gap-6 text-body-sm">
                          {alert.triggeredValue !== null && (
                            <div>
                              <div className="text-caption text-text-muted">{t("triggeredValue")}</div>
                              <div className="font-mono tabular-nums text-text">{alert.triggeredValue.toLocaleString()} {unit}</div>
                            </div>
                          )}
                          {alert.thresholdValue !== null && (
                            <div>
                              <div className="text-caption text-text-muted">{t("thresholdValue")}</div>
                              <div className="font-mono tabular-nums text-text">{alert.thresholdValue.toLocaleString()} {unit}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {alert.status === "active" && (
                    <Button variant="primary" size="sm" loading={resolvingId === alert.id} onClick={() => handleResolve(alert.id)}>
                      <Check className="size-4" aria-hidden />
                      {t("resolve")}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
