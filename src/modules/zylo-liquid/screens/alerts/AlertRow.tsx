"use client";

import { Check, UserCheck } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { formatFreshness } from "@/shared/lib/formatDateTime";
import { Badge, buttonVariants, Button, Card } from "@/shared/ui";
import { AlertTypeBadge } from "@/modules/zylo-liquid/components/AlertTypeBadge";
import { SeverityBadge, SEVERITY_BORDER_CLASS } from "@/modules/zylo-liquid/components/SeverityBadge";

import type { AlertRow as AlertRowData } from "./useAlertsList";
import type { AlertStatus } from "@/modules/zylo-liquid/services/zyloLiquidApi";

// Unité affichée pour triggeredValue/thresholdValue — mm pour les alertes
// télémétriques, litres pour les alertes de rapprochement livraison.
const VOLUME_ALERT_TYPES = new Set(["delivery_discrepancy", "delivery_undeclared"]);

const STATUS_TONE: Record<AlertStatus, "error" | "warning" | "info" | "success"> = {
  active: "error",
  acknowledged: "info",
  resolved: "success",
};

/** Une seule définition de la ligne d'alerte, réutilisée par la vue
 * "Toutes", chaque groupe de la vue "Par station", le widget d'alertes du
 * tableau de bord et l'onglet Alertes du Centre admin station
 * (`StationAlertsSection`) — jamais deux présentations différentes de la
 * même donnée (même principe que `DeliveriesTable` côté livraisons).
 *
 * Composée exclusivement des mêmes atomes que le Centre d'alertes
 * (`AlertTypeBadge`, `SeverityBadge`) — refonte 2026-09-20 suite au constat
 * que cette ligne recomposait sa propre icône/ton localement (une
 * implémentation divergente du Centre d'alertes déjà validé), au lieu de
 * réutiliser la seule source de vérité. */
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
  const valueUnit = VOLUME_ALERT_TYPES.has(alert.type) ? "L" : "mm";

  function formatDateTime(iso: string): string {
    return formatFreshness(iso, format);
  }

  return (
    <Card className={alert.status !== "resolved" ? SEVERITY_BORDER_CLASS[alert.severity] : ""}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTypeBadge type={alert.type} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-text">{t(`types.${alert.type}`)}</span>
              <Badge tone={STATUS_TONE[alert.status]} dot>
                {t(`page.status.${alert.status}`)}
              </Badge>
              <SeverityBadge severity={alert.severity} />
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
