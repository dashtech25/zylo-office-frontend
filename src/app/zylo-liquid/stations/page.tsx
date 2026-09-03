"use client";

import { Printer, Search } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { EmptyState } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { CreateStationModal } from "./_components/CreateStationModal";
import { useStationsList } from "./_lib/useStationsList";

const STATUS_VALUES = ["all", "active", "maintenance", "inactive"] as const;

type Freshness = "ok" | "late" | "old" | "never";

function freshnessOf(lastMeasurementAt: string | null): Freshness {
  if (!lastMeasurementAt) return "never";
  const ageMin = (Date.now() - new Date(lastMeasurementAt).getTime()) / 60000;
  if (ageMin <= 15) return "ok";
  if (ageMin <= 45) return "late";
  return "old";
}

/** Reproduit fidèlement `pageStations()` du prototype validé
 * (prototype.html, ~ligne 3828) : bandeau de fiabilité, carte réseau +
 * synthèse, barre de filtres, tableau trié par criticité. Les colonnes que
 * le Niveau 1 ne peut pas calculer honnêtement (couverture de stock,
 * pompes — nécessitent un débit de vente/un référentiel distributeur que
 * la télémétrie seule ne fournit pas) restent à leur place exacte,
 * affichées "—", jamais inventées. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
export default function StationsListPage() {
  const t = useTranslations("zyloLiquid.stations");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useStationsList(currentOrganization?.id ?? null);

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_VALUES)[number]>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

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

  const filteredRows = useMemo(() => {
    return data.rows
      .filter((row) => {
        if (statusFilter !== "all" && row.station.status !== statusFilter) return false;
        if (search.trim() && !row.station.name.toLowerCase().includes(search.trim().toLowerCase()) && !row.station.code.toLowerCase().includes(search.trim().toLowerCase())) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const alertA = data.activeAlerts.some((al) => al.stationId === a.station.id);
        const alertB = data.activeAlerts.some((al) => al.stationId === b.station.id);
        const rankA = alertA ? 0 : a.online ? 2 : 1;
        const rankB = alertB ? 0 : b.online ? 2 : 1;
        return rankA - rankB;
      });
  }, [data.rows, data.activeAlerts, statusFilter, search]);

  const totalCapacityLiters = data.tanks.filter((t) => t.active).reduce((sum, t) => sum + (t.calibratedCapacityLiters ?? t.capacityLiters), 0);
  const totalVolumeLiters = data.networkSummary?.totalVolumeLiters ?? 0;
  const avgFillRate = totalCapacityLiters > 0 ? (totalVolumeLiters / totalCapacityLiters) * 100 : 0;
  const totalCurrencies = new Set(data.rows.map((r) => r.totalCurrencyCode).filter((c): c is string => c !== null));
  const totalValue = totalCurrencies.size === 1 ? data.rows.reduce((sum, r) => sum + (r.totalValue ?? 0), 0) : null;
  const stationsInAlert = data.rows.filter((r) => !r.online || data.activeAlerts.some((a) => a.stationId === r.station.id)).length;
  const atgAvailabilityPct = data.stationsActiveCount > 0 ? ((data.stationsActiveCount - data.stationsOfflineCount) / data.stationsActiveCount) * 100 : 0;

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

  return (
    <>
      <div className="page-head">
        <div className="ph-text">
          <h1>{t("list.pageTitle")}</h1>
          <div className="ph-sub">{t("list.pageSubtitle", { count: data.stations.length })}</div>
        </div>
        <div className="page-actions no-print">
          <button type="button" className="btn" onClick={() => window.print()}>
            <Printer width={16} height={16} strokeWidth={1.8} aria-hidden />
            {t("list.print")}
          </button>
        </div>
      </div>

      {data.error && (
        <div className="banner crit">
          <div>{data.error}</div>
        </div>
      )}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : (
        <>
          <div className="grid g23" style={{ marginBottom: 16 }}>
            <div className="card">
              <h2>{t("list.map.title")}</h2>
              <div className="ch-sub">{t("list.map.subtitle")}</div>
              <div className="sep" />
              {!hasGeo ? (
                <div className="empty">
                  <div className="e-t">{t("list.map.noGeo")}</div>
                </div>
              ) : (
                <svg viewBox="0 0 340 320" width="100%" height={320} role="img" aria-label={t("list.map.title")}>
                  {geoStations.map((station) => {
                    if (station.latitude === null || station.longitude === null) return null;
                    const x = 20 + ((station.longitude - minLng) / spanLng) * 300;
                    const y = 300 - ((station.latitude - minLat) / spanLat) * 280;
                    const row = data.rows.find((r) => r.station.id === station.id);
                    const hasAlert = data.activeAlerts.some((al) => al.stationId === station.id);
                    const color = !row?.online ? "var(--info)" : hasAlert ? "var(--major)" : "var(--ok)";
                    return (
                      <g key={station.id}>
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
            <div className="card">
              <h2>{t("list.network.title")}</h2>
              <div className="sep" />
              <dl className="kv2">
                <dt>{t("list.network.stockTotal")}</dt>
                <dd className="mono">
                  {formatVolume(totalVolumeLiters)} / {formatVolume(totalCapacityLiters)}
                </dd>
                <dt>{t("list.network.avgFillRate")}</dt>
                <dd className="mono">{format.number(avgFillRate, { maximumFractionDigits: 1 })} %</dd>
                <dt>{t("list.network.stockValue")}</dt>
                <dd className="mono">{totalValue !== null && [...totalCurrencies][0] ? formatMoney(totalValue, [...totalCurrencies][0]) : "—"}</dd>
                <dt>{t("list.network.minCoverage")}</dt>
                <dd className="mono dim">—</dd>
                <dt>{t("list.network.stationsInAlert")}</dt>
                <dd className="mono">
                  {stationsInAlert} / {data.stations.length}
                </dd>
                <dt>{t("list.network.activeAlarms")}</dt>
                <dd className="mono">{data.activeAlertsCount}</dd>
                <dt>{t("list.network.dataAvailability")}</dt>
                <dd className="mono">{format.number(atgAvailabilityPct, { maximumFractionDigits: 0 })} %</dd>
              </dl>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row">
              <div style={{ flex: 1, minWidth: 200 }}>
                <input className="f" placeholder={t("list.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("list.searchPlaceholder")} />
              </div>
              <select className="f" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label={t("list.filterStatus")}>
                <option value="all">{t("list.filterStatus")}</option>
                {STATUS_VALUES.filter((v) => v !== "all").map((value) => (
                  <option key={value} value={value}>
                    {t(`status.${value}`)}
                  </option>
                ))}
              </select>
              <button type="button" className="btn primary" onClick={() => setCreateOpen(true)}>
                {t("list.add")}
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: 16 }} className="card-head">
              <div style={{ flex: 1 }}>
                <h2>{t("list.table.title")}</h2>
                <div className="ch-sub">{t("list.table.subtitle")}</div>
              </div>
            </div>
            <div className="tw" style={{ border: "none" }}>
              <table className="t">
                <thead>
                  <tr>
                    <th>{t("list.table.station")}</th>
                    <th>{t("list.table.type")}</th>
                    <th className="r">{t("list.table.tanks")}</th>
                    <th className="r">{t("list.table.stock")}</th>
                    <th className="r">{t("list.table.fillRate")}</th>
                    <th className="r">{t("list.table.value")}</th>
                    <th className="r">{t("list.table.coverage")}</th>
                    <th className="r">{t("list.table.pumps")}</th>
                    <th className="r">{t("list.table.alarms")}</th>
                    <th>{t("list.table.data")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const pct = row.totalCapacityLiters > 0 ? (row.totalVolumeLiters / row.totalCapacityLiters) * 100 : null;
                    const stationAlerts = data.activeAlerts.filter((a) => a.stationId === row.station.id);
                    const critical = stationAlerts.some((a) => a.type === "leak" || a.type === "level_high");
                    const fresh = freshnessOf(row.lastMeasurementAt);
                    const exploitationTone = row.station.exploitationType === "propre" ? "b-ok" : row.station.exploitationType === "franchise" ? "b-info" : "b-idle";
                    return (
                      <tr key={row.station.id} className="clickable" onClick={() => (window.location.href = `/zylo-liquid/stations/${row.station.id}`)}>
                        <td>
                          <span className="strong">{row.station.name}</span>
                          <br />
                          <span className="xsmall dim">{row.station.code}</span>
                        </td>
                        <td>
                          <span className={`badge ${exploitationTone}`}>
                            <span className="dot" />
                            {t(`exploitationType.${row.station.exploitationType}` as "exploitationType.propre")}
                          </span>
                        </td>
                        <td className="r mono">{data.tanks.filter((tk) => tk.stationId === row.station.id && tk.active).length}</td>
                        <td className="r mono">{formatVolume(row.totalVolumeLiters)}</td>
                        <td className="r">
                          <div style={{ minWidth: 90 }}>
                            <div className="bar-track">
                              <div className="bar-fill" style={{ width: `${Math.min(100, pct ?? 0)}%`, background: "var(--brand-deep)" }} />
                            </div>
                            <div className="xsmall mono right">{pct === null ? "—" : `${Math.round(pct)} %`}</div>
                          </div>
                        </td>
                        <td className="r mono">{row.totalValue !== null && row.totalCurrencyCode ? formatMoney(row.totalValue, row.totalCurrencyCode) : "—"}</td>
                        <td className="r mono dim">—</td>
                        <td className="r mono dim">—</td>
                        <td className="r">
                          <span className={`badge ${stationAlerts.length ? (critical ? "b-crit" : "b-major") : "b-ok"}`}>
                            <span className="dot" />
                            {stationAlerts.length || 0}
                          </span>
                        </td>
                        <td>
                          <span className={`fresh f-${fresh === "never" ? "old" : fresh}`}>
                            <span className="fd" />
                            {t(`freshness.${fresh}`)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <div style={{ padding: 16 }}>
                  <EmptyState
                    icon={Search}
                    title={search || statusFilter !== "all" ? t("list.noResults") : t("empty")}
                    actionLabel={search ? t("list.clearSearch") : undefined}
                    onAction={search ? () => setSearch("") : undefined}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {currentOrganization && (
        <CreateStationModal organizationId={currentOrganization.id} open={createOpen} onOpenChange={setCreateOpen} onCreated={data.reload} />
      )}
    </>
  );
}
