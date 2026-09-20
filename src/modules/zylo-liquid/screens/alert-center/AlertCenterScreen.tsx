"use client";

import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Fuel,
  Gauge,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert as AlertBanner, EmptyState, PageSpinner } from "@/shared/ui";
import { formatFreshness } from "@/shared/lib/formatDateTime";
import { listFuelProducts, type AlertSeverity, type AlertStatus, type AlertType } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { ALERT_TYPE_GROUP, MANUALLY_RESOLVABLE_TYPES } from "@/modules/zylo-liquid/components/AlertTypeBadge";
import { useAlertsList } from "@/modules/zylo-liquid/screens/alerts/useAlertsList";

import { AlertCenterSummaryHeader } from "./AlertCenterSummaryHeader";
import { AlertFiltersPanel, type AlertTypeGroupOption } from "./AlertFiltersPanel";
import { AlertList, type AlertListItem, type AlertListSort } from "./AlertList";
import { AlertDetailPanel, type AlertDetailInfoRow, type AlertDetailKeyMetric, type AlertDetailQuickAction } from "./AlertDetailPanel";

const GROUP_KEYS = ["levelThresholds", "sensorsAvailability", "leakTest", "missingConfiguration", "deliveries", "salesCash", "transport"] as const;
const VOLUME_ALERT_TYPES = new Set<AlertType>(["delivery_discrepancy", "delivery_undeclared"]);
const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_TEXT_CLASS: Record<AlertSeverity, string> = { critical: "text-error", high: "text-warning", medium: "text-info", low: "text-low" };

/** Implémentation réelle du Centre d'alertes — assemble les blocs validés
 * (`AlertCenterSummaryHeader`, `AlertFiltersPanel`, `AlertList`,
 * `AlertDetailPanel`) avec de vraies données (`useAlertsList`, déjà utilisé
 * par `AlertsScreen`, jamais un second appel réseau réinventé). Remplace
 * `AlertsScreen` comme contenu de `/zylo-liquid/alerts` (2026-09-20).
 *
 * "Cause probable"/"Impact possible" viennent d'un contenu réel par type
 * (`zyloLiquid.alertCenter.causes.*`, dérivé des conditions de
 * déclenchement effectives du backend — jamais un texte inventé). Les
 * actions rapides restent volontairement génériques et sûres (navigation
 * vers la station/la cuve, acquittement, résolution manuelle) : aucune
 * action métier "intelligente" par type n'a encore été validée — voir le
 * cahier des alertes, à traiter type par type dans une étape ultérieure. */
