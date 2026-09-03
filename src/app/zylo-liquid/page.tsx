"use client";

import { AlertTriangle, Banknote, BarChart3, Bell, Building2, Gauge, Package, Printer, Scale, ShieldAlert, Truck, Wifi } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { PageSpinner } from "@/shared/ui/Spinner";

import { Kpi } from "./_components/Kpi";
import { TrendChart } from "./_components/TrendChart";
import { useNetworkDashboard } from "./_lib/useNetworkDashboard";

/** Reproduit fidèlement `dashProprietaire()` du prototype validé
 * (prototype.html, ~ligne 3352) : mêmes 3 sections de KPI dans le même
 * ordre (santé opérationnelle / intégrité du stock / valeur), même carte
 * réseau + grille de stations, même liste de décisions (alarmes). Chaque
 * KPI que le Niveau 1 ne peut pas calculer honnêtement (ventes, marge,
 * réconciliation, couverture de stock — toutes nécessitent un débit de
 * vente que la télémétrie seule ne fournit pas) reste à sa place exacte,
 * simplement marqué "À venir" (`disabled` sur <Kpi>) — jamais retiré,
 * jamais approximé avec une donnée inventée. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
export default function ZyloLiquidDashboardPage() {
  const t = useTranslations("zyloLiquid");
  const td = useTranslations("zyloLiquid.dashboard");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization, loading: organizationLoading } = useOrganization();

  const data = useNetworkDashboard(currentOrganization?.id ?? null, "now", null);

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
  function formatRelativeTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  function formatDateShort(iso: string): string {
    return format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });
  }

  if (organizationLoading || data.loading) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }

  const totalRate = data.totalCapacityLiters > 0 ? ((data.networkSummary?.totalVolumeLiters ?? 0) / data.totalCapacityLiters) * 100 : 0;

  // Section 1 — santé opérationnelle (entièrement calculable au Niveau 1)
  const stationsAttention = data.stationAggregates.filter((s) => s.station.status === "active" && (!s.online || data.activeAlerts.some((a) => a.stationId === s.station.id))).length;
  const atgAvailabilityPct = data.stationsActiveCount > 0 ? ((data.stationsActiveCount - data.stationsOfflineCount) / data.stationsActiveCount) * 100 : 0;

  // Bandeau de fiabilité — uniquement si dégradation, comme le prototype (bandeauFiabilite())
  const offlineStations = data.stationAggregates.filter((s) => s.station.status === "active" && !s.online);

  // Carte réseau — positions réelles (Station.latitude/longitude), jamais un schéma inventé
  const geoStations = data.stations.filter((s) => s.status === "active");
  const lats = geoStations.map((s) => s.latitude).filter((v): v is number => v !== null);
  const lngs = geoStations.map((s) => s.longitude).filter((v): v is number => v !== null);
  const hasGeo = lats.length > 0 && lngs.length > 0;
  const minLat = hasGeo ? Math.min(...lats) : 0;
  const maxLat = hasGeo ? Math.max(...lats) : 1;
  const minLng = hasGeo ? Math.min(...lngs) : 0;
  const maxLng = hasGeo ? Math.max(...lngs) : 1;
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;

  const decisions = [...data.activeAlerts].sort((a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime());

  return (
    <>
      <div className="page-head">
        <div className="ph-text">
          <h1>{td("pageTitle")}</h1>
          <div className="ph-sub">{td("pageSubtitle", { stations: data.stations.length, tanks: data.tanks.length, products: data.fuelProducts.length })}</div>
        </div>
        <div className="page-actions no-print">
          <button type="button" className="btn" disabled title={tCommon("states.comingSoon")}>
            <BarChart3 width={16} height={16} strokeWidth={1.8} aria-hidden />
            {td("actions.reports")}
          </button>
          <button type="button" className="btn" onClick={() => window.print()}>
            <Printer width={16} height={16} strokeWidth={1.8} aria-hidden />
            {td("actions.print")}
          </button>
        </div>
      </div>

      {offlineStations.length > 0 && (
        <div className="banner major">
          <Wifi width={18} height={18} strokeWidth={1.8} aria-hidden />
          <div>{td("reliabilityBanner.offline", { count: offlineStations.length, names: offlineStations.map((s) => s.station.name).join(", ") })}</div>
        </div>
      )}

      {data.error && (
        <div className="banner crit">
          <AlertTriangle width={18} height={18} strokeWidth={1.8} aria-hidden />
          <div>{data.error}</div>
        </div>
      )}

      {/* 1 — SANTÉ OPÉRATIONNELLE */}
      <h3 style={{ margin: "4px 0 10px" }}>{td("sections.health")}</h3>
      <div className="grid g4 kpi-scroll" style={{ marginBottom: 18 }}>
        <Kpi
          icon={Building2}
          label={td("kpis.stationsAttention.label")}
          value={<>{stationsAttention}<span className="u">{` / ${data.stationsActiveCount}`}</span></>}
          tone={stationsAttention ? "major" : "ok"}
          sub={stationsAttention ? td("kpis.stationsAttention.subAlert") : td("kpis.stationsAttention.subOk")}
        />
        <Kpi icon={Gauge} label={td("kpis.stockCoverage.label")} disabled />
        <Kpi
          icon={Bell}
          label={td("kpis.activeAlerts.label")}
          value={data.activeAlertsCount}
          tone={data.activeAlertsCount ? "crit" : "ok"}
          sub={td("kpis.activeAlerts.sub")}
        />
        <Kpi
          icon={Wifi}
          label={td("kpis.atgAvailability.label")}
          value={format.number(atgAvailabilityPct, { maximumFractionDigits: 0 })}
          unit="%"
          tone={atgAvailabilityPct < 100 ? "major" : "ok"}
          sub={td("kpis.atgAvailability.sub")}
        />
      </div>

      {/* 2 — INTÉGRITÉ (nécessite des ventes/index compteurs — hors Niveau 1) */}
      <h3 style={{ margin: "4px 0 10px" }}>{td("sections.integrity")}</h3>
      <div className="grid g4 kpi-scroll" style={{ marginBottom: 18 }}>
        <Kpi icon={Scale} label={td("kpis.lossRate.label")} disabled />
        <Kpi icon={Banknote} label={td("kpis.lossValue.label")} disabled />
        <Kpi icon={BarChart3} label={td("kpis.lossProjection.label")} disabled />
        <Kpi icon={Truck} label={td("kpis.deliveryCompliance.label")} disabled />
      </div>

      {/* 3 — VALEUR */}
      <h3 style={{ margin: "4px 0 10px" }}>{td("sections.value")}</h3>
      <div className="grid g5 kpi-scroll" style={{ marginBottom: 18 }}>
        <Kpi
          icon={Banknote}
          label={td("kpis.stockValue.label")}
          value={data.totalMonetaryValue !== null && data.totalMonetaryCurrencyCode ? formatMoney(data.totalMonetaryValue, data.totalMonetaryCurrencyCode) : "—"}
          tone="brand"
          sub={td("kpis.stockValue.sub", { volume: formatVolume(data.networkSummary?.totalVolumeLiters ?? 0), pct: `${Math.round(totalRate)} %` })}
        />
        <Kpi icon={Package} label={td("kpis.sellableValue.label")} disabled />
        <Kpi icon={BarChart3} label={td("kpis.fuelRevenue.label")} disabled />
        <Kpi icon={Scale} label={td("kpis.grossMargin.label")} disabled />
        <Kpi icon={Package} label={td("kpis.nonFuelRevenue.label")} disabled />
      </div>

      {/* 4 — GÉOGRAPHIE ET ÉTAT PAR STATION */}
      <div className="grid g23" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <div style={{ flex: 1 }}>
              <h2>{td("mapCard.title")}</h2>
              <div className="ch-sub">{td("mapCard.subtitle")}</div>
            </div>
          </div>
          {!hasGeo ? (
            <div className="empty">
              <div className="e-t">{td("mapCard.noGeo")}</div>
            </div>
          ) : (
            <svg viewBox="0 0 340 320" width="100%" height={320} role="img" aria-label={td("mapCard.title")}>
              {geoStations.map((station) => {
                if (station.latitude === null || station.longitude === null) return null;
                const x = 20 + ((station.longitude - minLng) / spanLng) * 300;
                const y = 300 - ((station.latitude - minLat) / spanLat) * 280;
                const agg = data.stationAggregates.find((a) => a.station.id === station.id);
                const hasAlert = data.activeAlerts.some((al) => al.stationId === station.id);
                const color = !agg?.online ? "var(--info)" : hasAlert ? "var(--major)" : "var(--ok)";
                return (
                  <g key={station.id} style={{ cursor: "pointer" }}>
                    <Link href={`/zylo-liquid/stations/${station.id}`}>
                      <circle cx={x} cy={y} r={7} fill={color} stroke="#fff" strokeWidth={2} />
                      <text x={x + 11} y={y + 4} fontSize={10.5} fill="var(--ink)" fontWeight={600}>
                        {station.code}
                      </text>
                    </Link>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div className="stack">
          <div className="grid g3">
            {data.stationAggregates.map(({ station, online, volumeLiters, capacityLiters, monetaryValue, currencyCode }) => {
              const hasAlert = data.activeAlerts.some((a) => a.stationId === station.id);
              const tone = !online ? "info" : hasAlert ? "major" : "ok";
              const label = !online ? td("stationCard.dataUnavailable") : hasAlert ? td("stationCard.attentionRequired") : td("stationCard.nominal");
              const pct = capacityLiters > 0 ? (volumeLiters / capacityLiters) * 100 : null;
              return (
                <Link
                  key={station.id}
                  href={`/zylo-liquid/stations/${station.id}`}
                  className="card"
                  style={{ display: "block", borderLeft: `4px solid var(--${tone})` }}
                >
                  <div className="card-head" style={{ marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: 14.5 }}>{station.name}</h2>
                      <div className="ch-sub">{station.code}</div>
                    </div>
                    <span className={`badge b-${tone}`}>
                      <span className="dot" />
                      {label}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.min(100, pct ?? 0)}%`, background: "var(--brand-deep)" }} />
                    </div>
                    <div className="row small muted" style={{ justifyContent: "space-between", marginTop: 4 }}>
                      <span className="mono">
                        {formatVolume(volumeLiters)} / {formatVolume(capacityLiters)}
                      </span>
                      <span className="mono">{pct === null ? "—" : `${Math.round(pct)} %`}</span>
                    </div>
                  </div>
                  <div className="row small" style={{ gap: 14 }}>
                    <span>
                      <Banknote width={14} height={14} strokeWidth={1.8} style={{ display: "inline", verticalAlign: -2 }} aria-hidden />{" "}
                      <b className="mono">{monetaryValue !== null && currencyCode ? formatMoney(monetaryValue, currencyCode) : "—"}</b>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5 — TENDANCE DE STOCK (calculable via network/snapshot, réel) */}
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <div style={{ flex: 1 }}>
              <h2>{t("chart.title")}</h2>
              <div className="ch-sub">{t("chart.unit")}</div>
            </div>
          </div>
          {data.chartLoading ? (
            <PageSpinner label={tCommon("states.loading")} />
          ) : data.chartPoints.length < 2 ? (
            <p className="small dim">{t("chart.insufficientData")}</p>
          ) : (
            <TrendChart
              points={data.chartPoints.map((p) => ({ at: p.at, value: p.totalVolumeLiters }))}
              formatValue={formatVolume}
              formatDate={formatDateShort}
              seriesLabel={t("chart.seriesLabel")}
            />
          )}
        </div>
        <div className="card">
          <div className="card-head">
            <div style={{ flex: 1 }}>
              <h2>{td("deliveriesCard.title")}</h2>
            </div>
          </div>
          {data.recentActivity.filter((e) => e.kind === "delivery").length === 0 ? (
            <div className="empty">
              <div className="e-t">{td("deliveriesCard.empty")}</div>
            </div>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {data.recentActivity
                .filter((e) => e.kind === "delivery")
                .slice(0, 6)
                .map((event, i) => (
                  <div key={i} className="row" style={{ justifyContent: "space-between" }}>
                    <span className="row small">
                      <Truck width={14} height={14} strokeWidth={1.8} aria-hidden /> {event.stationName}
                    </span>
                    <span className="mono small">{event.kind === "delivery" ? formatVolume(event.delivery.volumeLiters ?? 0) : ""}</span>
                    <span className="mono xsmall dim">{formatRelativeTime(event.at)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* 6 — DÉCISIONS (alarmes actives réelles) */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div style={{ flex: 1 }}>
            <h2>{td("decisionsCard.title")}</h2>
            <div className="ch-sub">{td("decisionsCard.subtitle", { count: decisions.length })}</div>
          </div>
        </div>
        {decisions.length === 0 ? (
          <div className="empty">
            <div className="e-t">{t("alerts.empty")}</div>
          </div>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {decisions.map((alert) => {
              const station = data.stations.find((s) => s.id === alert.stationId);
              const critical = alert.type === "leak" || alert.type === "level_high";
              return (
                <div key={alert.id} className={`alarm ${critical ? "sev-CRITIQUE" : "sev-MAJEUR"}`}>
                  <div className="a-ic">
                    <ShieldAlert width={18} height={18} strokeWidth={1.8} color={critical ? "var(--crit)" : "var(--major)"} aria-hidden />
                  </div>
                  <div className="a-main">
                    <div className="a-title">
                      {t(`alerts.types.${alert.type}`)}
                      <span className={`badge ${critical ? "b-crit" : "b-major"}`}>
                        <span className="dot" />
                        {alert.status === "active" ? t("alerts.page.status.active") : t("alerts.page.status.resolved")}
                      </span>
                    </div>
                    <div className="a-meta">
                      {station?.name} — {formatRelativeTime(alert.triggeredAt)}
                    </div>
                  </div>
                  <div className="a-side">
                    <Link className="btn sm" href={`/zylo-liquid/stations/${alert.stationId}/tanks/${alert.tankId}`}>
                      {td("decisionsCard.viewTank")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7 — ENCAISSEMENTS (hors Niveau 1 : aucune donnée de caisse) */}
      <div className="card">
        <div className="card-head">
          <div style={{ flex: 1 }}>
            <h2>{td("cashCard.title")}</h2>
          </div>
        </div>
        <div className="empty">
          <div className="e-t">{tCommon("states.comingSoon")}</div>
        </div>
      </div>
    </>
  );
}
