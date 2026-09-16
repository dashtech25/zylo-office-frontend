"use client";

import { AlertTriangle, Beaker, Droplet, Fuel, Gauge, Package, Radio, SlidersHorizontal, Thermometer, Truck, Wallet } from "lucide-react";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { usePermissions } from "@/core/rbac/PermissionContext";
import { acknowledgeAlert, type Alert as ZyloAlert, type TankMeasurement } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { ActivityRow, Alert, Badge, Button, Card, CardSectionHeader, CardSkeleton, EmptyState, InfoRow, Kpi, KpiSkeleton, PageHeader, Skeleton, Stack, Tabs } from "@/shared/ui";

import { AlertsBrowserModal } from "@/modules/zylo-liquid/components/AlertsBrowserModal";
import { DeliveriesBrowserModal } from "@/modules/zylo-liquid/components/DeliveriesBrowserModal";
import { LeaksBrowserModal } from "@/modules/zylo-liquid/components/LeaksBrowserModal";
import { computeTankVisualData, ModeSwitcher, TankLegend, TankVisual, type TankVisualMode } from "@/modules/zylo-liquid/components/TankVisual";
import { TrendChart } from "@/modules/zylo-liquid/components/TrendChart";
import { CalibrationModal } from "@/modules/zylo-liquid/components/CalibrationModal";
import { MeasurementHistoryTable } from "@/modules/zylo-liquid/screens/tank-detail/MeasurementHistoryTable";
import { ComingSoonTabContent } from "@/modules/zylo-liquid/screens/settings/ComingSoonTabContent";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { EditTankModal } from "./EditTankModal";
import { useTankDetail } from "./useTankDetail";

// Même permission que celle qui protège déjà la valorisation monétaire du
// stock ailleurs dans ce module (StationDetailScreen.tsx, TankCard.tsx) —
// jamais une nouvelle permission "voirValeur" inventée pour coller au
// prototype : pour les rôles qui ne l'ont pas, le 5e KPI retombe sur "Eau
// détectée" (donnée réelle elle aussi), jamais un "taux de perte" inventé.
const PRICE_HISTORY_READ = "zyloLiquid.priceHistory.read";

const HISTORY_RANGES = [0, 14, 7, 3, 1] as const;
type HistoryRangeDays = (typeof HISTORY_RANGES)[number];

/** Page détail d'une cuve, restructurée en 5 onglets pour reproduire la
 * disposition et la navigation de la référence validée (prototype.html,
 * `pageCuve()` ~ligne 4138 : onglets jauge/historique/alarmes/jaugeage/
 * technique) — remplace la page unique scrollable précédente. Toute
 * l'information déjà affichée par cette page avant la présente mission est
 * conservée intégralement (carte financière, carte capteur, carte
 * calibration, livraisons/fuites récentes) : rien n'est retiré, seulement
 * réorganisé selon la disposition du prototype, plus les informations que
 * lui n'a pas (ces 4 cartes n'existent pas dans le prototype). "Jaugeage
 * manuel" reste hors périmètre (CAS 3, cf.
 * phase-3-prototype-compatibility-matrix.md) — aucun endpoint dédié
 * n'existe, section "à venir". */
