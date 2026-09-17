/* =====================================================================
 * ANCIEN DASHBOARD (reproduction du prototype.html) — DÉSACTIVÉ.
 * Conservé commenté ci-dessous à la demande du propriétaire du produit :
 * remplacé par le dashboard de l'ancien projet zylo-office-frontend/ancien
 * (sections stock par produit + sélecteur de période + tableau de
 * stations), copié tel quel plus bas dans ce même fichier.
 * ===================================================================== */

// "use client";
//
// import { AlertTriangle, Banknote, BarChart3, Bell, Building2, Gauge, Package, Printer, Scale, ShieldAlert, Truck, Wifi } from "lucide-react";
// import Link from "next/link";
// import { useFormatter, useTranslations } from "next-intl";
//
// import { useOrganization } from "@/core/organization/OrganizationContext";
// import { PageSpinner } from "@/shared/ui/Spinner";
//
// import { Kpi } from "./_components/Kpi";
// import { TrendChart } from "@/modules/zylo-liquid/components/TrendChart";
// import { useNetworkDashboard } from "@/modules/zylo-liquid/hooks/useNetworkDashboard";
//
// /** Reproduit fidèlement `dashProprietaire()` du prototype validé
//  * (prototype.html, ~ligne 3352) : mêmes 3 sections de KPI dans le même
//  * ordre (santé opérationnelle / intégrité du stock / valeur), même carte
//  * réseau + grille de stations, même liste de décisions (alarmes). Chaque
//  * KPI que le Niveau 1 ne peut pas calculer honnêtement (ventes, marge,
//  * réconciliation, couverture de stock — toutes nécessitent un débit de
//  * vente que la télémétrie seule ne fournit pas) reste à sa place exacte,
//  * simplement marqué "À venir" (`disabled` sur <Kpi>) — jamais retiré,
//  * jamais approximé avec une donnée inventée. Voir
//  * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
// export default function ZyloLiquidDashboardPage() {
//   const t = useTranslations("zyloLiquid");
//   const td = useTranslations("zyloLiquid.dashboard");
//   const tCommon = useTranslations("common");
//   const format = useFormatter();
//   const { currentOrganization, loading: organizationLoading } = useOrganization();
//
//   const data = useNetworkDashboard(currentOrganization?.id ?? null, "now", null);
//
//   function formatVolume(liters: number): string {
//     return `${format.number(Math.round(liters))} L`;
//   }
//   function formatMoney(value: number, currencyCode: string): string {
//     try {
//       return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
//     } catch {
//       return `${format.number(Math.round(value))} ${currencyCode}`;
//     }
//   }
//   function formatRelativeTime(iso: string): string {
//     return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
//   }
//   function formatDateShort(iso: string): string {
//     return format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });
//   }
//
//   if (organizationLoading || data.loading) {
//     return <PageSpinner label={tCommon("states.loading")} />;
//   }
//
//   const totalRate = data.totalCapacityLiters > 0 ? ((data.networkSummary?.totalVolumeLiters ?? 0) / data.totalCapacityLiters) * 100 : 0;
//
//   // Section 1 — santé opérationnelle (entièrement calculable au Niveau 1)
//   const stationsAttention = data.stationAggregates.filter((s) => s.station.status === "active" && (!s.online || data.activeAlerts.some((a) => a.stationId === s.station.id))).length;
//   const atgAvailabilityPct = data.stationsActiveCount > 0 ? ((data.stationsActiveCount - data.stationsOfflineCount) / data.stationsActiveCount) * 100 : 0;
//
//   // Bandeau de fiabilité — uniquement si dégradation, comme le prototype (bandeauFiabilite())
//   const offlineStations = data.stationAggregates.filter((s) => s.station.status === "active" && !s.online);
//
//   // Carte réseau — positions réelles (Station.latitude/longitude), jamais un schéma inventé
//   const geoStations = data.stations.filter((s) => s.status === "active");
//   const lats = geoStations.map((s) => s.latitude).filter((v): v is number => v !== null);
//   const lngs = geoStations.map((s) => s.longitude).filter((v): v is number => v !== null);
//   const hasGeo = lats.length > 0 && lngs.length > 0;
//   const minLat = hasGeo ? Math.min(...lats) : 0;
//   const maxLat = hasGeo ? Math.max(...lats) : 1;
//   const minLng = hasGeo ? Math.min(...lngs) : 0;
//   const maxLng = hasGeo ? Math.max(...lngs) : 1;
//   const spanLat = maxLat - minLat || 1;
//   const spanLng = maxLng - minLng || 1;
//
//   const decisions = [...data.activeAlerts].sort((a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime());
//
//   return (
//     <>
//       <div className="page-head">
//         <div className="ph-text">
//           <h1>{td("pageTitle")}</h1>
//           <div className="ph-sub">{td("pageSubtitle", { stations: data.stations.length, tanks: data.tanks.length, products: data.fuelProducts.length })}</div>
//         </div>
//         <div className="page-actions no-print">
//           <button type="button" className="btn" disabled title={tCommon("states.comingSoon")}>
//             <BarChart3 width={16} height={16} strokeWidth={1.8} aria-hidden />
//             {td("actions.reports")}
//           </button>
//           <button type="button" className="btn" onClick={() => window.print()}>
//             <Printer width={16} height={16} strokeWidth={1.8} aria-hidden />
//             {td("actions.print")}
//           </button>
//         </div>
//       </div>
//
//       {offlineStations.length > 0 && (
//         <div className="banner major">
//           <Wifi width={18} height={18} strokeWidth={1.8} aria-hidden />
//           <div>{td("reliabilityBanner.offline", { count: offlineStations.length, names: offlineStations.map((s) => s.station.name).join(", ") })}</div>
//         </div>
//       )}
//
//       {data.error && (
//         <div className="banner crit">
//           <AlertTriangle width={18} height={18} strokeWidth={1.8} aria-hidden />
//           <div>{data.error}</div>
//         </div>
//       )}
//
//       {/* 1 — SANTÉ OPÉRATIONNELLE */}
//       <h3 style={{ margin: "4px 0 10px" }}>{td("sections.health")}</h3>
//       <div className="grid g4 kpi-scroll" style={{ marginBottom: 18 }}>
//         <Kpi
//           icon={Building2}
//           label={td("kpis.stationsAttention.label")}
//           value={<>{stationsAttention}<span className="u">{` / ${data.stationsActiveCount}`}</span></>}
//           tone={stationsAttention ? "major" : "ok"}
//           sub={stationsAttention ? td("kpis.stationsAttention.subAlert") : td("kpis.stationsAttention.subOk")}
//         />
//         <Kpi icon={Gauge} label={td("kpis.stockCoverage.label")} disabled />
//         <Kpi
//           icon={Bell}
//           label={td("kpis.activeAlerts.label")}
//           value={data.activeAlertsCount}
//           tone={data.activeAlertsCount ? "crit" : "ok"}
//           sub={td("kpis.activeAlerts.sub")}
//         />
//         <Kpi
//           icon={Wifi}
//           label={td("kpis.atgAvailability.label")}
//           value={format.number(atgAvailabilityPct, { maximumFractionDigits: 0 })}
//           unit="%"
//           tone={atgAvailabilityPct < 100 ? "major" : "ok"}
//           sub={td("kpis.atgAvailability.sub")}
//         />
//       </div>
//
//       {/* 2 — INTÉGRITÉ (nécessite des ventes/index compteurs — hors Niveau 1) */}
//       <h3 style={{ margin: "4px 0 10px" }}>{td("sections.integrity")}</h3>
//       <div className="grid g4 kpi-scroll" style={{ marginBottom: 18 }}>
//         <Kpi icon={Scale} label={td("kpis.lossRate.label")} disabled />
//         <Kpi icon={Banknote} label={td("kpis.lossValue.label")} disabled />
//         <Kpi icon={BarChart3} label={td("kpis.lossProjection.label")} disabled />
//         <Kpi icon={Truck} label={td("kpis.deliveryCompliance.label")} disabled />
//       </div>
//
//       {/* 3 — VALEUR */}
//       <h3 style={{ margin: "4px 0 10px" }}>{td("sections.value")}</h3>
//       <div className="grid g5 kpi-scroll" style={{ marginBottom: 18 }}>
//         <Kpi
//           icon={Banknote}
//           label={td("kpis.stockValue.label")}
//           value={data.totalMonetaryValue !== null && data.totalMonetaryCurrencyCode ? formatMoney(data.totalMonetaryValue, data.totalMonetaryCurrencyCode) : "—"}
//           tone="brand"
//           sub={td("kpis.stockValue.sub", { volume: formatVolume(data.networkSummary?.totalVolumeLiters ?? 0), pct: `${Math.round(totalRate)} %` })}
//         />
//         <Kpi icon={Package} label={td("kpis.sellableValue.label")} disabled />
//         <Kpi icon={BarChart3} label={td("kpis.fuelRevenue.label")} disabled />
//         <Kpi icon={Scale} label={td("kpis.grossMargin.label")} disabled />
//         <Kpi icon={Package} label={td("kpis.nonFuelRevenue.label")} disabled />
//       </div>
//
//       {/* 4 — GÉOGRAPHIE ET ÉTAT PAR STATION */}
//       <div className="grid g23" style={{ marginBottom: 16 }}>
//         <div className="card">
//           <div className="card-head">
//             <div style={{ flex: 1 }}>
//               <h2>{td("mapCard.title")}</h2>
//               <div className="ch-sub">{td("mapCard.subtitle")}</div>
//             </div>
//           </div>
//           {!hasGeo ? (
//             <div className="empty">
//               <div className="e-t">{td("mapCard.noGeo")}</div>
//             </div>
//           ) : (
//             <svg viewBox="0 0 340 320" width="100%" height={320} role="img" aria-label={td("mapCard.title")}>
//               {geoStations.map((station) => {
//                 if (station.latitude === null || station.longitude === null) return null;
//                 const x = 20 + ((station.longitude - minLng) / spanLng) * 300;
//                 const y = 300 - ((station.latitude - minLat) / spanLat) * 280;
//                 const agg = data.stationAggregates.find((a) => a.station.id === station.id);
//                 const hasAlert = data.activeAlerts.some((al) => al.stationId === station.id);
//                 const color = !agg?.online ? "var(--info)" : hasAlert ? "var(--major)" : "var(--ok)";
//                 return (
//                   <g key={station.id} style={{ cursor: "pointer" }}>
//                     <Link href={`/zylo-liquid/stations/${station.id}`}>
//                       <circle cx={x} cy={y} r={7} fill={color} stroke="#fff" strokeWidth={2} />
//                       <text x={x + 11} y={y + 4} fontSize={10.5} fill="var(--ink)" fontWeight={600}>
//                         {station.code}
//                       </text>
//                     </Link>
//                   </g>
//                 );
//               })}
//             </svg>
//           )}
//         </div>
//
//         <div className="stack">
//           <div className="grid g3">
//             {data.stationAggregates.map(({ station, online, volumeLiters, capacityLiters, monetaryValue, currencyCode }) => {
//               const hasAlert = data.activeAlerts.some((a) => a.stationId === station.id);
//               const tone = !online ? "info" : hasAlert ? "major" : "ok";
//               const label = !online ? td("stationCard.dataUnavailable") : hasAlert ? td("stationCard.attentionRequired") : td("stationCard.nominal");
//               const pct = capacityLiters > 0 ? (volumeLiters / capacityLiters) * 100 : null;
//               return (
//                 <Link
//                   key={station.id}
//                   href={`/zylo-liquid/stations/${station.id}`}
//                   className="card"
//                   style={{ display: "block", borderLeft: `4px solid var(--${tone})` }}
//                 >
//                   <div className="card-head" style={{ marginBottom: 8 }}>
//                     <div style={{ flex: 1 }}>
//                       <h2 style={{ fontSize: 14.5 }}>{station.name}</h2>
//                       <div className="ch-sub">{station.code}</div>
//                     </div>
//                     <span className={`badge b-${tone}`}>
//                       <span className="dot" />
//                       {label}
//                     </span>
//                   </div>
//                   <div style={{ marginBottom: 8 }}>
//                     <div className="bar-track">
//                       <div className="bar-fill" style={{ width: `${Math.min(100, pct ?? 0)}%`, background: "var(--brand-deep)" }} />
//                     </div>
//                     <div className="row small muted" style={{ justifyContent: "space-between", marginTop: 4 }}>
//                       <span className="mono">
//                         {formatVolume(volumeLiters)} / {formatVolume(capacityLiters)}
//                       </span>
//                       <span className="mono">{pct === null ? "—" : `${Math.round(pct)} %`}</span>
//                     </div>
//                   </div>
//                   <div className="row small" style={{ gap: 14 }}>
//                     <span>
//                       <Banknote width={14} height={14} strokeWidth={1.8} style={{ display: "inline", verticalAlign: -2 }} aria-hidden />{" "}
//                       <b className="mono">{monetaryValue !== null && currencyCode ? formatMoney(monetaryValue, currencyCode) : "—"}</b>
//                     </span>
//                   </div>
//                 </Link>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//
//       {/* 5 — TENDANCE DE STOCK (calculable via network/snapshot, réel) */}
//       <div className="grid g2" style={{ marginBottom: 16 }}>
//         <div className="card">
//           <div className="card-head">
//             <div style={{ flex: 1 }}>
//               <h2>{t("chart.title")}</h2>
//               <div className="ch-sub">{t("chart.unit")}</div>
//             </div>
//           </div>
//           {data.chartLoading ? (
//             <PageSpinner label={tCommon("states.loading")} />
//           ) : data.chartPoints.length < 2 ? (
//             <p className="small dim">{t("chart.insufficientData")}</p>
//           ) : (
//             <TrendChart
//               points={data.chartPoints.map((p) => ({ at: p.at, value: p.totalVolumeLiters }))}
//               formatValue={formatVolume}
//               formatDate={formatDateShort}
//               seriesLabel={t("chart.seriesLabel")}
//             />
//           )}
//         </div>
//         <div className="card">
//           <div className="card-head">
//             <div style={{ flex: 1 }}>
//               <h2>{td("deliveriesCard.title")}</h2>
//             </div>
//           </div>
//           {data.recentActivity.filter((e) => e.kind === "delivery").length === 0 ? (
//             <div className="empty">
//               <div className="e-t">{td("deliveriesCard.empty")}</div>
//             </div>
//           ) : (
//             <div className="stack" style={{ gap: 10 }}>
//               {data.recentActivity
//                 .filter((e) => e.kind === "delivery")
//                 .slice(0, 6)
//                 .map((event, i) => (
//                   <div key={i} className="row" style={{ justifyContent: "space-between" }}>
//                     <span className="row small">
//                       <Truck width={14} height={14} strokeWidth={1.8} aria-hidden /> {event.stationName}
//                     </span>
//                     <span className="mono small">{event.kind === "delivery" ? formatVolume(event.delivery.volumeLiters ?? 0) : ""}</span>
//                     <span className="mono xsmall dim">{formatRelativeTime(event.at)}</span>
//                   </div>
//                 ))}
//             </div>
//           )}
//         </div>
//       </div>
//
//       {/* 6 — DÉCISIONS (alarmes actives réelles) */}
//       <div className="card" style={{ marginBottom: 16 }}>
//         <div className="card-head">
//           <div style={{ flex: 1 }}>
//             <h2>{td("decisionsCard.title")}</h2>
//             <div className="ch-sub">{td("decisionsCard.subtitle", { count: decisions.length })}</div>
//           </div>
//         </div>
//         {decisions.length === 0 ? (
//           <div className="empty">
//             <div className="e-t">{t("alerts.empty")}</div>
//           </div>
//         ) : (
//           <div className="stack" style={{ gap: 10 }}>
//             {decisions.map((alert) => {
//               const station = data.stations.find((s) => s.id === alert.stationId);
//               const critical = alert.type === "leak" || alert.type === "level_high";
//               return (
//                 <div key={alert.id} className={`alarm ${critical ? "sev-CRITIQUE" : "sev-MAJEUR"}`}>
//                   <div className="a-ic">
//                     <ShieldAlert width={18} height={18} strokeWidth={1.8} color={critical ? "var(--crit)" : "var(--major)"} aria-hidden />
//                   </div>
//                   <div className="a-main">
//                     <div className="a-title">
//                       {t(`alerts.types.${alert.type}`)}
//                       <span className={`badge ${critical ? "b-crit" : "b-major"}`}>
//                         <span className="dot" />
//                         {alert.status === "active" ? t("alerts.page.status.active") : t("alerts.page.status.resolved")}
//                       </span>
//                     </div>
//                     <div className="a-meta">
//                       {station?.name} — {formatRelativeTime(alert.triggeredAt)}
//                     </div>
//                   </div>
//                   <div className="a-side">
//                     <Link className="btn sm" href={`/zylo-liquid/stations/${alert.stationId}/tanks/${alert.tankId}`}>
//                       {td("decisionsCard.viewTank")}
//                     </Link>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//
//       {/* 7 — ENCAISSEMENTS (hors Niveau 1 : aucune donnée de caisse) */}
//       <div className="card">
//         <div className="card-head">
//           <div style={{ flex: 1 }}>
//             <h2>{td("cashCard.title")}</h2>
//           </div>
//         </div>
//         <div className="empty">
//           <div className="e-t">{tCommon("states.comingSoon")}</div>
//         </div>
//       </div>
//     </>
//   );
// }

