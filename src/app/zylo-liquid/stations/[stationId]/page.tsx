"use client";

import { AlertTriangle, ChevronLeft, MoreVertical, Plus, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { deactivateStation, reactivateStation } from "@/core/api/zyloLiquid";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert, Badge, Button, Card, EmptyState } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { CreateStationModal } from "../_components/CreateStationModal";
import { AddTankModal } from "./_components/AddTankModal";
import { TankGauge } from "./_components/TankGauge";
import { useStationDetail } from "./_lib/useStationDetail";

export default function StationDetailPage() {
  const params = useParams<{ stationId: string }>();
  const stationId = params.stationId;
  const t = useTranslations("zyloLiquid.stationDetail");
  const tStations = useTranslations("zyloLiquid.stations");
  const tAlerts = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useStationDetail(currentOrganization?.id ?? null, stationId);

  const [editOpen, setEditOpen] = useState(false);
  const [addTankOpen, setAddTankOpen] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function formatVolume(liters: number): string {
    return `${format.number(Math.round(liters))} L`;
  }

  function formatMoney(value: number, currencyCode: string): string {
    try {
      return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
    } catch {
      return `${format.number(Math.round(value))} ${currencyCode}`;
    }
  }

  function formatTime(iso: string): string {
    return format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });
  }

  async function handleToggleStatus() {
    if (!currentOrganization || !data.station) return;
    setMenuOpen(false);
    setStatusActionError(null);
    try {
      if (data.station.status === "active") {
        if (!window.confirm(t("confirmDeactivate"))) return;
        await deactivateStation(currentOrganization.id, data.station.id);
      } else {
        if (!window.confirm(t("confirmReactivate"))) return;
        await reactivateStation(currentOrganization.id, data.station.id);
      }
      data.reload();
    } catch (err) {
      setStatusActionError(err instanceof Error ? err.message : tCommon("states.error"));
    }
  }

  if (data.loading) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }

  if (!data.station) {
    return <EmptyState icon={AlertTriangle} title={tCommon("states.error")} description={data.error ?? undefined} />;
  }

  const { station } = data;
  const activeTanks = data.tanks.filter((tank) => tank.active);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/zylo-liquid/stations" className="inline-flex w-fit items-center gap-1 text-body-sm text-text-muted hover:text-primary">
        <ChevronLeft className="size-4" aria-hidden />
        {t("backLink")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-h1 font-bold text-text">{station.name}</h1>
            <Badge tone={station.status === "active" ? "success" : station.status === "maintenance" ? "warning" : "neutral"} size="sm">
              {tStations(`status.${station.status}`)}
            </Badge>
          </div>
          <p className="mt-1 text-body-sm text-text-muted">
            {station.code}
            {station.address ? ` · ${station.address}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="#deliveries-panel">
            <Button variant="outline" size="sm">
              <Truck className="size-4" aria-hidden />
              {t("actions.deliveries")}
            </Button>
          </a>
          <a href="#leaks-panel">
            <Button variant="outline" size="sm">
              {t("actions.leaks")}
            </Button>
          </a>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            {t("actions.edit")}
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
              <MoreVertical className="size-4" aria-hidden />
            </Button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-10 mt-1 w-44 rounded-card border border-border-subtle bg-surface p-1 shadow-elevated">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleToggleStatus}
                  className="flex w-full items-center gap-2 rounded-button px-2 py-1.5 text-left text-body-sm text-text hover:bg-surface-muted"
                >
                  {station.status === "active" ? t("actions.deactivate") : t("actions.reactivate")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {statusActionError && <Alert tone="error">{statusActionError}</Alert>}

      {data.alerts.length > 0 && (
        <div className="flex items-center gap-2 rounded-card border border-warning/30 bg-warning-muted px-4 py-3 text-warning">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <span className="font-medium">{t("alertsBanner", { count: data.alerts.length })}</span>
          <span className="text-text-muted">
            —{" "}
            {data.alerts
              .slice(0, 3)
              .map((a) => tAlerts(`types.${a.type}`))
              .join(" · ")}
          </span>
          <a href="#alerts-panel" className="ml-auto shrink-0 text-body-sm font-medium text-primary hover:underline">
            {t("viewAll")}
          </a>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h2 font-semibold text-text">
            {t("tanksSection.title")} <span className="text-body-sm font-normal text-text-muted">{t("tanksSection.activeCount", { count: activeTanks.length })}</span>
          </h2>
          <Button size="sm" onClick={() => setAddTankOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("tanksSection.addTank")}
          </Button>
        </div>

        {activeTanks.length === 0 ? (
          <EmptyState title={t("tanksSection.empty")} />
        ) : (
          <div className="flex flex-col gap-4">
            {activeTanks.map((tank) => {
              const state = data.tankStateById.get(tank.id);
              const product = data.fuelProductById.get(tank.fuelProductId);
              return (
                <Card key={tank.id}>
                  <div className="flex flex-col gap-4 lg:flex-row">
                    <div className="lg:w-24 lg:shrink-0">
                      <p className="font-semibold text-text">{tank.displayName}</p>
                      <Badge tone="primary" size="sm" className="mt-1">
                        {product?.name ?? "?"}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      {state ? (
                        state.volumeLiters === null ? (
                          <p className="flex h-36 items-center justify-center rounded-card border border-dashed border-border text-body-sm text-text-muted">
                            {t("tankCard.notCalculable")}
                          </p>
                        ) : (
                          <TankGauge
                            tank={tank}
                            state={state}
                            fuelProductName={product?.name ?? "?"}
                            displayColor={product?.displayColor ?? null}
                            formatVolume={formatVolume}
                            labels={{ empty: t("gauge.empty"), fuel: t("gauge.fuel"), water: t("gauge.water") }}
                          />
                        )
                      ) : (
                        <PageSpinner label={tCommon("states.loading")} />
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 text-body-sm lg:w-48">
                      <div className="flex justify-between">
                        <span className="text-text-muted">{t("tankCard.capacity")}</span>
                        <span className="tabular-nums text-text">{formatVolume(tank.calibratedCapacityLiters ?? tank.capacityLiters)}</span>
                      </div>
                      <Badge tone={state?.sensorStatus === "online" ? "success" : state?.sensorStatus === "offline" ? "error" : "neutral"} size="sm" dot>
                        {state?.sensorStatus === "online"
                          ? t("tankCard.sensorConnected")
                          : state?.sensorStatus === "offline"
                            ? t("tankCard.sensorDisconnected")
                            : t("tankCard.sensorNotConfigured")}
                      </Badge>
                      {state?.monetaryValue !== null && state?.currencyCode && (
                        <p className="font-semibold tabular-nums text-text">{formatMoney(state.monetaryValue, state.currencyCode)}</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card id="alerts-panel">
          <h3 className="mb-3 text-h3 font-semibold text-text">{t("panels.alertsTitle", { count: data.alerts.length })}</h3>
          {data.alerts.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("panels.alertsEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 text-warning" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-medium text-text">{tAlerts(`types.${a.type}`)}</p>
                  </div>
                  <span className="shrink-0 text-caption text-text-muted">{formatTime(a.triggeredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card id="deliveries-panel">
          <h3 className="mb-3 text-h3 font-semibold text-text">{t("panels.deliveriesTitle", { count: data.deliveries.length })}</h3>
          {data.deliveries.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("panels.deliveriesEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.deliveries.map((d) => (
                <li key={d.id} className="flex items-start gap-2">
                  <Truck className="mt-0.5 size-4 text-success" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-medium tabular-nums text-text">+{formatVolume(d.volumeLiters ?? 0)}</p>
                  </div>
                  <span className="shrink-0 text-caption text-text-muted">{formatTime(d.endTime)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card id="leaks-panel">
          <h3 className="mb-3 text-h3 font-semibold text-text">{t("panels.leaksTitle", { count: data.leakEvents.filter((l) => l.result === "anomaly").length })}</h3>
          {data.leakEvents.filter((l) => l.result === "anomaly").length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("panels.leaksEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.leakEvents
                .filter((l) => l.result === "anomaly")
                .map((l) => (
                  <li key={l.id} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 text-error" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-medium tabular-nums text-text">{l.leakRateLph?.toFixed(2)} L/H</p>
                    </div>
                    <span className="shrink-0 text-caption text-text-muted">{formatTime(l.endTime)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      {currentOrganization && (
        <>
          <CreateStationModal organizationId={currentOrganization.id} open={editOpen} onOpenChange={setEditOpen} onCreated={data.reload} station={station} />
          <AddTankModal
            organizationId={currentOrganization.id}
            stationId={stationId}
            fuelProducts={data.fuelProducts}
            open={addTankOpen}
            onOpenChange={setAddTankOpen}
            onCreated={data.reload}
          />
        </>
      )}
    </div>
  );
}