export default function TankDetailScreen() {
  const params = useParams<{ stationId: string; tankId: string }>();
  const { stationId, tankId } = params;
  const t = useTranslations("zyloLiquid.tankDetail");
  const tRoot = useTranslations("zyloLiquid");
  const tAlerts = useTranslations("zyloLiquid.alerts");
  const tLeakResult = useTranslations("zyloLiquid.leaks.result");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const { can } = usePermissions();
  const data = useTankDetail(currentOrganization?.id ?? null, stationId, tankId);
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [gaugeMode, setGaugeMode] = useState<TankVisualMode>("horizontal");
  const [historyRangeDays, setHistoryRangeDays] = useState<HistoryRangeDays>(0);

  const [alertsModal, setAlertsModal] = useState<{ open: boolean; initialAlertId: string | null }>({ open: false, initialAlertId: null });
  const [deliveriesModal, setDeliveriesModal] = useState<{ open: boolean; initialDeliveryId: string | null }>({ open: false, initialDeliveryId: null });
  const [leaksModal, setLeaksModal] = useState<{ open: boolean; initialLeakId: string | null }>({ open: false, initialLeakId: null });

  function formatVolume(liters: number): string {
    return `${formatLiters(liters)} L`;
  }
  function formatMoney(value: number, currencyCode: string): string {
    try {
      return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
    } catch {
      return `${format.number(Math.round(value))} ${currencyCode}`;
    }
  }
  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  function formatChartTick(iso: string): string {
    return format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });
  }

  // D3 (refonte alertes) : "je m'en occupe" — ne referme jamais l'alerte,
  // se ferme automatiquement dès que la condition disparaît.
  async function handleAcknowledge(alert: ZyloAlert) {
    if (!currentOrganization) return;
    setResolvingId(alert.id);
    try {
      await acknowledgeAlert(currentOrganization.id, alert.id);
      await data.reload();
    } finally {
      setResolvingId(null);
    }
  }

  // Le sélecteur de plage filtre les mesures déjà chargées (fenêtre de 30
  // jours, cf. useTankDetail.ts) sans nouvelle requête — même principe que
  // le sélecteur de plage du prototype ("les mesures sont déjà chargées...
  // le sélecteur restreint l'affichage, il ne déclenche pas de requête").
  const rangedMeasurements = useMemo(() => {
    if (historyRangeDays === 0) return data.measurements;
    const since = Date.now() - historyRangeDays * 24 * 60 * 60 * 1000;
    return data.measurements.filter((m) => new Date(m.measuredAt).getTime() >= since);
  }, [data.measurements, historyRangeDays]);

  const allMeasurementPoints = rangedMeasurements
    .filter((m: TankMeasurement) => m.volumeLiters !== null)
    .map((m: TankMeasurement) => ({ at: m.measuredAt, value: m.volumeLiters as number }));
  const MAX_CHART_POINTS = 40;
  const sampleStep = Math.max(1, Math.ceil(allMeasurementPoints.length / MAX_CHART_POINTS));
  const measurementPoints = allMeasurementPoints.filter((_, i) => i % sampleStep === 0);

  if (data.loading) {
    return (
      <Stack>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-72" />
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </Stack>
    );
  }
  if (!data.tank || !data.state || !data.station) {
    return <EmptyState icon={AlertTriangle} title={tCommon("states.error")} description={data.error ?? undefined} />;
  }

  const { tank, state, station, fuelProduct } = data;
  const visualData = computeTankVisualData(tank, state);

  // state.volumeLiters est DÉJÀ net d'eau (le backend la soustrait avant de
  // renvoyer ce champ, service.py get_tank_current_state) — ne jamais la
  // resoustraire ici, sinon l'eau est comptée en moins deux fois (bug
  // corrigé : c'était le cas avant).
  const realVolumeLiters = state.volumeLiters ?? 0;
  const sensorTone = state.sensorStatus === "online" ? "ok" : state.sensorStatus === "offline" ? "error" : "idle";

  const activeAlerts = data.alerts.filter((a) => a.status === "active");
  const bannerAlert = activeAlerts.find((a) => a.type === "leak") ?? activeAlerts.find((a) => a.type === "level_high") ?? activeAlerts[0] ?? null;
  const bannerTone = bannerAlert && bannerAlert.severity === "critical" ? "error" : "warning";
  const bannerLeakRate = bannerAlert?.type === "leak" ? data.leakEvents.find((e) => e.result === "anomaly")?.leakRateLph ?? null : null;

  const activeSensorMappings = data.sensorMappings.filter((m) => m.active);
  const calibrationMaxHeight = data.calibrationPoints.length > 0 ? Math.max(...data.calibrationPoints.map((p) => p.heightMm)) : null;

  const capacity = tank.calibratedCapacityLiters ?? tank.capacityLiters;
  const waterVolume = visualData.waterVolumeLiters;
  const emptyVolume = visualData.emptyVolumeLiters;
  const fuelVolume = realVolumeLiters;
  const compositionRows: { key: string; label: string; color: string; volume: number }[] = [
    { key: "fuel", label: t("composition.fuel"), color: fuelProduct?.displayColor ?? "var(--color-primary)", volume: fuelVolume },
    { key: "water", label: t("composition.water"), color: "var(--color-info)", volume: waterVolume },
    { key: "available", label: t("composition.available"), color: "var(--color-surface-muted)", volume: emptyVolume },
  ];

  return (
    <Stack>
      {/* Zone A — en-tête de la cuve */}
      <PageHeader
        breadcrumbs={[
          { label: tRoot("stations.title"), href: "/zylo-liquid/stations" },
          { label: station.name, href: `/zylo-liquid/stations/${stationId}` },
          { label: tank.displayName },
        ]}
        breadcrumbLabel={t("breadcrumbLabel")}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {tank.displayName}
            <Badge tone="secondary">{fuelProduct?.name ?? "?"}</Badge>
          </span>
        }
        description={
          <>
            {t("subtitle", { capacity: formatVolume(tank.calibratedCapacityLiters ?? tank.capacityLiters), height: tank.tankHeightMm ? Math.round(tank.tankHeightMm) : "—" })}
            <br />
            <Badge tone={sensorTone} dot className="mt-2">
              {t(`sensorStatus.${state.sensorStatus}`)}
            </Badge>
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="primary" size="sm" onClick={() => setThresholdsOpen(true)}>
              <SlidersHorizontal className="size-4" aria-hidden />
              {t("actions.editTank")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCalibrationOpen(true)}>
              <Gauge className="size-4" aria-hidden />
              {t("actions.calibration")}
            </Button>
          </div>
        }
      />

      {/* Zone B — bandeau d'alerte */}
      {bannerAlert && (
        <Alert
          tone={bannerTone}
          title={tAlerts(`types.${bannerAlert.type}`)}
          action={
            <Button variant={bannerTone === "error" ? "destructive" : "outline"} size="sm" loading={resolvingId === bannerAlert.id} onClick={() => handleAcknowledge(bannerAlert)}>
              {t("alertBanner.acknowledge")}
            </Button>
          }
        >
          {t("alertBanner.since", { date: formatDateTime(bannerAlert.triggeredAt) })}
          {bannerLeakRate !== null && ` · ${t("alertBanner.rate", { rate: format.number(bannerLeakRate, { maximumFractionDigits: 2 }) })}`}
        </Alert>
      )}

      {/* 5 KPIs (référence validée) — "Couverture de stock" reste non
          calculable (aucun débit de vente réel disponible, jamais un
          chiffre inventé) ; le 5e KPI est "Valeur du stock" pour les rôles
          ayant droit à la valorisation, sinon "Eau détectée". */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi icon={Fuel} label={t("kpis.volume")} value={formatVolume(realVolumeLiters)} sub={visualData.pct !== null ? `${visualData.pct.toFixed(1)} %` : undefined} />
        <Kpi icon={Gauge} label={t("kpis.sellable")} value={state.sellableVolumeLiters === null ? "—" : formatVolume(state.sellableVolumeLiters)} />
        <Kpi icon={Package} label={t("kpis.available")} value={formatVolume(emptyVolume)} />
        <Kpi icon={Thermometer} label={t("kpis.coverage")} disabled disabledLabel={tCommon("states.comingSoon")} />
        {can(PRICE_HISTORY_READ) ? (
          <Kpi
            icon={Wallet}
            label={t("kpis.value")}
            value={state.monetaryValue !== null && state.currencyCode ? formatMoney(state.monetaryValue, state.currencyCode) : "—"}
          />
        ) : (
          <Kpi icon={Droplet} label={t("kpis.water")} value={state.waterHeightMm === null ? "—" : `${Math.round(state.waterHeightMm)} mm`} tone={visualData.waterVolumeLiters > 0 ? "warning" : "neutral"} />
        )}
      </div>

      <Tabs
        variant="underline"
        items={[
          {
            value: "gauge",
            label: t("tabs.gauge"),
            content: (
              <Stack>
                <Card>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-h4 font-semibold text-text">{tRoot(`tankVisual.modes.${gaugeMode}.label`)}</h2>
                      <p className="text-body-sm text-text-muted">{tRoot(`tankVisual.modes.${gaugeMode}.desc`)}</p>
                    </div>
                    <ModeSwitcher mode={gaugeMode} onChange={setGaugeMode} />
                  </div>
                  <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="flex min-h-[200px] flex-1 items-center justify-center">
                      <TankVisual tank={tank} state={state} mode={gaugeMode} big fuelColor={fuelProduct?.displayColor} />
                    </div>
                    <div className="flex w-full flex-col gap-5 lg:w-64 lg:shrink-0">
                      <div>
                        <h4 className="mb-1 text-caption font-semibold uppercase tracking-wide text-text-muted">{t("cards.thresholdsTitle")} (mm)</h4>
                        <InfoRow label={t("technical.thresholdHigh")} value={`${Math.round(tank.heightAlarmMm)} mm`} mono />
                        <InfoRow label={t("technical.thresholdPreAlarm")} value={`${Math.round(tank.heightAlertMm)} mm`} mono />
                        <InfoRow label={t("technical.thresholdLow")} value={`${Math.round(tank.lowAlarmMm)} mm`} mono />
                        <InfoRow label={t("technical.thresholdWater")} value={`${Math.round(tank.alertWaterMaxMm)} mm`} mono />
                      </div>
                      <div>
                        <h4 className="mb-1 text-caption font-semibold uppercase tracking-wide text-text-muted">{t("cards.volumesTitle")}</h4>
                        <InfoRow
                          label={state.temperatureC !== null ? `${t("composition.real")} (${state.temperatureC.toFixed(1)}°C)` : t("composition.real")}
                          value={formatVolume(realVolumeLiters)}
                          mono
                        />
                        <InfoRow label={t("composition.sellable")} value={state.sellableVolumeLiters === null ? "—" : formatVolume(state.sellableVolumeLiters)} mono />
                        <InfoRow label={t("composition.correctedAt15C")} value={state.volumeLiters15C === null ? "—" : formatVolume(state.volumeLiters15C)} mono />
                        <InfoRow label={t("composition.water")} value={formatVolume(waterVolume)} mono />
                        <InfoRow label={t("composition.available")} value={formatVolume(emptyVolume)} mono />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-border-subtle pt-3">
                    <TankLegend />
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Kpi icon={Package} label={t("technical.capacity")} value={formatVolume(capacity)} />
                  <Kpi icon={Fuel} label={t("technical.product")} value={fuelProduct?.name ?? "?"} />
                  <Kpi icon={Gauge} label={t("technical.height")} value={tank.tankHeightMm ? `${Math.round(tank.tankHeightMm)} mm` : "—"} />
                  <Kpi icon={Droplet} label={t("kpis.fuelHeight")} value={state.heightMm !== null ? `${Math.round(state.heightMm)} mm` : "—"} />
                  <Kpi icon={Thermometer} label={t("kpis.temperature")} value={state.temperatureC !== null ? `${state.temperatureC.toFixed(1)} °C` : "—"} />
                  <Kpi icon={Beaker} label={t("kpis.density")} value={fuelProduct?.densityGPerCm3 !== null && fuelProduct?.densityGPerCm3 !== undefined ? `${fuelProduct.densityGPerCm3.toFixed(3)} kg/L` : "—"} />
                </div>

                <Card>
                  <CardSectionHeader title={t("composition.title")} />
                  <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                    <TankVisual tank={tank} state={state} mode="anneau" big fuelColor={fuelProduct?.displayColor} />
                    <div className="w-full flex-1">
                      {compositionRows.map((row) => (
                        <div key={row.key} className="flex items-center justify-between gap-3 border-b border-border-subtle py-2 last:border-b-0">
                          <span className="flex items-center gap-2 text-body-sm text-text-muted">
                            <span className="size-2.5 rounded-full border border-border-subtle" style={{ background: row.color }} />
                            {row.label}
                          </span>
                          <span className="font-mono text-body-sm text-text">{formatVolume(row.volume)}</span>
                          <span className="font-mono text-body-sm text-text-muted">{capacity > 0 ? `${((row.volume / capacity) * 100).toFixed(1)} %` : "—"}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-3 pt-2 text-body-sm font-semibold text-text">
                        <span>{t("technical.capacity")}</span>
                        <span className="font-mono">{formatVolume(capacity)}</span>
                        <span className="font-mono">100,0 %</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardSectionHeader title={t("allModes.title")} />
                  <p className="-mt-2 mb-3 text-body-sm text-text-muted">{t("allModes.subtitle")}</p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {(["vertical", "horizontal", "anneau", "compact"] as TankVisualMode[]).map((m) => (
                      <div key={m} className="flex flex-col items-center gap-2">
                        <div className="flex w-full items-center justify-center">
                          <TankVisual tank={tank} state={state} mode={m} fuelColor={fuelProduct?.displayColor} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Stack>
            ),
          },
          {
            value: "history",
            label: t("tabs.history"),
            content: (
              <Stack>
                <Card>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-caption font-semibold uppercase tracking-wide text-text-muted">{t("history.rangeLabel")}</span>
                    <div className="flex flex-wrap gap-1 rounded-button bg-surface-muted p-1">
                      {HISTORY_RANGES.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setHistoryRangeDays(days)}
                          className={`rounded-button px-2.5 py-1 text-caption font-medium transition-colors ${
                            historyRangeDays === days ? "bg-surface text-text shadow-soft" : "text-text-muted hover:bg-surface/60"
                          }`}
                        >
                          {t(`history.ranges.${days}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <h2 className="text-h4 font-semibold text-text">{t("history.title")}</h2>
                  <div className="mb-3 mt-1 text-body-sm text-text-muted">{t("history.subtitle", { count: allMeasurementPoints.length })}</div>
                  {measurementPoints.length < 2 ? (
                    <EmptyState title={t("history.empty")} />
                  ) : (
                    <TrendChart points={measurementPoints} formatValue={formatVolume} formatDate={formatChartTick} seriesLabel={t("history.title")} />
                  )}
                </Card>

                {currentOrganization && (
                  <Card>
                    <h2 className="mb-3 text-h4 font-semibold text-text">{t("history.table.title")}</h2>
                    <MeasurementHistoryTable organizationId={currentOrganization.id} tankId={tankId} />
                  </Card>
                )}

                <ComingSoonTabContent note={t("history.waterTempNote")} />

                <Card>
                  <CardSectionHeader
                    title={t("recent.deliveriesTitle")}
                    action={
                      <button type="button" onClick={() => setDeliveriesModal({ open: true, initialDeliveryId: null })} className="text-caption font-medium text-primary hover:underline">
                        {t("recent.viewAll")}
                      </button>
                    }
                  />
                  {data.deliveries.length === 0 ? (
                    <p className="text-body-sm text-text-muted">{t("recent.noDeliveries")}</p>
                  ) : (
                    data.deliveries.map((d) => (
                      <ActivityRow
                        key={d.id}
                        icon={Truck}
                        iconTone="success"
                        title={d.volumeLiters !== null ? `+${formatVolume(d.volumeLiters)}` : "—"}
                        meta={formatDateTime(d.endTime)}
                        onClick={() => setDeliveriesModal({ open: true, initialDeliveryId: d.id })}
                      />
                    ))
                  )}
                </Card>
              </Stack>
            ),
          },
          {
            value: "alerts",
            label: t("tabs.alerts", { count: activeAlerts.length }),
            content: (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardSectionHeader
                    title={t("recent.alertsTitle")}
                    action={
                      <button type="button" onClick={() => setAlertsModal({ open: true, initialAlertId: null })} className="text-caption font-medium text-primary hover:underline">
                        {t("recent.viewAll")}
                      </button>
                    }
                  />
                  {data.alerts.length === 0 ? (
                    <p className="text-body-sm text-text-muted">{t("recent.noAlerts")}</p>
                  ) : (
                    data.alerts.map((a) => (
                      <ActivityRow
                        key={a.id}
                        icon={AlertTriangle}
                        iconTone={a.status === "active" ? (a.type === "leak" || a.type === "level_high" ? "error" : "warning") : "neutral"}
                        title={tAlerts(`types.${a.type}`)}
                        meta={formatDateTime(a.triggeredAt)}
                        trailing={
                          <Badge tone={a.status === "active" ? "error" : "success"} dot>
                            {t(`alerts.status.${a.status}`)}
                          </Badge>
                        }
                        onClick={() => setAlertsModal({ open: true, initialAlertId: a.id })}
                      />
                    ))
                  )}
                </Card>

                <Card>
                  <CardSectionHeader
                    title={t("recent.leaksTitle")}
                    action={
                      <button type="button" onClick={() => setLeaksModal({ open: true, initialLeakId: null })} className="text-caption font-medium text-primary hover:underline">
                        {t("recent.viewAll")}
                      </button>
                    }
                  />
                  {data.leakEvents.length === 0 ? (
                    <p className="text-body-sm text-text-muted">{t("recent.noLeaks")}</p>
                  ) : (
                    data.leakEvents.map((e) => (
                      <ActivityRow
                        key={e.id}
                        icon={Droplet}
                        iconTone={e.result === "anomaly" ? "error" : "neutral"}
                        title={formatDateTime(e.endTime)}
                        meta={e.leakRateLph !== null ? t("recent.leakRate", { rate: format.number(e.leakRateLph, { maximumFractionDigits: 2 }) }) : tLeakResult(e.result)}
                        trailing={<Badge tone={e.result === "anomaly" ? "error" : "success"}>{tLeakResult(e.result)}</Badge>}
                        onClick={() => setLeaksModal({ open: true, initialLeakId: e.id })}
                      />
                    ))
                  )}
                </Card>
              </div>
            ),
          },
          { value: "gauging", label: t("tabs.gauging"), content: <ComingSoonTabContent note={t("gaugingNote")} /> },
          {
            value: "technical",
            label: t("tabs.technical"),
            content: (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardSectionHeader icon={SlidersHorizontal} title={t("cards.thresholdsTitle")} />
                  <InfoRow label={t("technical.thresholdHigh")} value={`${Math.round(tank.heightAlarmMm)} mm`} mono />
                  <InfoRow label={t("technical.thresholdPreAlarm")} value={`${Math.round(tank.heightAlertMm)} mm`} mono />
                  <InfoRow label={t("technical.thresholdLow")} value={`${Math.round(tank.lowAlarmMm)} mm`} mono />
                  <InfoRow label={t("technical.thresholdWater")} value={`${Math.round(tank.alertWaterMaxMm)} mm`} mono />
                  <Button variant="link" size="inline" className="mt-2" onClick={() => setThresholdsOpen(true)}>
                    {t("actions.editTank")}
                  </Button>
                </Card>

                <Card>
                  <CardSectionHeader icon={Radio} title={t("cards.sensorTitle")} />
                  <InfoRow label={t("sensorCard.status")} value={<Badge tone={sensorTone} dot>{t(`sensorStatus.${state.sensorStatus}`)}</Badge>} />
                  <InfoRow
                    label={t("sensorCard.measurementTypes")}
                    value={activeSensorMappings.length === 0 ? "—" : activeSensorMappings.map((m) => t(`technical.measurementType.${m.measurementType}`)).join(", ")}
                  />
                  <InfoRow label={t("sensorCard.lastMeasurement")} value={state.lastMeasurementAt ? formatDateTime(state.lastMeasurementAt) : "—"} mono />
                </Card>

                <Card>
                  <CardSectionHeader icon={Gauge} title={t("cards.calibrationTitle")} />
                  {data.calibrationPoints.length === 0 ? (
                    <p className="text-body-sm text-text-muted">{t("calibrationCard.noPoints")}</p>
                  ) : (
                    <>
                      <InfoRow label={t("calibrationCard.pointsLoaded")} value={data.calibrationPoints.length} mono />
                      <InfoRow label={t("calibrationCard.maxHeight")} value={calibrationMaxHeight !== null ? `${Math.round(calibrationMaxHeight)} mm` : "—"} mono />
                    </>
                  )}
                  <Button variant="link" size="inline" className="mt-2" onClick={() => setCalibrationOpen(true)}>
                    {t("cards.viewCalibrationTable")}
                  </Button>
                </Card>

                <Card>
                  <CardSectionHeader icon={Wallet} title={t("cards.financialTitle")} />
                  <InfoRow
                    label={t("financialCard.unitPrice")}
                    value={
                      state.unitPriceAmount !== null && state.currencyCode
                        ? `${formatMoney(state.unitPriceAmount, state.currencyCode)}/L`
                        : t("financialCard.noPrice")
                    }
                    mono
                  />
                  <InfoRow label={t("financialCard.totalValue")} value={state.monetaryValue !== null && state.currencyCode ? formatMoney(state.monetaryValue, state.currencyCode) : "—"} mono />
                  <InfoRow label={t("financialCard.lastUpdate")} value={state.lastMeasurementAt ? formatDateTime(state.lastMeasurementAt) : "—"} mono />
                </Card>
              </div>
            ),
          },
        ]}
      />

      {data.error && <Alert tone="error">{data.error}</Alert>}

      {currentOrganization && (
        <>
          <EditTankModal organizationId={currentOrganization.id} tank={tank} open={thresholdsOpen} onOpenChange={setThresholdsOpen} onUpdated={data.reload} />
          <CalibrationModal organizationId={currentOrganization.id} tank={tank} open={calibrationOpen} onOpenChange={setCalibrationOpen} onUpdated={data.reload} />
          <AlertsBrowserModal
            organizationId={currentOrganization.id}
            open={alertsModal.open}
            onOpenChange={(open) => setAlertsModal({ open, initialAlertId: open ? alertsModal.initialAlertId : null })}
            title={t("recent.alertsTitle")}
            tankId={tankId}
            initialAlertId={alertsModal.initialAlertId}
          />
          <DeliveriesBrowserModal
            organizationId={currentOrganization.id}
            open={deliveriesModal.open}
            onOpenChange={(open) => setDeliveriesModal({ open, initialDeliveryId: open ? deliveriesModal.initialDeliveryId : null })}
            title={t("recent.deliveriesTitle")}
            tankId={tankId}
            initialDeliveryId={deliveriesModal.initialDeliveryId}
          />
          <LeaksBrowserModal
            organizationId={currentOrganization.id}
            open={leaksModal.open}
            onOpenChange={(open) => setLeaksModal({ open, initialLeakId: open ? leaksModal.initialLeakId : null })}
            title={t("recent.leaksTitle")}
            tankId={tankId}
            initialLeakId={leaksModal.initialLeakId}
          />
        </>
      )}
    </Stack>
  );
}
