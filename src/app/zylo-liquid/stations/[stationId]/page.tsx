"use client";

import { AlertTriangle, Banknote, Bell, ChevronLeft, Fuel, Gauge, MoreVertical, Plus, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { deactivateStation, reactivateStation } from "@/core/api/zyloLiquid";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { EmptyState } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { Kpi } from "../../_components/Kpi";
import { ModeSwitcher, TankLegend, TankVisual, type TankVisualMode } from "../../_components/TankVisual";
import { CreateStationModal } from "../_components/CreateStationModal";
import { AddTankModal } from "./_components/AddTankModal";
import { useStationDetail } from "./_lib/useStationDetail";

const TABS = ["overview", "pumps", "staff", "compliance", "atg"] as const;

/** Reproduit fidèlement `pageStation()` du prototype validé
 * (prototype.html, ~ligne 3896) : bandeau de fiabilité, 5 KPI, 5 onglets
 * (seul "Vue d'ensemble / cuves" a un contenu réel au Niveau 1 — les 4
 * autres nécessitent un référentiel pompes/personnel/documents/ATG détaillé
 * qui n'existe pas encore, ils restent visibles mais désactivés), grille de
 * cuves avec sélecteur de représentation, et 2 graphiques (rythme de vente
 * — hors périmètre, aucune vente individuelle au Niveau 1 ; reconstitution
 * du stock — laissé désactivé dans cette itération, nécessite un historique
 * agrégé par station non encore construit). Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
export default function StationDetailPage() {
  const params = useParams<{ stationId: string }>();
  const stationId = params.stationId;
  const t = useTranslations("zyloLiquid.stationDetail");
  const tAlerts = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useStationDetail(currentOrganization?.id ?? null, stationId);

  const [editOpen, setEditOpen] = useState(false);
  const [addTankOpen, setAddTankOpen] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<TankVisualMode>("vertical");
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");

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
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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
  const tankStates = activeTanks.map((tank) => data.tankStateById.get(tank.id)).filter((s): s is NonNullable<typeof s> => !!s);
  const offlineTanks = tankStates.filter((s) => s.sensorStatus === "offline" || s.sensorStatus === "not_configured");

  const totalVolume = tankStates.reduce((sum, s) => sum + (s.volumeLiters ?? 0), 0);
  const totalCapacity = activeTanks.reduce((sum, tk) => sum + (tk.calibratedCapacityLiters ?? tk.capacityLiters), 0);
  const pct = totalCapacity > 0 ? (totalVolume / totalCapacity) * 100 : 0;
  const currencies = new Set(tankStates.map((s) => s.currencyCode).filter((c): c is string => c !== null));
  const totalValue = currencies.size === 1 ? tankStates.reduce((sum, s) => sum + (s.monetaryValue ?? 0), 0) : null;
  const critical = data.alerts.some((a) => a.type === "leak" || a.type === "level_high");

  return (
    <>
      <Link href="/zylo-liquid/stations" className="btn sm no-print" style={{ width: "fit-content", marginBottom: 4 }}>
        <ChevronLeft width={14} height={14} strokeWidth={1.8} aria-hidden />
        {t("backLink")}
      </Link>

      <div className="page-head">
        <div className="ph-text">
          <h1>{station.name}</h1>
          <div className="ph-sub">
            {station.address ? `${station.address} · ` : ""}
            {station.code} · {station.is24h ? "24h/24" : `${station.openingTime} – ${station.closingTime}`}
          </div>
        </div>
        <div className="page-actions no-print">
          <a href="#deliveries-panel" className="btn sm">
            <Truck width={14} height={14} strokeWidth={1.8} aria-hidden />
            {t("actions.deliveries")}
          </a>
          <a href="#leaks-panel" className="btn sm">
            {t("actions.leaks")}
          </a>
          <button type="button" className="btn sm primary" onClick={() => setEditOpen(true)}>
            {t("actions.edit")}
          </button>
          <div style={{ position: "relative" }}>
            <button type="button" className="btn sm" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
              <MoreVertical width={14} height={14} strokeWidth={1.8} aria-hidden />
            </button>
            {menuOpen && (
              <div role="menu" className="card" style={{ position: "absolute", right: 0, top: "100%", zIndex: 10, marginTop: 4, width: 180, padding: 6 }}>
                <button type="button" role="menuitem" onClick={handleToggleStatus} className="sb-link" style={{ color: "var(--ink)" }}>
                  {station.status === "active" ? t("actions.deactivate") : t("actions.reactivate")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {statusActionError && (
        <div className="banner crit">
          <div>{statusActionError}</div>
        </div>
      )}

      {offlineTanks.length > 0 && (
        <div className="banner major">
          <div>{t("alertsBanner", { count: offlineTanks.length })}</div>
        </div>
      )}

      <div className="grid g5 kpi-scroll" style={{ marginBottom: 16 }}>
        <Kpi
          icon={Fuel}
          label={t("kpis.stock.label")}
          value={formatVolume(totalVolume)}
          tone="brand"
          sub={t("kpis.stock.sub", { pct: `${Math.round(pct)} %`, capacity: formatVolume(totalCapacity) })}
        />
        <Kpi icon={Gauge} label={t("kpis.coverage.label")} disabled />
        <Kpi
          icon={Bell}
          label={t("kpis.activeAlarms.label")}
          value={data.alerts.length}
          tone={data.alerts.length ? (critical ? "crit" : "major") : "ok"}
        />
        <Kpi icon={Fuel} label={t("kpis.pumps.label")} disabled />
        <Kpi icon={Banknote} label={t("kpis.value.label")} value={totalValue !== null && [...currencies][0] ? formatMoney(totalValue, [...currencies][0]) : "—"} tone="info" />
      </div>

      <div className="tabs">
        {TABS.map((value) => (
          <button key={value} type="button" className={tab === value ? "on" : ""} onClick={() => setTab(value)}>
            {t(`tabs.${value}`)}
          </button>
        ))}
      </div>

      {tab !== "overview" ? (
        <div className="empty">
          <div className="e-t">{tCommon("states.comingSoon")}</div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div style={{ flex: 1 }}>
                <h2>{t("tanksSection.title")}</h2>
                <div className="ch-sub">{t("tanksSection.activeCount", { count: activeTanks.length })}</div>
              </div>
              <ModeSwitcher mode={mode} onChange={setMode} />
              <button type="button" className="btn sm primary" onClick={() => setAddTankOpen(true)}>
                <Plus width={14} height={14} strokeWidth={1.8} aria-hidden />
                {t("tanksSection.addTank")}
              </button>
            </div>

            {activeTanks.length === 0 ? (
              <div className="empty">
                <div className="e-t">{t("tanksSection.empty")}</div>
              </div>
            ) : (
              <div className="grid g4">
                {activeTanks.map((tank) => {
                  const state = data.tankStateById.get(tank.id);
                  const product = data.fuelProductById.get(tank.fuelProductId);
                  const tone = state?.sensorStatus === "offline" ? "alert-crit" : "";
                  return (
                    <div key={tank.id} className={`tankcard ${tone}`}>
                      <div className="tank-top">
                        <div style={{ flex: 1 }}>
                          <div className="tt-name">{tank.displayName}</div>
                          <div className="tt-prod">{product?.name ?? "?"}</div>
                        </div>
                        <span className={`badge ${state?.sensorStatus === "online" ? "b-ok" : state?.sensorStatus === "offline" ? "b-crit" : "b-idle"}`}>
                          <span className="dot" />
                          {state?.sensorStatus === "online" ? t("tankCard.sensorConnected") : state?.sensorStatus === "offline" ? t("tankCard.sensorDisconnected") : t("tankCard.sensorNotConfigured")}
                        </span>
                      </div>
                      <div className="tank-body">
                        <div style={{ display: "flex", justifyContent: "center", flex: "0 0 auto" }}>
                          {state && state.volumeLiters !== null ? (
                            <TankVisual tank={tank} state={state} mode={mode} fuelColor={product?.displayColor} />
                          ) : (
                            <div className="empty" style={{ padding: 12 }}>
                              <div className="e-t small">{t("tankCard.notCalculable")}</div>
                            </div>
                          )}
                        </div>
                        <div className="tank-figs">
                          <div className="figrow">
                            <span className="lab">{t("tankCard.capacity")}</span>
                            <span className="val">{formatVolume(tank.calibratedCapacityLiters ?? tank.capacityLiters)}</span>
                          </div>
                          {state?.monetaryValue !== null && state?.currencyCode && (
                            <div className="figrow">
                              <span className="lab">{t("kpis.value.label")}</span>
                              <span className="val">{formatMoney(state.monetaryValue, state.currencyCode)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Link href={`/zylo-liquid/stations/${stationId}/tanks/${tank.id}`} className="small strong">
                        {t("tankCard.detail")}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <TankLegend />
            </div>
          </div>

          <div className="grid g2" style={{ marginBottom: 16 }}>
            <div className="card">
              <h2>{t("charts.sales.title")}</h2>
              <div className="ch-sub">{t("charts.sales.subtitle")}</div>
              <div className="empty" style={{ marginTop: 12 }}>
                <div className="e-t">{tCommon("states.comingSoon")}</div>
              </div>
            </div>
            <div className="card">
              <h2>{t("charts.restock.title")}</h2>
              <div className="ch-sub">{t("charts.restock.subtitle")}</div>
              <div className="empty" style={{ marginTop: 12 }}>
                <div className="e-t">{tCommon("states.comingSoon")}</div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid g3">
        <div className="card" id="alerts-panel">
          <h3>{t("panels.alertsTitle", { count: data.alerts.length })}</h3>
          {data.alerts.length === 0 ? (
            <p className="small dim">{t("panels.alertsEmpty")}</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {data.alerts.map((a) => (
                <div key={a.id} className="row" style={{ justifyContent: "space-between" }}>
                  <span className="small">{tAlerts(`types.${a.type}`)}</span>
                  <span className="xsmall dim">{formatTime(a.triggeredAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" id="deliveries-panel">
          <h3>{t("panels.deliveriesTitle", { count: data.deliveries.length })}</h3>
          {data.deliveries.length === 0 ? (
            <p className="small dim">{t("panels.deliveriesEmpty")}</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {data.deliveries.map((d) => (
                <div key={d.id} className="row" style={{ justifyContent: "space-between" }}>
                  <span className="small mono">+{formatVolume(d.volumeLiters ?? 0)}</span>
                  <span className="xsmall dim">{formatTime(d.endTime)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" id="leaks-panel">
          <h3>{t("panels.leaksTitle", { count: data.leakEvents.filter((l) => l.result === "anomaly").length })}</h3>
          {data.leakEvents.filter((l) => l.result === "anomaly").length === 0 ? (
            <p className="small dim">{t("panels.leaksEmpty")}</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {data.leakEvents
                .filter((l) => l.result === "anomaly")
                .map((l) => (
                  <div key={l.id} className="row" style={{ justifyContent: "space-between" }}>
                    <span className="small mono">{l.leakRateLph?.toFixed(2)} L/H</span>
                    <span className="xsmall dim">{formatTime(l.endTime)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
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
    </>
  );
}
