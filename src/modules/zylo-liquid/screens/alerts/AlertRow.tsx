"use client";

import { AlertTriangle, Check, UserCheck } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { formatFreshness } from "@/shared/lib/formatDateTime";
import { Badge, buttonVariants, Button, Card } from "@/shared/ui";

import type { AlertRow as AlertRowData } from "./useAlertsList";
import type { AlertSeverity, AlertStatus } from "@/modules/zylo-liquid/services/zyloLiquidApi";

// Refonte alertes (2026-09, D2/D3/D7) — `severity` et `status` (3 états)
// viennent désormais du backend, plus de `CRITICAL_TYPES` dupliqué ici.
// Unité affichée pour triggeredValue/thresholdValue — mm pour les alertes
// télémétriques, litres pour les alertes de rapprochement livraison.
const VOLUME_ALERT_TYPES = new Set(["delivery_discrepancy", "delivery_undeclared"]);

// 4 tons désormais tous distincts (2026-09-20, refonte Centre d'alertes) —
// medium/low retombaient auparavant sur les mêmes tons que high/critical
// (aucun ton "low" n'existait avant l'ajout du jaune vif à `Badge`).
const SEVERITY_TONE: Record<AlertSeverity, "error" | "warning" | "info" | "low"> = {
  critical: "error",
  high: "warning",
  medium: "info",
  low: "low",
};

const SEVERITY_BORDER: Record<AlertSeverity, string> = {
  critical: "border-l-4 border-l-error",
  high: "border-l-4 border-l-warning",
  medium: "border-l-4 border-l-info",
  low: "border-l-4 border-l-low",
};

const STATUS_TONE: Record<AlertStatus, "error" | "warning" | "info" | "success"> = {
  active: "error",
  acknowledged: "info",
  resolved: "success",
};

/** Une seule définition de la ligne d'alerte, réutilisée par la vue
 * "Toutes", chaque groupe de la vue "Par station", et l'onglet Alertes du
 * Centre admin station (`StationAlertsSection`) — jamais deux présentations
 * différentes de la même donnée (même principe que `DeliveriesTable` côté
 * livraisons). */
export function AlertRow({
  row,
  acknowledgingId,
  onAcknowledge,
}: {
  row: AlertRowData;
  acknowledgingId: string | null;
  onAcknowledge: (alertId: string) => void;
}) {
  const t = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { alert, tank, station } = row;
  const severityTone = SEVERITY_TONE[alert.severity];
  const valueUnit = VOLUME_ALERT_TYPES.has(alert.type) ? "L" : "mm";

  function formatDateTime(iso: string): string {
    return formatFreshness(iso, format);
  }

  return (
    <Card className={alert.status !== "resolved" ? SEVERITY_BORDER[alert.severity] : ""}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={severityTone === "error" ? "mt-0.5 size-5 text-error" : "mt-0.5 size-5 text-warning"} aria-hidden />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-text">{t(`types.${alert.type}`)}</span>
              <Badge tone={STATUS_TONE[alert.status]} dot>
                {t(`page.status.${alert.status}`)}
              </Badge>
              <Badge tone={severityTone}>{t(`page.severity.${alert.severity}`)}</Badge>
            </div>
            <div className="mt-1 text-body-sm text-text-muted">
              {station && (
                <Link href={`/zylo-liquid/stations/${station.id}`} className="hover:text-primary hover:underline">
                  {station.name}
                </Link>
              )}
              {station && tank && " · "}
              {station && tank && (
                <Link href={`/zylo-liquid/stations/${station.id}/tanks/${tank.id}`} className="hover:text-primary hover:underline">
                  {tank.displayName}
                </Link>
              )}
              {" — "}
              {formatDateTime(alert.triggeredAt)}
            </div>
            {(alert.triggeredValue !== null || alert.thresholdValue !== null) && (
              <div className="mt-2 flex gap-6 text-body-sm">
                {alert.triggeredValue !== null && (
                  <div>
                    <div className="text-caption text-text-muted">{t("page.triggeredValue")}</div>
                    <div className="font-mono tabular-nums text-text">{format.number(alert.triggeredValue, { maximumFractionDigits: 1 })} {valueUnit}</div>
                  </div>
                )}
                {alert.thresholdValue !== null && (
                  <div>
                    <div className="text-caption text-text-muted">{t("page.thresholdValue")}</div>
                    <div className="font-mono tabular-nums text-text">{format.number(alert.thresholdValue, { maximumFractionDigits: 1 })} {valueUnit}</div>
                  </div>
                )}
              </div>
            )}
            {/* D2 : la fermeture est automatique pour ce type — jamais un
                clic humain. On le dit plutôt que de laisser un bouton
                "Résoudre" qui échouerait systématiquement (422). */}
            {alert.status !== "resolved" && (
              <div className="mt-2 text-caption text-text-muted">{t("page.autoResolveHint")}</div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {station && tank && (
            <Link href={`/zylo-liquid/stations/${station.id}/tanks/${tank.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {tCommon("actions.open")}
            </Link>
          )}
          {alert.status === "active" && (
            <Button variant="primary" size="sm" loading={acknowledgingId === alert.id} onClick={() => onAcknowledge(alert.id)}>
              <UserCheck className="size-4" aria-hidden />
              {t("page.acknowledge")}
            </Button>
          )}
          {alert.status === "acknowledged" && (
            <Badge tone="info">
              <Check className="size-3" aria-hidden />
              {t("page.acknowledged")}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
