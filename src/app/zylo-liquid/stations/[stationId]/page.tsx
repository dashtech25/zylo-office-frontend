"use client";

import { AlertTriangle, Droplet, MoreVertical, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { deactivateStation, reactivateStation, type Tank } from "@/core/api/zyloLiquid";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { EmptyState } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { AddTankModal } from "./_components/AddTankModal";
import { CalibrationModal } from "./_components/CalibrationModal";
import { TankCard } from "./_components/TankCard";
import { CreateStationModal } from "../_components/CreateStationModal";
import { useStationDetail } from "./_lib/useStationDetail";

/** Reconstruit la page détail d'une station selon la spécification détaillée
 * fournie par le commanditaire (ZoneA-D), remplaçant la version précédente
 * calquée sur le prototype pour cette page précise.
 *
 * Deux écarts assumés avec la spécification, documentés plutôt que
 * masqués : le champ "Gérant" (ligne d'info secondaire, modal Modifier)
 * n'existe sur aucune colonne de `Station` — omis, jamais inventé. La
 * colonne Livraisons ne montre pas de "Livreur" : aucune entité fournisseur
 * n'existe au Niveau 1 (déjà noté sur la page Livraisons/PR #24). */
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
  const [calibrationTank, setCalibrationTank] = useState<Tank | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function formatVolume(liters: number): string {
    return `${format.number(Math.round(liters))} L`;
  }
  function formatTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function minutesAgo(iso: string): number {
    // Math.max(0, ...) : une mesure horodatée dans le futur par rapport à
    // l'horloge du navigateur (dérive d'horloge du simulateur de démo,
    // donnée réelle mais non fiable pour un calcul de fraîcheur) ne doit
    // jamais s'afficher comme un nombre de minutes négatif — traitée comme
    // "à l'instant" plutôt que dans un sens ou l'autre.
    return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const city = station.cityId ? data.cities.find((c) => c.id === station.cityId) : null;

  const tankStates = activeTanks.map((tank) => data.tankStateById.get(tank.id)).filter((s): s is NonNullable<typeof s> => !!s);
  const stationOnline = tankStates.some((s) => s.sensorStatus === "online");
  const criticalAlert = data.alerts.some((a) => a.type === "leak" || a.type === "level_high");
  const stationState: "offline" | "critical" | "alert" | "online" = !stationOnline ? "offline" : criticalAlert ? "critical" : data.alerts.length > 0 ? "alert" : "online";

  const lastStationSync = tankStates.reduce<string | null>((latest, s) => {
    if (!s.lastMeasurementAt) return latest;
    return !latest || s.lastMeasurementAt > latest ? s.lastMeasurementAt : latest;
  }, null);

  const activeLeakAlerts = data.alerts.filter((a) => a.type === "leak");
  const anomalyLeaksByTank = new Map<string, (typeof data.leakEvents)[number]>();
  for (const leak of data.leakEvents.filter((l) => l.result === "anomaly")) {
    const existing = anomalyLeaksByTank.get(leak.tankId);
    if (!existing || leak.endTime > existing.endTime) anomalyLeaksByTank.set(leak.tankId, leak);
  }

  return (
    <>
      <div className="crumbs" style={{ marginBottom: 4 }}>
        <Link href="/zylo-liquid/stations">{t("backLink")}</Link>
        <span className="sep">›</span>
        <span className="strong" style={{ color: "var(--ink)" }}>
          {station.name}
        </span>
      </div>

      <div className="page-head">
        <div className="ph-text">
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <h1>{station.name}</h1>
            <span className={`badge ${stationState === "critical" ? "b-crit" : stationState === "alert" ? "b-major" : stationState === "offline" ? "b-idle" : "b-ok"}`}>
              <span className="dot" />
              {t(`status.${stationState}`)}
            </span>
          </div>
          <div className="ph-sub">
            {city ? city.name : "—"}
            {" · "}
            {lastStationSync ? t("sync", { minutes: minutesAgo(lastStationSync) }) : t("syncNever")}
          </div>
        </div>
        <div className="page-actions no-print">
          <button type="button" className="btn sm" onClick={() => scrollTo("deliveries-column")}>
            <Truck width={14} height={14} strokeWidth={1.8} aria-hidden />
            {t("actions.deliveries")}
          </button>
          <button type="button" className="btn sm" onClick={() => scrollTo("leaks-column")}>
            <Droplet width={14} height={14} strokeWidth={1.8} aria-hidden />
            {t("actions.leaks")}
          </button>
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

      {data.alerts.length > 0 && (
        <div className={`banner ${criticalAlert ? "crit" : "major"}`}>
          <div>
            <b>{t("alertsBanner.count", { count: data.alerts.length })}</b>
            {" — "}
            {data.alerts
              .slice(0, 4)
              .map((a) => {
                const tank = data.tanks.find((tk) => tk.id === a.tankId);
                return `${tAlerts(`types.${a.type}`)} · ${tank?.displayName ?? "?"}`;
              })
              .join(" | ")}
            {"  "}
            <a href="#alerts-column" onClick={(e) => { e.preventDefault(); scrollTo("alerts-column"); }} style={{ marginLeft: 6 }}>
              {t("alertsBanner.viewAll")}
            </a>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div style={{ flex: 1 }}>
            <h2>{t("tanksSection.title")}</h2>
            <div className="ch-sub">{t("tanksSection.activeCount", { count: activeTanks.length })}</div>
          </div>
          <button type="button" className="btn sm" onClick={() => setAddTankOpen(true)}>
            {t("tanksSection.addTank")}
          </button>
        </div>

        {activeTanks.length === 0 ? (
          <div className="empty">
            <div className="e-t">{t("tanksSection.empty")}</div>
          </div>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {activeTanks.map((tank) => (
              <TankCard
                key={tank.id}
                tank={tank}
                state={data.tankStateById.get(tank.id) ?? null}
                fuelProduct={data.fuelProductById.get(tank.fuelProductId) ?? null}
                calibrationPoints={data.calibrationByTank[tank.id] ?? []}
                stationAlerts={data.alerts}
                stationId={stationId}
                onOpenCalibration={() => setCalibrationTank(tank)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid g3">
        <div className="card" id="alerts-column">
          <div className="card-head">
            <h2 style={{ flex: 1 }}>{t("columns.alerts.title", { count: data.alerts.length })}</h2>
            <Link href={`/zylo-liquid/alerts?station=${stationId}`}>{t("columns.viewAll")}</Link>
          </div>
          {data.alerts.length === 0 ? (
            <p className="small dim">{t("columns.alerts.empty")}</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {data.alerts.map((a) => {
                const tank = data.tanks.find((tk) => tk.id === a.tankId);
                const critical = a.type === "leak" || a.type === "level_high";
                return (
                  <div key={a.id} className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                    <AlertTriangle width={14} height={14} strokeWidth={1.8} color={critical ? "var(--crit)" : "var(--major)"} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden />
                    <div style={{ flex: 1 }}>
                      <div className="small strong">{tAlerts(`types.${a.type}`)}</div>
                      <div className="xsmall dim">{tank?.displayName ?? "?"}</div>
                    </div>
                    <span className="xsmall dim">{minutesAgo(a.triggeredAt)} min</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card" id="deliveries-column">
          <div className="card-head">
            <h2 style={{ flex: 1 }}>{t("columns.deliveries.title", { count: data.deliveries.length })}</h2>
            <Link href={`/zylo-liquid/livraisons?station=${stationId}`}>{t("columns.viewAll")}</Link>
          </div>
          {data.deliveries.length === 0 ? (
            <p className="small dim">{t("columns.deliveries.empty")}</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {data.deliveries.map((d) => {
                const tank = data.tanks.find((tk) => tk.id === d.tankId);
                const product = tank ? data.fuelProductById.get(tank.fuelProductId) : null;
                return (
                  <div key={d.id} className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                    <Truck width={14} height={14} strokeWidth={1.8} color="var(--ok)" style={{ marginTop: 2, flexShrink: 0 }} aria-hidden />
                    <div style={{ flex: 1 }}>
                      <div className="small strong">
                        {(product?.name ?? "?").toUpperCase()} · {tank?.displayName ?? "?"}
                      </div>
                      <div className="xsmall dim mono">+{formatVolume(d.volumeLiters ?? 0)}</div>
                    </div>
                    <span className="xsmall dim">{formatTime(d.endTime)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card" id="leaks-column">
          <div className="card-head">
            <h2 style={{ flex: 1, color: activeLeakAlerts.length > 0 ? "var(--crit)" : undefined }}>{t("columns.leaks.title", { count: activeLeakAlerts.length })}</h2>
            <Link href={`/zylo-liquid/fuites?station=${stationId}`}>{t("columns.viewAll")}</Link>
          </div>
          {activeLeakAlerts.length === 0 ? (
            <p className="small dim">{t("columns.leaks.empty")}</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {activeLeakAlerts.map((a) => {
                const tank = data.tanks.find((tk) => tk.id === a.tankId);
                const product = tank ? data.fuelProductById.get(tank.fuelProductId) : null;
                const rate = anomalyLeaksByTank.get(a.tankId)?.leakRateLph;
                return (
                  <div key={a.id} className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                    <Droplet width={14} height={14} strokeWidth={1.8} color="var(--crit)" style={{ marginTop: 2, flexShrink: 0 }} aria-hidden />
                    <div style={{ flex: 1 }}>
                      <div className="small strong">
                        {tank?.displayName ?? "?"} {product?.name ?? ""}
                      </div>
                      {rate != null && (
                        <div className="xsmall" style={{ color: "var(--crit)" }}>
                          {t("columns.leaks.rate", { rate: format.number(rate, { maximumFractionDigits: 1 }) })}
                        </div>
                      )}
                      <div className="xsmall dim">{formatTime(a.triggeredAt)}</div>
                    </div>
                    <span className="badge b-crit">
                      <span className="dot" />
                      {t("columns.leaks.status")}
                    </span>
                  </div>
                );
              })}
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
            existingTankNumbers={data.tanks.map((tk) => tk.tankNumber)}
            open={addTankOpen}
            onOpenChange={setAddTankOpen}
            onCreated={data.reload}
          />
          {calibrationTank && (
            <CalibrationModal
              organizationId={currentOrganization.id}
              tank={calibrationTank}
              open={!!calibrationTank}
              onOpenChange={(open) => !open && setCalibrationTank(null)}
              onUpdated={data.reload}
            />
          )}
        </>
      )}
    </>
  );
}
