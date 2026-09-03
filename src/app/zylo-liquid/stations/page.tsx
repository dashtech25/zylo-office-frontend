"use client";

import { Download, MoreVertical, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { deactivateStation, reactivateStation } from "@/core/api/zyloLiquid";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { PageSpinner } from "@/shared/ui/Spinner";

import { CreateStationModal } from "./_components/CreateStationModal";
import { useStationsList, type StationRow } from "./_lib/useStationsList";

type StatusFilter = "all" | "online" | "offline" | "alert" | "critical";
type SortBy = "name" | "lowestLevel" | "highestValue" | "oldestSync";

function freshnessTone(lastMeasurementAt: string | null): "ok" | "late" | "old" {
  if (!lastMeasurementAt) return "old";
  const ageMin = (Date.now() - new Date(lastMeasurementAt).getTime()) / 60000;
  if (ageMin <= 15) return "ok";
  if (ageMin <= 60) return "late";
  return "old";
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Reconstruit la page "Stations du réseau" selon la spécification détaillée
 * fournie par le commanditaire (arborescence ZoneA-E), en remplaçant la
 * version précédente calquée sur prototype.html pour cette page précise.
 * Toutes les données restent réelles : agrégation par produit déjà fournie
 * par useStationsList, ville/devise via les référentiels réels (Core,
 * endpoints ajoutés en cours de route — GET /cities, GET /currencies).
 * Champ "Gérant" du modal de création volontairement omis : aucune colonne
 * ne le porte sur Station, l'ajouter inventerait un champ mort. */
export default function StationsListPage() {
  const t = useTranslations("zyloLiquid.stations");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const data = useStationsList(currentOrganization?.id ?? null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [badgeActive, setBadgeActive] = useState(false);
  const [badgeOffline, setBadgeOffline] = useState(false);
  const [badgeAlerts, setBadgeAlerts] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [search, setSearch] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editStation, setEditStation] = useState<StationRow["station"] | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currencyId && data.currencies.length > 0) setCurrencyId(data.currencies[0].id);
  }, [currencyId, data.currencies]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedCurrency = data.currencies.find((c) => c.id === currencyId) ?? null;
  const cityById = new Map(data.cities.map((c) => [c.id, c]));

  function formatVolume(liters: number): string {
    return `${format.number(Math.round(liters))} L`;
  }

  function formatMoney(value: number, nativeCurrencyCode: string): string | null {
    if (selectedCurrency && selectedCurrency.code !== nativeCurrencyCode) return null;
    try {
      return format.number(value, { style: "currency", currency: nativeCurrencyCode, maximumFractionDigits: 0 });
    } catch {
      return `${format.number(Math.round(value))} ${nativeCurrencyCode}`;
    }
  }

  const activeCount = data.stationsActiveCount;
  const offlineCount = data.stationsOfflineCount;

  const filteredRows = useMemo(() => {
    let rows = data.rows.filter((row) => {
      if (statusFilter !== "all" && row.state !== statusFilter) return false;
      if (badgeActive && row.station.status !== "active") return false;
      if (badgeOffline && row.online) return false;
      if (badgeAlerts && row.alertsCount === 0) return false;
      if (cityFilter && row.station.cityId !== cityFilter) return false;
      if (productFilter && !row.products.some((p) => p.fuelProductId === productFilter)) return false;
      if (search.trim() && !row.station.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === "name") return a.station.name.localeCompare(b.station.name);
      if (sortBy === "lowestLevel") {
        const pa = a.totalCapacityLiters > 0 ? a.totalVolumeLiters / a.totalCapacityLiters : 1;
        const pb = b.totalCapacityLiters > 0 ? b.totalVolumeLiters / b.totalCapacityLiters : 1;
        return pa - pb;
      }
      if (sortBy === "highestValue") return (b.totalValue ?? -1) - (a.totalValue ?? -1);
      if (sortBy === "oldestSync") {
        const ta = a.lastMeasurementAt ? new Date(a.lastMeasurementAt).getTime() : 0;
        const tb = b.lastMeasurementAt ? new Date(b.lastMeasurementAt).getTime() : 0;
        return ta - tb;
      }
      return 0;
    });
    return rows;
  }, [data.rows, statusFilter, badgeActive, badgeOffline, badgeAlerts, cityFilter, productFilter, search, sortBy]);

  function clearFilters() {
    setStatusFilter("all");
    setBadgeActive(false);
    setBadgeOffline(false);
    setBadgeAlerts(false);
    setCityFilter("");
    setProductFilter("");
    setSearch("");
  }

  function handleExport() {
    const header = [t("list.columns.station"), "Ville", t("list.columns.status"), t("list.columns.stockByProduct"), t("list.columns.totalValue"), t("list.columns.sync")];
    const rows = filteredRows.map((row) => [
      row.station.name,
      row.station.cityId ? (cityById.get(row.station.cityId)?.name ?? "") : "",
      t(`list.status.${row.state}`),
      row.products.map((p) => `${p.fuelProductName}: ${formatVolume(p.volumeLiters)}/${formatVolume(p.capacityLiters)}`).join(" | "),
      row.totalValue !== null && row.totalCurrencyCode ? (formatMoney(row.totalValue, row.totalCurrencyCode) ?? `${row.totalValue} ${row.totalCurrencyCode}`) : t("list.row.valueNotCalculable"),
      row.lastMeasurementAt ? format.dateTime(new Date(row.lastMeasurementAt)) : t("list.row.syncOffline"),
    ]);
    downloadCsv("stations.csv", [header, ...rows]);
  }

  async function handleToggleStatus(row: StationRow) {
    if (!currentOrganization) return;
    setMenuOpenId(null);
    setStatusActionError(null);
    try {
      if (row.station.status === "active") {
        if (!window.confirm(t("list.confirmDeactivate"))) return;
        await deactivateStation(currentOrganization.id, row.station.id);
      } else {
        if (!window.confirm(t("list.confirmReactivate"))) return;
        await reactivateStation(currentOrganization.id, row.station.id);
      }
      data.reload();
    } catch (err) {
      setStatusActionError(err instanceof Error ? err.message : tCommon("states.error"));
    }
  }

  // ZoneE — totaux réseau par produit, sur les seules stations visibles (filtrées)
  const networkProducts = useMemo(() => {
    const byProduct = new Map<string, { name: string; color: string | null; volume: number; capacity: number }>();
    for (const row of filteredRows) {
      for (const p of row.products) {
        const entry = byProduct.get(p.fuelProductId) ?? { name: p.fuelProductName, color: p.displayColor, volume: 0, capacity: 0 };
        entry.volume += p.volumeLiters;
        entry.capacity += p.capacityLiters;
        byProduct.set(p.fuelProductId, entry);
      }
    }
    return [...byProduct.values()];
  }, [filteredRows]);

  const networkCurrencies = new Set(filteredRows.map((r) => r.totalCurrencyCode).filter((c): c is string => c !== null));
  const networkTotalValue = filteredRows.every((r) => r.totalValue !== null || r.totalVolumeLiters === 0) && networkCurrencies.size <= 1
    ? filteredRows.reduce((sum, r) => sum + (r.totalValue ?? 0), 0)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 120px)" }}>
      <div style={{ flex: 1 }}>
        {/* ZoneA */}
        <div className="page-head">
          <div className="ph-text">
            <h1>{t("list.pageTitle")}</h1>
            <div className="ph-sub">{t("list.pageSubtitle", { count: data.stations.length })}</div>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            {data.currencies.length > 0 && (
              <select className="f" style={{ width: "auto" }} value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} aria-label={t("list.currency")}>
                {data.currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            )}
            <div className="page-actions no-print">
              <button type="button" className="btn" onClick={handleExport}>
                <Download width={16} height={16} strokeWidth={1.8} aria-hidden />
                {t("list.export")}
              </button>
              <button type="button" className="btn primary" onClick={() => setCreateOpen(true)}>
                <Plus width={16} height={16} strokeWidth={1.8} aria-hidden />
                {t("list.add")}
              </button>
            </div>
          </div>
        </div>

        {statusActionError && (
          <div className="banner crit">
            <div>{statusActionError}</div>
          </div>
        )}
        {data.error && (
          <div className="banner crit">
            <div>{data.error}</div>
          </div>
        )}

        {data.loading ? (
          <PageSpinner label={tCommon("states.loading")} />
        ) : (
          <>
            {/* ZoneB */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="row" style={{ marginBottom: 10 }}>
                <button type="button" className={`badge ${badgeActive ? "b-ok" : "outline"}`} onClick={() => setBadgeActive((v) => !v)}>
                  <span className="dot" />
                  {t("list.badges.active", { count: activeCount })}
                </button>
                <button type="button" className={`badge ${badgeOffline ? "b-idle" : "outline"}`} onClick={() => setBadgeOffline((v) => !v)}>
                  <span className="dot" />
                  {t("list.badges.offline", { count: offlineCount })}
                </button>
                <button type="button" className={`badge ${badgeAlerts ? "b-major" : "outline"}`} onClick={() => setBadgeAlerts((v) => !v)}>
                  <span className="dot" />
                  {t("list.badges.alerts", { count: data.activeAlertsCount })}
                </button>
              </div>
              <div className="row">
                <select className="f" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} aria-label={t("list.filters.status")}>
                  <option value="all">{t("list.filters.statusOptions.all")}</option>
                  <option value="online">{t("list.filters.statusOptions.online")}</option>
                  <option value="offline">{t("list.filters.statusOptions.offline")}</option>
                  <option value="alert">{t("list.filters.statusOptions.alert")}</option>
                  <option value="critical">{t("list.filters.statusOptions.critical")}</option>
                </select>
                <select className="f" style={{ width: "auto" }} value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} aria-label={t("list.filters.city")}>
                  <option value="">{t("list.filters.cityAll")}</option>
                  {data.cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select className="f" style={{ width: "auto" }} value={productFilter} onChange={(e) => setProductFilter(e.target.value)} aria-label={t("list.filters.product")}>
                  <option value="">{t("list.filters.productAll")}</option>
                  {data.fuelProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select className="f" style={{ width: "auto" }} value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} aria-label={t("list.filters.sortBy")}>
                  <option value="name">{t("list.filters.sortOptions.name")}</option>
                  <option value="lowestLevel">{t("list.filters.sortOptions.lowestLevel")}</option>
                  <option value="highestValue">{t("list.filters.sortOptions.highestValue")}</option>
                  <option value="oldestSync">{t("list.filters.sortOptions.oldestSync")}</option>
                </select>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input className="f" placeholder={t("list.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("list.searchPlaceholder")} />
                </div>
              </div>
            </div>

            {/* ZoneC */}
            {filteredRows.length > 0 && (
              <div className="row" style={{ padding: "0 4px", marginBottom: 6, color: "var(--ink-2)" }}>
                <div style={{ width: "20%" }} className="xsmall strong">
                  {t("list.columns.station")}
                </div>
                <div style={{ width: "10%" }} className="xsmall strong">
                  {t("list.columns.status")}
                </div>
                <div style={{ width: "45%" }} className="xsmall strong">
                  {t("list.columns.stockByProduct")}
                </div>
                <div style={{ width: "15%", textAlign: "right" }} className="xsmall strong">
                  {t("list.columns.totalValue")}
                </div>
                <div style={{ width: "7%" }} className="xsmall strong">
                  {t("list.columns.sync")}
                </div>
                <div style={{ width: "3%" }} />
              </div>
            )}

            {/* ZoneD */}
            {data.stations.length === 0 ? (
              <div className="empty">
                <div className="e-t">{t("list.empty.title")}</div>
                <button type="button" className="btn primary" style={{ marginTop: 10 }} onClick={() => setCreateOpen(true)}>
                  {t("list.empty.add")}
                </button>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="empty">
                <div className="e-t">{t("list.noResults")}</div>
                <button type="button" className="btn" style={{ marginTop: 10 }} onClick={clearFilters}>
                  {t("list.clearFilters")}
                </button>
              </div>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {filteredRows.map((row) => {
                  const city = row.station.cityId ? cityById.get(row.station.cityId) : null;
                  const fresh = freshnessTone(row.lastMeasurementAt);
                  const borderColor = row.state === "critical" ? "var(--crit)" : row.state === "alert" ? "var(--major)" : "transparent";
                  return (
                    <div
                      key={row.station.id}
                      className="card"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        minHeight: 120,
                        cursor: "pointer",
                        borderLeft: `3px solid ${borderColor}`,
                        background: row.state === "offline" ? "var(--surface-2)" : row.state === "critical" ? "var(--crit-bg)" : row.state === "alert" ? "var(--major-bg)" : undefined,
                      }}
                      onClick={() => router.push(`/zylo-liquid/stations/${row.station.id}`)}
                    >
                      <div style={{ width: "20%", paddingRight: 8 }}>
                        <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: row.state === "critical" ? "var(--crit)" : row.state === "alert" ? "var(--major)" : row.state === "offline" ? "var(--idle)" : "var(--ok)",
                              flexShrink: 0,
                            }}
                          />
                          <Link href={`/zylo-liquid/stations/${row.station.id}`} onClick={(e) => e.stopPropagation()} className="strong">
                            {row.station.name}
                          </Link>
                        </div>
                        {city && (
                          <div className="xsmall dim" style={{ marginLeft: 14 }}>
                            {city.name}
                          </div>
                        )}
                      </div>

                      <div style={{ width: "10%", paddingRight: 8 }}>
                        <span className={`badge ${row.state === "critical" ? "b-crit" : row.state === "alert" ? "b-major" : row.state === "offline" ? "b-idle" : "b-ok"}`}>
                          <span className="dot" />
                          {t(`list.status.${row.state}`)}
                        </span>
                      </div>

                      <div style={{ width: "45%", paddingRight: 8 }}>
                        <div className="stack" style={{ gap: 8 }}>
                          {row.products.length === 0 ? (
                            <span className="xsmall dim">—</span>
                          ) : (
                            [...row.products]
                              .sort((a, b) => b.volumeLiters - a.volumeLiters)
                              .map((p) => {
                                const pct = p.capacityLiters > 0 ? (p.volumeLiters / p.capacityLiters) * 100 : 0;
                                const critical = pct < 10;
                                const attention = pct < 20;
                                const unitPrice = p.monetaryValue !== null && p.volumeLiters > 0 ? p.monetaryValue / p.volumeLiters : null;
                                const moneyDisplay = p.monetaryValue !== null && p.currencyCode ? formatMoney(p.monetaryValue, p.currencyCode) : null;
                                return (
                                  <div key={p.fuelProductId}>
                                    <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
                                      <span style={{ width: 8, height: 8, borderRadius: 2, background: p.displayColor ?? "var(--ink-3)", flexShrink: 0 }} />
                                      <span className="xsmall strong">{p.fuelProductName.toUpperCase()}</span>
                                      <span className="xsmall dim">{t("list.row.tankCount", { count: p.tankCount })}</span>
                                    </div>
                                    <div className="row" style={{ gap: 8, alignItems: "baseline", marginTop: 2 }}>
                                      <span className="mono strong">{formatVolume(p.volumeLiters)}</span>
                                      <span className="mono dim xsmall">/ {formatVolume(p.capacityLiters)}</span>
                                    </div>
                                    <div className="row" style={{ gap: 8, alignItems: "center", marginTop: 3 }}>
                                      <div className="bar-track" style={{ flex: 1, maxWidth: 160 }}>
                                        <div
                                          className={critical ? "pulse" : undefined}
                                          style={{ height: "100%", borderRadius: 99, width: `${Math.min(100, pct)}%`, background: attention ? "var(--crit)" : p.displayColor ?? "var(--brand-deep)" }}
                                        />
                                      </div>
                                      <span className="xsmall mono" style={{ color: attention ? "var(--crit)" : undefined }}>
                                        {Math.round(pct)}%
                                      </span>
                                      {critical && (
                                        <span className="badge b-crit">
                                          <span className="dot" />
                                          {t("list.row.critical")}
                                        </span>
                                      )}
                                    </div>
                                    <div className="xsmall" style={{ marginTop: 2 }}>
                                      {unitPrice === null ? (
                                        <span className="dim" style={{ fontStyle: "italic" }}>
                                          {t("list.row.priceUndefined")}
                                        </span>
                                      ) : (
                                        <span className="dim mono">
                                          {format.number(unitPrice, { maximumFractionDigits: 1 })} {p.currencyCode}/L
                                        </span>
                                      )}
                                      {"  "}
                                      {p.monetaryValue === null ? (
                                        <span className="dim" style={{ fontStyle: "italic" }}>
                                          {t("list.row.valueNotCalculable")}
                                        </span>
                                      ) : moneyDisplay === null ? (
                                        <span className="dim" style={{ fontStyle: "italic" }}>
                                          {t("list.row.conversionUnavailable")}
                                        </span>
                                      ) : (
                                        <span className="mono strong">{moneyDisplay}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>

                      <div style={{ width: "15%", textAlign: "right", paddingRight: 8 }}>
                        {row.totalValue === null || !row.totalCurrencyCode ? (
                          <span className="dim small" style={{ fontStyle: "italic" }}>
                            {t("list.row.valueNotCalculable")}
                          </span>
                        ) : (
                          <>
                            <div className="mono strong">
                              {formatMoney(row.totalValue, row.totalCurrencyCode) ?? t("list.row.conversionUnavailable")}
                              {row.pricingStatus === "partial" && <span className="xsmall dim"> {t("list.row.partial")}</span>}
                            </div>
                            <div className="xsmall dim">{row.totalCurrencyCode}</div>
                          </>
                        )}
                      </div>

                      <div style={{ width: "7%" }}>
                        <span className={`fresh f-${fresh}`}>
                          <span className="fd" />
                          {row.lastMeasurementAt ? format.dateTime(new Date(row.lastMeasurementAt), { hour: "2-digit", minute: "2-digit" }) : t("list.row.syncOffline")}
                        </span>
                      </div>

                      <div style={{ width: "3%", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="btn sm" onClick={() => setMenuOpenId(menuOpenId === row.station.id ? null : row.station.id)} aria-haspopup="menu">
                          <MoreVertical width={14} height={14} strokeWidth={1.8} aria-hidden />
                        </button>
                        {menuOpenId === row.station.id && (
                          <div ref={menuRef} role="menu" className="card" style={{ position: "absolute", right: 0, top: "100%", zIndex: 20, marginTop: 4, width: 200, padding: 6 }}>
                            <Link href={`/zylo-liquid/stations/${row.station.id}`} className="sb-link" style={{ color: "var(--ink)" }}>
                              {t("list.menu.viewDetail")}
                            </Link>
                            <button type="button" className="sb-link" style={{ color: "var(--ink)" }} onClick={() => { setMenuOpenId(null); setEditStation(row.station); }}>
                              {t("list.menu.edit")}
                            </button>
                            <button type="button" className="sb-link" style={{ color: "var(--ink)" }} onClick={() => handleToggleStatus(row)}>
                              {row.station.status === "active" ? t("list.menu.deactivate") : t("list.menu.reactivate")}
                            </button>
                            <div className="sep" style={{ margin: "4px 0" }} />
                            <Link href={`/zylo-liquid/alerts?station=${row.station.id}`} className="sb-link" style={{ color: "var(--ink)" }}>
                              {t("list.menu.viewAlerts")}
                            </Link>
                            <Link href={`/zylo-liquid/livraisons?station=${row.station.id}`} className="sb-link" style={{ color: "var(--ink)" }}>
                              {t("list.menu.viewDeliveries")}
                            </Link>
                            <Link href={`/zylo-liquid/fuites?station=${row.station.id}`} className="sb-link" style={{ color: "var(--ink)" }}>
                              {t("list.menu.viewLeaks")}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ZoneE */}
      {!data.loading && filteredRows.length > 0 && (
        <div className="card" style={{ position: "sticky", bottom: 0, marginTop: 16, boxShadow: "var(--sh-3)" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
            <div className="row" style={{ gap: 24, flexWrap: "wrap" }}>
              {networkProducts.map((p) => {
                const pct = p.capacity > 0 ? (p.volume / p.capacity) * 100 : 0;
                return (
                  <div key={p.name} style={{ minWidth: 160 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color ?? "var(--ink-3)" }} />
                      <span className="xsmall strong">{p.name}</span>
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 2 }}>
                      <span className="mono small">{formatVolume(p.volume)}</span>
                      <span className="mono dim xsmall">/ {formatVolume(p.capacity)}</span>
                      <span className="mono xsmall">{Math.round(pct)}%</span>
                    </div>
                    <div className="bar-track" style={{ marginTop: 3, maxWidth: 160 }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${Math.min(100, pct)}%`, background: p.color ?? "var(--brand-deep)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="xsmall dim">{t("list.footer.networkTotal")}</div>
              <div className="mono strong" style={{ fontSize: 17 }}>
                {networkTotalValue !== null && [...networkCurrencies][0]
                  ? formatMoney(networkTotalValue, [...networkCurrencies][0]) ?? t("list.row.conversionUnavailable")
                  : t("list.row.valueNotCalculable")}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentOrganization && (
        <>
          <CreateStationModal organizationId={currentOrganization.id} open={createOpen} onOpenChange={setCreateOpen} onCreated={data.reload} />
          {editStation && (
            <CreateStationModal
              organizationId={currentOrganization.id}
              open={!!editStation}
              onOpenChange={(open) => !open && setEditStation(null)}
              onCreated={() => {
                data.reload();
                setEditStation(null);
              }}
              station={editStation}
            />
          )}
        </>
      )}
    </div>
  );
}
