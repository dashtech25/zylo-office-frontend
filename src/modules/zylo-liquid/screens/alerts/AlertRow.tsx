"use client";

import { AlertTriangle, Check } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { Badge, buttonVariants, Button, Card } from "@/shared/ui";

import type { AlertRow as AlertRowData } from "./useAlertsList";

const CRITICAL_TYPES = new Set(["leak", "level_high"]);

/** Une seule définition de la ligne d'alerte, réutilisée par la vue
 * "Toutes" et par chaque groupe de la vue "Par station" — jamais deux
 * présentations différentes de la même donnée (même principe que
 * `DeliveriesTable` côté livraisons). */
export function AlertRow({ row, resolvingId, onResolve }: { row: AlertRowData; resolvingId: string | null; onResolve: (alertId: string) => void }) {
  const t = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { alert, tank, station } = row;
  const critical = CRITICAL_TYPES.has(alert.type);

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Card className={alert.status === "active" ? (critical ? "border-l-4 border-l-error" : "border-l-4 border-l-warning") : ""}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={critical ? "mt-0.5 size-5 text-error" : "mt-0.5 size-5 text-warning"} aria-hidden />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-text">{t(`types.${alert.type}`)}</span>
              <Badge tone={alert.status === "active" ? (critical ? "error" : "warning") : "success"} dot>
                {t(`page.status.${alert.status}`)}
              </Badge>
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
                    <div className="font-mono tabular-nums text-text">{format.number(alert.triggeredValue, { maximumFractionDigits: 1 })} mm</div>
                  </div>
                )}
                {alert.thresholdValue !== null && (
                  <div>
                    <div className="text-caption text-text-muted">{t("page.thresholdValue")}</div>
                    <div className="font-mono tabular-nums text-text">{format.number(alert.thresholdValue, { maximumFractionDigits: 1 })} mm</div>
                  </div>
                )}
              </div>
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
            <Button variant="primary" size="sm" loading={resolvingId === alert.id} onClick={() => onResolve(alert.id)}>
              <Check className="size-4" aria-hidden />
              {t("page.resolve")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