/* ===================================================================== */

"use client";

import { AlertTriangle, Circle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { usePermissions } from "@/core/rbac/PermissionContext";
import { Badge, Card, CollapsibleSection } from "@/shared/ui";
import { KpiSkeleton, ListSkeleton, Skeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";
import { cn } from "@/shared/lib/cn";

import { NetworkStockSummaryCards } from "@/modules/zylo-liquid/components/NetworkStockSummaryCards";
import { ProductBreakdownModal, type ProductFilter } from "@/modules/zylo-liquid/components/ProductBreakdownModal";
import { TrendChart } from "@/modules/zylo-liquid/components/TrendChart";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { CashSummaryCards } from "@/modules/zylo-liquid/screens/caisse/CashSummaryCards";
import { NetworkCashModal } from "@/modules/zylo-liquid/screens/caisse/NetworkCashModal";
import { useCashPeriod, useNetworkCash } from "@/modules/zylo-liquid/screens/caisse/useCashData";
import { useCaisseStationRows } from "@/modules/zylo-liquid/screens/caisse/useCaisseStationRows";
import { aggregateCaisseCurrencyBlocks, aggregateCaisseProducts } from "@/modules/zylo-liquid/screens/caisse/cashAggregation";
import type { CurrencyCashBlock, NetworkProductCashLine } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { DashboardAlertsWidget } from "./DashboardAlertsWidget";
import { DashboardCashDiscrepanciesWidget } from "./DashboardCashDiscrepanciesWidget";
import { DashboardDeliveriesWidget } from "./DashboardDeliveriesWidget";
import { DashboardStockDiscrepanciesWidget } from "./DashboardStockDiscrepanciesWidget";
import { formatPercent } from "@/modules/zylo-liquid/utils/formatPercent";
import { useNetworkDashboard, type Period } from "@/modules/zylo-liquid/hooks/useNetworkDashboard";
import PompisteDashboard from "./PompisteDashboard";

const PERIODS: Period[] = ["now", "today", "7d", "30d", "custom"];

/** `zyloLiquid.station.read` conditionne, dans le prototype validé, toute
 * vue de pilotage station (matrice rôles × vues : Stations=null pour le
 * pompiste) — un utilisateur qui ne l'a pas reçoit donc "Mon shift"
 * (`PompisteDashboard`) plutôt que le tableau de bord réseau, jamais un
 * réseau vide/en erreur. */
const STATION_READ = "zyloLiquid.station.read";

export default function DashboardScreen() {
  const { can, loading: permissionsLoading } = usePermissions();
  if (!permissionsLoading && !can(STATION_READ)) {
    return <PompisteDashboard />;
  }
  return <NetworkDashboardScreen />;
}

function NetworkDashboardScreen() {
  const t = useTranslations("zyloLiquid");
  const tCaisse = useTranslations("zyloLiquid.caisse");
  const format = useFormatter();
  const { currentOrganization, loading: organizationLoading } = useOrganization();
  const organizationId = currentOrganization?.id ?? null;

  const [period, setPeriod] = useState<Period>("now");
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [breakdownFilter, setBreakdownFilter] = useState<ProductFilter | null>(null);

  const data = useNetworkDashboard(organizationId, period, customDate);

  // « Vente du jour » (Section 1, point 1) — même pipeline que la page
  // Caisse (aujourd'hui, toutes stations actives, sans filtre), jamais une
  // deuxième implémentation de l'agrégation réseau -> produit/devise.
  const todayCashPeriod = useCashPeriod();
  const activeStations = useMemo(() => data.stations.filter((s) => s.status === "active"), [data.stations]);
  const networkCash = useNetworkCash(organizationId, todayCashPeriod.fromDate, todayCashPeriod.toDate, todayCashPeriod.mode);
  const cashRows = useCaisseStationRows(activeStations, networkCash.data);
  const todayProductBlocks = useMemo(() => aggregateCaisseProducts(cashRows), [cashRows]);
  const todayCurrencyBlocks = useMemo(() => aggregateCaisseCurrencyBlocks(cashRows), [cashRows]);
  const [openCashBlock, setOpenCashBlock] = useState<CurrencyCashBlock | null>(null);
  const [openCashProductBlock, setOpenCashProductBlock] = useState<NetworkProductCashLine | null>(null);

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

  function formatDateShort(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "short" });
  }

  if (organizationLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
        <Skeleton className="h-64 w-full" variant="rectangular" />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  const fuelProductNameById = new Map(data.fuelProducts.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-col gap-6">
      {/* Zone A — barre de statut réseau */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border-subtle bg-surface px-4 py-3">
        {data.loading ? (
          <Skeleton className="h-5 w-64" />
        ) : (
          <div className="flex flex-wrap items-center gap-5 text-body-sm">
            <span className="flex items-center gap-2 text-text">
              <Circle className="size-2 fill-success text-success" aria-hidden />
              {t("statusBar.stationsActive", { count: data.stationsActiveCount })}
            </span>
            <span className="flex items-center gap-2 text-text-muted">
              <Circle className="size-2 fill-text-disabled text-text-disabled" aria-hidden />
              {t("statusBar.stationsOffline", { count: data.stationsOfflineCount })}
            </span>
            <span className="flex items-center gap-2 text-warning">
              <AlertTriangle className="size-4" aria-hidden />
              {t("statusBar.alertsActive", { count: data.activeAlertsCount })}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          {PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={cn(
                "rounded-pill px-3 py-1.5 text-body-sm font-medium transition-colors",
                period === value ? "bg-primary-muted text-primary" : "text-text-muted hover:bg-surface-muted"
              )}
            >
              {t(`statusBar.periods.${value}`)}
            </button>
          ))}
          {period === "custom" && (
            <input
              type="datetime-local"
              value={customDate ?? ""}
              onChange={(e) => setCustomDate(e.target.value)}
              className="ml-2 rounded-button border border-border px-2 py-1 text-body-sm"
            />
          )}
        </div>
      </div>

      {data.error && (
        <Card variant="default" className="border-error/30 bg-error-muted text-error">
          {data.error}
        </Card>
      )}

      {/* Rangée 1 — "Est-ce que je dois agir maintenant ?" : tout ce qui
          demande une décision, réuni en premier, avant même le stock/les
          ventes. 3 cartes au même patron visuel (titre + compteur + liste
          de 5 max) — alertes déjà existantes, écarts de stock et écarts de
          caisse nouveaux, tous deux lecture seule (lien vers l'écran dédié,
          jamais de modale ici, cf. widgets eux-mêmes). */}
      {organizationId && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <DashboardAlertsWidget organizationId={organizationId} alerts={data.activeAlerts} count={data.activeAlertsCount} stations={data.stations} tanks={data.tanks} />
          <DashboardStockDiscrepanciesWidget organizationId={organizationId} stations={data.stations} tanks={data.tanks} />
          <DashboardCashDiscrepanciesWidget organizationId={organizationId} stations={data.stations} />
        </div>
      )}

      {/* Section 1 — Produits pétroliers (rétractable) : vente du jour,
          synthèse stock réseau, livraisons récentes, alertes — chaque
          consultation de détail passe par une modale, jamais une
          redirection (contrainte explicite du commanditaire). */}
      <CollapsibleSection title={t("dashboardSections.fuelProducts")}>
        {networkCash.loading ? (
          <ListSkeleton rows={2} />
        ) : (
          <CashSummaryCards
            productBlocks={todayProductBlocks}
            currencyBlocks={todayCurrencyBlocks}
            onProductClick={setOpenCashProductBlock}
            onTotalClick={setOpenCashBlock}
          />
        )}

        {data.loading ? (
          <section>
            <Skeleton className="mb-3 h-6 w-48" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <KpiSkeleton key={i} />
              ))}
            </div>
          </section>
        ) : (
          <NetworkStockSummaryCards
            products={data.products}
            totalVolumeLiters={data.networkSummary?.totalVolumeLiters ?? 0}
            totalCapacityLiters={data.totalCapacityLiters}
            totalSellableVolumeLiters={data.totalSellableVolumeLiters}
            totalMonetaryValue={data.totalMonetaryValue}
            totalSellableMonetaryValue={data.totalSellableMonetaryValue}
            totalCurrencyCode={data.totalMonetaryCurrencyCode}
            formatMoney={formatMoney}
            onProductClick={setBreakdownFilter}
            onTotalClick={() => setBreakdownFilter({ fuelProductId: null, name: t("stockSynthesis.totalNetwork") })}
          />
        )}

        {organizationId && (
          <div className="grid grid-cols-1 gap-6">
            <DashboardDeliveriesWidget organizationId={organizationId} stations={data.stations} fuelProducts={data.fuelProducts} tanks={data.tanks} />
          </div>
        )}

        <NetworkCashModal
          open={openCashBlock !== null}
          onOpenChange={(next) => !next && setOpenCashBlock(null)}
          organizationId={organizationId ?? ""}
          block={openCashBlock}
          title={openCashBlock ? tCaisse("networkModal.title", { currency: openCashBlock.currencyCode }) : ""}
          fromDate={todayCashPeriod.fromDate}
          toDate={todayCashPeriod.toDate}
          mode={todayCashPeriod.mode}
        />
        <NetworkCashModal
          open={openCashProductBlock !== null}
          onOpenChange={(next) => !next && setOpenCashProductBlock(null)}
          organizationId={organizationId ?? ""}
          block={openCashProductBlock}
          title={openCashProductBlock ? tCaisse("networkModal.productTitle", { product: openCashProductBlock.fuelProductName, currency: openCashProductBlock.currencyCode ?? "—" }) : ""}
          fromDate={todayCashPeriod.fromDate}
          toDate={todayCashPeriod.toDate}
          mode={todayCashPeriod.mode}
        />
      </CollapsibleSection>

      {/* Zone C — graphique de tendance : garde son propre `chartLoading`
          (requête indépendante, déjà exposée par le hook). */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-h3 font-semibold text-text">{t("chart.title")}</h3>
            <span className="text-caption text-text-muted">{t("chart.unit")}</span>
          </div>
          {data.chartLoading ? (
            <div className="flex flex-col gap-4 sm:flex-row">
              <Skeleton className="h-48 flex-1" />
              <div className="flex shrink-0 flex-col gap-3 sm:w-40">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : data.chartPoints.length < 2 ? (
            <p className="text-body-sm text-text-muted">{t("chart.insufficientData")}</p>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <TrendChart
                  points={data.chartPoints.map((p) => ({ at: p.at, value: p.totalVolumeLiters }))}
                  formatValue={formatVolume}
                  formatDate={formatDateShort}
                  seriesLabel={t("chart.seriesLabel")}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:w-40">
                <div>
                  <p className="text-caption text-text-muted">{t("chart.currentStock")}</p>
                  <p className="text-body-lg font-semibold tabular-nums text-text">{formatVolume(data.networkSummary?.totalVolumeLiters ?? 0)}</p>
                </div>
                <div>
                  <p className="text-caption text-text-muted">{t("chart.totalCapacity")}</p>
                  <p className="text-body-md tabular-nums text-text">{formatVolume(data.totalCapacityLiters)}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Stations du réseau : dépend des états courants par station
            (`statesLoading`), qui se chargent après la base — reste en
            squelette même quand la synthèse et le graphique sont déjà
            affichés. */}
        <Card padding="none">
          <div className="flex items-center justify-between p-5 pb-0">
            <h3 className="text-h3 font-semibold text-text">{t("stations.title")}</h3>
          </div>
          <div className="overflow-x-auto p-5">
            {data.statesLoading ? (
              <table className="w-full border-collapse text-body-sm">
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} columns={7} />
                  ))}
                </tbody>
              </table>
            ) : (
              <>
                <table className="w-full border-collapse text-body-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-caption font-semibold uppercase tracking-wide text-text-muted">
                      <th className="py-2 text-left">{t("stations.columns.station")}</th>
                      <th className="py-2 text-left">{t("stations.columns.status")}</th>
                      <th className="py-2 text-left">{t("stations.columns.mainProduct")}</th>
                      <th className="py-2 text-right">{t("stations.columns.currentStock")}</th>
                      <th className="py-2 text-right">{t("stations.columns.capacity")}</th>
                      <th className="py-2 pl-4 text-left">{t("stations.columns.rate")}</th>
                      <th className="py-2 text-right">{t("stations.columns.value")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stationAggregates.map(({ station, online, volumeLiters, capacityLiters, monetaryValue, currencyCode, mainProductName }) => {
                      const rate = capacityLiters > 0 ? (volumeLiters / capacityLiters) * 100 : 0;
                      return (
                        <tr key={station.id} className="border-b border-border-subtle/60">
                          <td className="py-2 text-text">{station.name}</td>
                          <td className="py-2">
                            <Badge tone={online ? "success" : "neutral"} size="sm" dot>
                              {online ? t("stations.status.online") : t("stations.status.offline")}
                            </Badge>
                          </td>
                          <td className="py-2 text-text-muted">{mainProductName ?? "—"}</td>
                          <td className="py-2 text-right tabular-nums text-text">{formatVolume(volumeLiters)}</td>
                          <td className="py-2 text-right tabular-nums text-text-muted">{formatVolume(capacityLiters)}</td>
                          <td className="py-2 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-pill bg-surface-muted">
                                <div className="h-full rounded-pill bg-primary" style={{ width: `${Math.min(100, rate)}%` }} />
                              </div>
                              <span className="tabular-nums text-caption text-text-muted">{formatPercent(rate)}%</span>
                            </div>
                          </td>
                          <td className="py-2 text-right tabular-nums text-text">
                            {monetaryValue !== null && currencyCode ? formatMoney(monetaryValue, currencyCode) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {data.stationAggregates.length === 0 && <p className="py-4 text-body-sm text-text-muted">{t("stations.empty")}</p>}
                <p className="mt-3 text-caption text-text-muted">{t("stations.totalStations", { count: data.stations.length })}</p>
              </>
            )}
          </div>
        </Card>
      </div>

      {breakdownFilter && (
        <ProductBreakdownModal
          open={breakdownFilter !== null}
          onOpenChange={(open) => !open && setBreakdownFilter(null)}
          product={breakdownFilter}
          tanks={data.tanks}
          stations={data.stations}
          stationStates={data.stationStates}
          fuelProductNameById={fuelProductNameById}
          formatVolume={formatVolume}
          formatMoney={formatMoney}
        />
      )}
    </div>
  );
}
