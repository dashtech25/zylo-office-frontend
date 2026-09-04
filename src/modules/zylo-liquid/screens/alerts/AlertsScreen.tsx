"use client";

import { AlertTriangle, Check, Droplet, Printer, Waves, Wifi } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert, Badge, Button, buttonVariants, Card, EmptyState, Kpi, PageHeader, Select, Stack } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useAlertsList, type AlertStatusFilter } from "./useAlertsList";

const STATUS_VALUES: AlertStatusFilter[] = ["active", "resolved", "all"];

/** Reproduit fidèlement la structure du "Centre d'alertes" du prototype
 * validé (prototype.html, page /alertes) : bandeau de filtres, liste de
 * cartes triées par ancienneté. Le prototype affiche aussi une répartition
 * par gravité (Critique/Majeur/Mineur/Informationnel) et des champs de
 * catalogue métier (délai de réaction attendu, action attendue,
 * responsable, escalade) — aucun des deux n'existe dans le modèle Alert
 * réel du Niveau 1 (type/status/triggeredValue/thresholdValue seulement,
 * aucune gravité, aucun catalogue de traitement) : plutôt que d'inventer
 * une classification ou un texte de procédure, cette page se limite aux
 * champs réellement enregistrés. Les compteurs par type de la Zone A sont
 * un simple décompte de `data.rows` (agrégation honnête, pas une donnée
 * inventée) — les filtres avancés (station/cuve/période/recherche/tri) de
 * la référence visuelle ne sont pas encore branchés : `useAlertsList` ne
 * supporte aujourd'hui que le filtre de statut. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md
 * (item #16, "catalogue de traitement" classé PRÉSENTER MAIS DÉSACTIVER). */
export default function AlertsScreen() {
  const t = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>("active");
  const data = useAlertsList(currentOrganization?.id ?? null, statusFilter);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  async function handleResolve(alertId: string) {
    setResolvingId(alertId);
    try {
      await data.resolve(alertId);
    } finally {
      setResolvingId(null);
    }
  }

  const countByType = (type: string) => data.rows.filter((r) => r.alert.type === type && r.alert.status === "active").length;

  return (
    <Stack>
      <PageHeader
        title={t("page.title")}
        description={t("page.subtitle", { count: data.rows.length })}
        actions={
          <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
            <Printer className="size-4" aria-hidden />
            {t("page.print")}
          </Button>
        }
      />

      {data.error && <Alert tone="error">{data.error}</Alert>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi icon={Droplet} label={t("types.leak")} value={countByType("leak")} tone="error" />
        <Kpi icon={AlertTriangle} label={t("types.level_low")} value={countByType("level_low")} tone="warning" />
        <Kpi icon={AlertTriangle} label={t("types.level_high")} value={countByType("level_high")} tone="warning" />
        <Kpi icon={Waves} label={t("types.water")} value={countByType("water")} tone="info" />
        <Kpi icon={Wifi} label={t("types.sensor_offline")} value={countByType("sensor_offline")} tone="neutral" />
      </div>

      <Card>
        <div className="max-w-xs">
          <Select
            aria-label={t("page.filterStatus")}
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as AlertStatusFilter)}
            options={STATUS_VALUES.map((value) => ({ value, label: value === "all" ? t("page.status.all") : t(`page.status.${value}`) }))}
          />
        </div>
      </Card>

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : data.rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={t("empty")} />
      ) : (
        <Stack gap="sm">
          {data.rows.map(({ alert, tank, station }) => {
            const critical = alert.type === "leak" || alert.type === "level_high";
            return (
              <Card key={alert.id} className={critical && alert.status === "active" ? "border-l-4 border-l-error" : alert.status === "active" ? "border-l-4 border-l-warning" : ""}>
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
                      <Button variant="primary" size="sm" loading={resolvingId === alert.id} onClick={() => handleResolve(alert.id)}>
                        <Check className="size-4" aria-hidden />
                        {t("page.resolve")}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
