"use client";

import { Download, Plus, Search } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { deactivateStation, reactivateStation } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatPercent } from "@/modules/zylo-liquid/utils/formatPercent";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Select, Stack } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { CreateStationModal } from "@/modules/zylo-liquid/components/CreateStationModal";

import { NetworkSummaryBar } from "./StationCard/NetworkSummaryBar";
import { StationCard } from "./StationCard/StationCard";
import { StationsTable } from "./StationCard/StationsTable";
import { useStationsList, type StationRow } from "./useStationsList";

type StatusFilter = "all" | "online" | "offline" | "alert" | "critical";
type SortBy = "name" | "lowestLevel" | "highestValue" | "oldestSync";

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
 * fournie par le commanditaire (arborescence ZoneA-E). Toutes les données
 * restent réelles : agrégation par produit déjà fournie par
 * useStationsList, ville/devise via les référentiels réels (Core, endpoints
 * ajoutés en cours de route — GET /cities, GET /currencies). Champ "Gérant"
 * du modal de création volontairement omis : aucune colonne ne le porte sur
 * Station, l'ajouter inventerait un champ mort. */
export default function StationsListScreen() {
  const t = useTranslations("zyloLiquid.stations");
  const tCommon = useTranslations("common");
  const format = useFormatter();
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
    return `${formatLiters(liters)} L`;
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

  // Totaux réseau par produit, sur les seules stations visibles (filtrées)
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
  const networkTotalValue =
    filteredRows.every((r) => r.totalValue !== null || r.totalVolumeLiters === 0) && networkCurrencies.size <= 1 ? filteredRows.reduce((sum, r) => sum + (r.totalValue ?? 0), 0) : null;

  return (
    <Stack>
      <PageHeader
        title={t("list.pageTitle")}
        description={t("list.pageSubtitle", { count: data.stations.length })}
        actions={
          <div className="flex items-center gap-2 no-print">
            {data.currencies.length > 0 && (
              <div className="w-24">
                <Select aria-label={t("list.currency")} value={currencyId} onValueChange={setCurrencyId} options={data.currencies.map((c) => ({ value: c.id, label: c.code }))} />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4" aria-hidden />
              {t("list.export")}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden />
              {t("list.add")}
            </Button>
          </div>
        }
      />

      {statusActionError && <Alert tone="error">{statusActionError}</Alert>}
      {data.error && <Alert tone="error">{data.error}</Alert>}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : (
        <>
          <Card>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone={badgeActive ? "success" : "neutral"} dot className="cursor-pointer" onClick={() => setBadgeActive((v) => !v)}>
                {t("list.badges.active", { count: activeCount })}
              </Badge>
              <Badge tone={badgeOffline ? "neutral" : "neutral"} dot className="cursor-pointer border border-border" onClick={() => setBadgeOffline((v) => !v)}>
                {t("list.badges.offline", { count: offlineCount })}
              </Badge>
              <Badge tone={badgeAlerts ? "warning" : "neutral"} dot className="cursor-pointer" onClick={() => setBadgeAlerts((v) => !v)}>
                {t("list.badges.alerts", { count: data.activeAlertsCount })}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="w-full sm:w-44">
                <Select
                  aria-label={t("list.filters.status")}
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                  options={(["all", "online", "offline", "alert", "critical"] as StatusFilter[]).map((v) => ({ value: v, label: t(`list.filters.statusOptions.${v}`) }))}
                />
              </div>
              <div className="w-full sm:w-44">
                <Select
                  aria-label={t("list.filters.city")}
                  value={cityFilter || undefined}
                  onValueChange={(v) => setCityFilter(v === "__all__" ? "" : v)}
                  placeholder={t("list.filters.cityAll")}
                  options={[{ value: "__all__", label: t("list.filters.cityAll") }, ...data.cities.map((c) => ({ value: c.id, label: c.name }))]}
                />
              </div>
              <div className="w-full sm:w-44">
                <Select
                  aria-label={t("list.filters.product")}
                  value={productFilter || undefined}
                  onValueChange={(v) => setProductFilter(v === "__all__" ? "" : v)}
                  placeholder={t("list.filters.productAll")}
                  options={[{ value: "__all__", label: t("list.filters.productAll") }, ...data.fuelProducts.map((p) => ({ value: p.id, label: p.name }))]}
                />
              </div>
              <div className="w-full sm:w-44">
                <Select
                  aria-label={t("list.filters.sortBy")}
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortBy)}
                  options={(["name", "lowestLevel", "highestValue", "oldestSync"] as SortBy[]).map((v) => ({ value: v, label: t(`list.filters.sortOptions.${v}`) }))}
                />
              </div>
              <div className="min-w-[200px] flex-1">
                <Input icon={<Search className="size-4" aria-hidden />} placeholder={t("list.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("list.searchPlaceholder")} />
              </div>
            </div>
          </Card>

          {filteredRows.length > 0 && (
            <NetworkSummaryBar
              products={networkProducts}
              formatVolume={formatVolume}
              formatPercent={formatPercent}
              totalLabel={t("list.footer.networkTotal")}
              totalDisplay={networkTotalValue !== null && [...networkCurrencies][0] ? (formatMoney(networkTotalValue, [...networkCurrencies][0]) ?? t("list.row.conversionUnavailable")) : t("list.row.valueNotCalculable")}
            />
          )}

          {data.stations.length === 0 ? (
            <EmptyState
              title={t("list.empty.title")}
              actionLabel={t("list.empty.add")}
              onAction={() => setCreateOpen(true)}
            />
          ) : filteredRows.length === 0 ? (
            <EmptyState title={t("list.noResults")} actionLabel={t("list.clearFilters")} onAction={clearFilters} />
          ) : (
            <StationsTable>
              {filteredRows.map((row, index) => (
                <StationCard
                  key={row.station.id}
                  row={row}
                  city={row.station.cityId ? (cityById.get(row.station.cityId) ?? null) : null}
                  formatVolume={formatVolume}
                  formatMoney={formatMoney}
                  formatUnitPrice={(value) => format.number(value, { maximumFractionDigits: 1 })}
                  menuOpen={menuOpenId === row.station.id}
                  menuRef={menuOpenId === row.station.id ? menuRef : undefined}
                  onToggleMenu={() => setMenuOpenId(menuOpenId === row.station.id ? null : row.station.id)}
                  onEdit={() => {
                    setMenuOpenId(null);
                    setEditStation(row.station);
                  }}
                  onToggleStatus={() => handleToggleStatus(row)}
                  isLast={index === filteredRows.length - 1}
                />
              ))}
            </StationsTable>
          )}
        </>
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
    </Stack>
  );
}