export default function AlertCenterScreen() {
  const t = useTranslations("zyloLiquid");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id ?? null;

  const data = useAlertsList(organizationId, "all", null);
  const fuelProductsQuery = useQuery({
    queryKey: ["zylo-liquid", "fuel-products", organizationId],
    queryFn: () => listFuelProducts(organizationId as string),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
  const productById = useMemo(
    () => new Map((fuelProductsQuery.data?.data ?? []).map((p) => [p.id, p])),
    [fuelProductsQuery.data]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<AlertListSort>("mostRecent");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([...GROUP_KEYS]);
  const [selectedSeverities, setSelectedSeverities] = useState<AlertSeverity[]>(["critical", "high", "medium", "low"]);
  const [selectedStatuses, setSelectedStatuses] = useState<AlertStatus[]>(["active", "acknowledged", "resolved"]);
  const [busyAlertId, setBusyAlertId] = useState<string | null>(null);

  const typeGroups: AlertTypeGroupOption[] = GROUP_KEYS.map((key) => ({
    key,
    label: t(`alertCenter.filters.groups.${key}`),
    count: data.rows.filter((r) => ALERT_TYPE_GROUP[r.alert.type] === key).length,
  }));

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 } as Record<AlertSeverity, number>;
  const statusCounts = { active: 0, acknowledged: 0, resolved: 0 } as Record<AlertStatus, number>;
  for (const row of data.rows) {
    severityCounts[row.alert.severity] += 1;
    statusCounts[row.alert.status] += 1;
  }

  const now = Date.now();
  const resolved24h = data.rows.filter(
    (r) => r.alert.status === "resolved" && r.alert.resolvedAt && now - new Date(r.alert.resolvedAt).getTime() <= 24 * 3600 * 1000
  ).length;
  const toHandle = data.rows.filter((r) => r.alert.status === "active" && (r.alert.severity === "critical" || r.alert.severity === "high")).length;
  const informational = data.rows.filter((r) => r.alert.severity === "low").length;

  const filteredRows = useMemo(() => {
    const rows = data.rows.filter(
      (r) =>
        selectedGroups.includes(ALERT_TYPE_GROUP[r.alert.type]) &&
        selectedSeverities.includes(r.alert.severity) &&
        selectedStatuses.includes(r.alert.status)
    );
    if (sort === "mostSevere") {
      return [...rows].sort((a, b) => SEVERITY_RANK[a.alert.severity] - SEVERITY_RANK[b.alert.severity]);
    }
    return rows;
  }, [data.rows, selectedGroups, selectedSeverities, selectedStatuses, sort]);

  const listItems: AlertListItem[] = filteredRows.map((row) => ({
    id: row.alert.id,
    type: row.alert.type,
    severity: row.alert.severity,
    title: t(`alerts.types.${row.alert.type}`),
    location: row.station ? (row.tank ? `${row.station.name} · ${row.tank.displayName}` : row.station.name) : "—",
    timeAgo: formatFreshness(row.alert.triggeredAt, format),
  }));

  const effectiveSelectedId = selectedId && filteredRows.some((r) => r.alert.id === selectedId) ? selectedId : (filteredRows[0]?.alert.id ?? null);
  const selectedRow = filteredRows.find((r) => r.alert.id === effectiveSelectedId) ?? null;

  async function handleAcknowledge(alertId: string) {
    setBusyAlertId(alertId);
    try {
      await data.acknowledge(alertId);
    } finally {
      setBusyAlertId(null);
    }
  }

  async function handleResolve(alertId: string) {
    const note = window.prompt(t("alerts.page.resolveNotePrompt"));
    if (!note) return;
    setBusyAlertId(alertId);
    try {
      await data.resolve(alertId, note);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setBusyAlertId(null);
    }
  }

  if (!organizationId || data.loading) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }

  if (data.error) {
    return <AlertBanner tone="error">{data.error}</AlertBanner>;
  }

  return (
    <div className="flex flex-col gap-6">
      <AlertCenterSummaryHeader
        counts={{ active: data.activeCount, toHandle, informational, resolved24h }}
        onCardClick={(card) => {
          if (card === "active") setSelectedStatuses(["active"]);
          else if (card === "resolved24h") setSelectedStatuses(["resolved"]);
          else if (card === "informational") setSelectedSeverities(["low"]);
          else if (card === "toHandle") setSelectedSeverities(["critical", "high"]);
        }}
      />

      {data.rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={t("alerts.empty")} />
      ) : (
        <div className="grid items-start gap-4" style={{ gridTemplateColumns: "280px 380px 1fr" }}>
          <AlertFiltersPanel
            typeGroups={typeGroups}
            totalTypeCount={data.rows.length}
            allTypesSelected={selectedGroups.length === GROUP_KEYS.length}
            onToggleAllTypes={() => setSelectedGroups((prev) => (prev.length === GROUP_KEYS.length ? [] : [...GROUP_KEYS]))}
            selectedTypeGroupKeys={selectedGroups}
            onToggleTypeGroup={(key) => setSelectedGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))}
            severityCounts={severityCounts}
            selectedSeverities={selectedSeverities}
            onToggleSeverity={(severity) =>
              setSelectedSeverities((prev) => (prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]))
            }
            statusCounts={statusCounts}
            selectedStatuses={selectedStatuses}
            onToggleStatus={(status) => setSelectedStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]))}
            systemStatusLabel={t("alertCenter.systemOperational")}
            systemStatusTimestamp={format.dateTime(new Date(), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          />

          <AlertList items={listItems} selectedId={effectiveSelectedId} onSelect={setSelectedId} sort={sort} onSortChange={setSort} />

          {selectedRow ? (
            (() => {
              const { alert, station, tank } = selectedRow;
              const product = tank ? productById.get(tank.fuelProductId) : undefined;
              const valueUnit = VOLUME_ALERT_TYPES.has(alert.type) ? "L" : "mm";
              const detectedAtLabel = format.dateTime(new Date(alert.triggeredAt), { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

              const keyMetrics: AlertDetailKeyMetric[] = [];
              if (alert.triggeredValue !== null) {
                keyMetrics.push({ icon: Gauge, label: t("alerts.page.triggeredValue"), value: `${format.number(alert.triggeredValue, { maximumFractionDigits: 1 })} ${valueUnit}` });
              }
              if (alert.thresholdValue !== null) {
                keyMetrics.push({ icon: Gauge, label: t("alerts.page.thresholdValue"), value: `${format.number(alert.thresholdValue, { maximumFractionDigits: 1 })} ${valueUnit}` });
              }
              keyMetrics.push({ icon: CalendarClock, label: t("alertCenter.detail.detectedAtLabel"), value: detectedAtLabel });
              keyMetrics.push({ icon: CheckCircle2, label: t("alerts.columns.status"), value: t(`alerts.page.status.${alert.status}`) });

              const generalInfo: AlertDetailInfoRow[] = [
                { icon: AlertTriangle, label: t("alertCenter.detail.typeLabel"), value: t(`alerts.types.${alert.type}`) },
                { icon: AlertOctagon, label: t("alertCenter.detail.severityLabel"), value: t(`alerts.page.severity.${alert.severity}`), valueClassName: SEVERITY_TEXT_CLASS[alert.severity] },
              ];
              if (station) generalInfo.push({ icon: Building2, label: t("alertCenter.detail.stationLabel"), value: station.name });
              if (tank) generalInfo.push({ icon: Gauge, label: t("alertCenter.detail.tankLabel"), value: tank.displayName });
              if (product) generalInfo.push({ icon: Fuel, label: t("alertCenter.detail.productLabel"), value: product.name });
              generalInfo.push({ icon: CalendarClock, label: t("alertCenter.detail.detectedAtLabel"), value: detectedAtLabel });

              const quickActions: AlertDetailQuickAction[] = [];
              if (station) quickActions.push({ icon: Building2, label: t("alertCenter.detail.viewStation"), onClick: () => router.push(`/zylo-liquid/stations/${station.id}`) });
              if (station && tank) quickActions.push({ icon: Gauge, label: t("alertCenter.detail.viewTank"), onClick: () => router.push(`/zylo-liquid/stations/${station.id}/tanks/${tank.id}`) });
              if (alert.status === "active") {
                quickActions.push({
                  icon: UserCheck,
                  label: t("alerts.page.acknowledge"),
                  highlighted: !MANUALLY_RESOLVABLE_TYPES.has(alert.type),
                  onClick: () => handleAcknowledge(alert.id),
                });
                if (MANUALLY_RESOLVABLE_TYPES.has(alert.type)) {
                  quickActions.push({ icon: CheckCircle2, label: t("alerts.page.resolve"), highlighted: true, onClick: () => handleResolve(alert.id) });
                }
              }

              const isBusy = busyAlertId === alert.id;

              return (
                <AlertDetailPanel
                  key={alert.id}
                  type={alert.type}
                  title={t(`alerts.types.${alert.type}`)}
                  severity={alert.severity}
                  triggeredAtLabel={formatFreshness(alert.triggeredAt, format)}
                  location={station ? (tank ? `${station.name} · ${tank.displayName}` : station.name) : t("alertCenter.detail.viewTank")}
                  summaryMessage={t(`alertCenter.causes.${alert.type}.intro`)}
                  keyMetrics={keyMetrics}
                  generalInfo={generalInfo}
                  causeIntro={t(`alertCenter.causes.${alert.type}.intro`)}
                  causes={t.raw(`alertCenter.causes.${alert.type}.causes`) as string[]}
                  impactMessage={t(`alertCenter.causes.${alert.type}.impact`)}
                  quickActions={isBusy ? [] : quickActions}
                  autoResolveHint={MANUALLY_RESOLVABLE_TYPES.has(alert.type) ? t("alertCenter.detail.manualResolveHint") : t("alerts.page.autoResolveHint")}
                  onBack={() => setSelectedId(null)}
                />
              );
            })()
          ) : (
            <EmptyState icon={AlertTriangle} title={t("alerts.empty")} />
          )}
        </div>
      )}
    </div>
  );
}
