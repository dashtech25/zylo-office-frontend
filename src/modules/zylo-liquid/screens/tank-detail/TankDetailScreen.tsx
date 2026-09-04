"use client";

import { AlertTriangle, Beaker, Droplet, Fuel, Gauge, Package, Radio, SlidersHorizontal, Thermometer, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { resolveAlert, type Alert as ZyloAlert, type TankMeasurement } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { ActivityRow, Alert, Badge, Button, Card, CardSectionHeader, EmptyState, InfoRow, Kpi, PageHeader, Stack } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { computeTankVisualData, TankVisual } from "@/modules/zylo-liquid/components/TankVisual";
import { TrendChart } from "@/modules/zylo-liquid/components/TrendChart";
import { CalibrationModal } from "@/modules/zylo-liquid/components/CalibrationModal";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { EditThresholdsModal } from "./EditThresholdsModal";
import { useTankDetail } from "./useTankDetail";

/** Page unique et scrollable (Zones A→G), conforme à la référence visuelle
 * validée pour la refonte de "Détail d'une cuve". Remplace l'ancienne
 * navigation par onglets (gauge/history/alerts/gauging/technical) : tout le
 * contenu utile de ces onglets est désormais fusionné dans la même page,
 * dans l'ordre où l'utilisateur en a besoin. "Jaugeage manuel" reste hors
 * périmètre (CAS 3, cf. phase-3-prototype-compatibility-matrix.md) — aucune
 * section ne lui est dédiée tant que l'endpoint dédié n'existe pas. */
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
  const data = useTankDetail(currentOrganization?.id ?? null, stationId, tankId);
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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

  async function handleResolve(alert: ZyloAlert) {
    if (!currentOrganization) return;
    setResolvingId(alert.id);
    try {
      await resolveAlert(currentOrganization.id, alert.id);
      await data.reload();
    } finally {
      setResolvingId(null);
    }
  }

  if (data.loading) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }
  if (!data.tank || !data.state || !data.station) {
    return <EmptyState icon={AlertTriangle} title={tCommon("states.error")} description={data.error ?? undefined} />;
  }

  const { tank, state, station, fuelProduct } = data;
  const visualData = computeTankVisualData(tank, state);
  const allMeasurementPoints = data.measurements
    .filter((m: TankMeasurement) => m.volumeLiters !== null)
    .map((m: TankMeasurement) => ({ at: m.measuredAt, value: m.volumeLiters as number }));
  const MAX_CHART_POINTS = 8;
  const sampleStep = Math.max(1, Math.ceil(allMeasurementPoints.length / MAX_CHART_POINTS));
  const measurementPoints = allMeasurementPoints.filter((_, i) => i % sampleStep === 0);

  const fuelVolumeLiters = Math.max(0, (state.volumeLiters ?? 0) - visualData.waterVolumeLiters);
  const sensorTone = state.sensorStatus === "online" ? "ok" : state.sensorStatus === "offline" ? "error" : "idle";

  const activeAlerts = data.alerts.filter((a) => a.status === "active");
  const bannerAlert = activeAlerts.find((a) => a.type === "leak") ?? activeAlerts.find((a) => a.type === "level_high") ?? activeAlerts[0] ?? null;
  const bannerTone = bannerAlert && (bannerAlert.type === "leak" || bannerAlert.type === "level_high") ? "error" : "warning";
  const bannerLeakRate = bannerAlert?.type === "leak" ? data.leakEvents.find((e) => e.result === "anomaly")?.leakRateLph ?? null : null;

  const activeSensorMappings = data.sensorMappings.filter((m) => m.active);
  const calibrationMaxHeight = data.calibrationPoints.length > 0 ? Math.max(...data.calibrationPoints.map((p) => p.heightMm)) : null;

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
              {t("actions.editThresholds")}
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
            <Button variant={bannerTone === "error" ? "destructive" : "outline"} size="sm" loading={resolvingId === bannerAlert.id} onClick={() => handleResolve(bannerAlert)}>
              {t("alertBanner.resolve")}
            </Button>
          }
        >
          {t("alertBanner.since", { date: formatDateTime(bannerAlert.triggeredAt) })}
          {bannerLeakRate !== null && ` · ${t("alertBanner.rate", { rate: format.number(bannerLeakRate, { maximumFractionDigits: 2 }) })}`}
        </Alert>
      )}

      {/* Zone C — visualisation principale de la cuve */}
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-h-[200px] flex-1">
            <TankVisual tank={tank} state={state} mode="horizontal" big fuelColor={fuelProduct?.displayColor} />
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
              <InfoRow label={t("composition.fuel")} value={formatVolume(fuelVolumeLiters)} mono />
              <InfoRow label={t("composition.water")} value={formatVolume(visualData.waterVolumeLiters)} mono />
              <InfoRow label={t("composition.available")} value={formatVolume(visualData.emptyVolumeLiters)} mono />
            </div>
          </div>
        </div>
      </Card>

      {/* Zone D — informations rapides */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={Package} label={t("technical.capacity")} value={formatVolume(tank.calibratedCapacityLiters ?? tank.capacityLiters)} />
        <Kpi icon={Fuel} label={t("technical.product")} value={fuelProduct?.name ?? "?"} />
        <Kpi icon={Gauge} label={t("technical.height")} value={tank.tankHeightMm ? `${Math.round(tank.tankHeightMm)} mm` : "—"} />
        <Kpi icon={Droplet} label={t("kpis.fuelHeight")} value={state.heightMm !== null ? `${Math.round(state.heightMm)} mm` : "—"} />
        <Kpi icon={Thermometer} label={t("kpis.temperature")} value={state.temperatureC !== null ? `${state.temperatureC.toFixed(1)} °C` : "—"} />
        <Kpi icon={Beaker} label={t("kpis.density")} value={fuelProduct?.densityGPerCm3 !== null && fuelProduct?.densityGPerCm3 !== undefined ? `${fuelProduct.densityGPerCm3.toFixed(3)} kg/L` : "—"} />
      </div>

      {/* Zone E — graphique historique */}
      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("history.title")}</h2>
        <div className="mb-3 mt-1 text-body-sm text-text-muted">{t("history.subtitle", { count: allMeasurementPoints.length })}</div>
        {measurementPoints.length < 2 ? (
          <EmptyState title={t("history.empty")} />
        ) : (
          <TrendChart points={measurementPoints} formatValue={formatVolume} formatDate={formatChartTick} seriesLabel={t("history.title")} />
        )}
      </Card>

      {/* Zone F — cartes d'informations */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardSectionHeader icon={SlidersHorizontal} title={t("cards.thresholdsTitle")} />
          <InfoRow label={t("technical.thresholdHigh")} value={`${Math.round(tank.heightAlarmMm)} mm`} mono />
          <InfoRow label={t("technical.thresholdPreAlarm")} value={`${Math.round(tank.heightAlertMm)} mm`} mono />
          <InfoRow label={t("technical.thresholdLow")} value={`${Math.round(tank.lowAlarmMm)} mm`} mono />
          <InfoRow label={t("technical.thresholdWater")} value={`${Math.round(tank.alertWaterMaxMm)} mm`} mono />
          <Button variant="link" size="inline" className="mt-2" onClick={() => setThresholdsOpen(true)}>
            {t("actions.editThresholds")}
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
          <InfoRow label={t("financialCard.unitPrice")} value={fuelProduct?.currentPriceFcfa !== null && fuelProduct?.currentPriceFcfa !== undefined ? `${format.number(fuelProduct.currentPriceFcfa)} FCFA/L` : t("financialCard.noPrice")} mono />
          <InfoRow label={t("financialCard.totalValue")} value={state.monetaryValue !== null && state.currencyCode ? formatMoney(state.monetaryValue, state.currencyCode) : "—"} mono />
          <InfoRow label={t("financialCard.lastUpdate")} value={state.lastMeasurementAt ? formatDateTime(state.lastMeasurementAt) : "—"} mono />
        </Card>
      </div>

      {/* Zone G — activités récentes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardSectionHeader
            title={t("recent.deliveriesTitle")}
            action={
              <Link href={`/zylo-liquid/livraisons?tank=${tankId}`} className="text-caption font-medium text-primary">
                {t("recent.viewAll")}
              </Link>
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
              />
            ))
          )}
        </Card>

        <Card>
          <CardSectionHeader
            title={t("recent.leaksTitle")}
            action={
              <Link href={`/zylo-liquid/fuites?tank=${tankId}`} className="text-caption font-medium text-primary">
                {t("recent.viewAll")}
              </Link>
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
              />
            ))
          )}
        </Card>

        <Card>
          <CardSectionHeader
            title={t("recent.alertsTitle")}
            action={
              <Link href={`/zylo-liquid/alerts?tank=${tankId}`} className="text-caption font-medium text-primary">
                {t("recent.viewAll")}
              </Link>
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
              />
            ))
          )}
        </Card>
      </div>

      {data.error && <Alert tone="error">{data.error}</Alert>}

      {currentOrganization && (
        <>
          <EditThresholdsModal organizationId={currentOrganization.id} tank={tank} open={thresholdsOpen} onOpenChange={setThresholdsOpen} onUpdated={data.reload} />
          <CalibrationModal organizationId={currentOrganization.id} tank={tank} open={calibrationOpen} onOpenChange={setCalibrationOpen} onUpdated={data.reload} />
        </>
      )}
    </Stack>
  );
}
