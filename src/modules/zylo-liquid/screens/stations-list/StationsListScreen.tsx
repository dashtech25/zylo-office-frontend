"use client";

import { Download, Map as MapIcon, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { exportTable } from "@/core/api/exportTable";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { deactivateStation, reactivateStation } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { downloadCsv } from "@/modules/zylo-liquid/utils/downloadCsv";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { Alert, Button, Card, DropdownMenu, DropdownMenuItem, EmptyState, Modal, PageHeader, Select, Stack } from "@/shared/ui";
import { KpiSkeleton, Skeleton } from "@/shared/ui/Skeleton";

import { CreateStationModal } from "@/modules/zylo-liquid/components/CreateStationModal";
import { NetworkStockSummaryCards } from "@/modules/zylo-liquid/components/NetworkStockSummaryCards";
import { ProductBreakdownModal, type ProductFilter } from "@/modules/zylo-liquid/components/ProductBreakdownModal";
import { StationsMap } from "@/modules/zylo-liquid/components/StationsMap";

import { ProductStockGrid } from "./StationCard/ProductStockGrid";
import { StationCard, freshnessTone } from "./StationCard/StationCard";
import { StationSyncBadge } from "./StationCard/StationSyncBadge";
import { StationsTable } from "./StationCard/StationsTable";
import { StatusBadge } from "./StationCard/StatusBadge";
import { StatusDot } from "./StationCard/StatusDot";
import { StationsFilterBar } from "./StationsFilterBar";
import { useStationsList, type StationRow } from "./useStationsList";

type StatusFilter = "all" | "online" | "offline" | "alert" | "critical";
type SortBy = "criticality" | "name" | "lowestLevel" | "highestValue" | "oldestSync";

// Reprend l'ordre de tri par défaut du prototype validé (prototype.html,
// pageStations() ~ligne 3878 : "Triées par criticité — les stations
// demandant une attention apparaissent en premier") — ajouté en option
// supplémentaire du sélecteur existant, jamais retiré, mais devient le tri
// par défaut au premier affichage pour correspondre au prototype.
const CRITICALITY_RANK: Record<StationRow["state"], number> = { critical: 0, alert: 1, offline: 2, online: 3 };

/** Reconstruit la page "Stations du réseau" selon la spécification détaillée
 * fournie par le commanditaire (arborescence ZoneA-E). Toutes les données
 * restent réelles : agrégation par produit déjà fournie par
 * useStationsList, ville/devise via les référentiels réels (Core, endpoints
 * ajoutés en cours de route — GET /cities, GET /currencies). Champ "Gérant"
 * du modal de création volontairement omis : aucune colonne ne le porte sur
 * Station, l'ajouter inventerait un champ mort. */
export default function StationsListScreen() {
  const t = useTranslations("zyloLiquid.stations");
  const tRoot = useTranslations("zyloLiquid");
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
  const [sortBy, setSortBy] = useState<SortBy>("criticality");
  const [search, setSearch] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [breakdownFilter, setBreakdownFilter] = useState<ProductFilter | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [previewStationId, setPreviewStationId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editStation, setEditStation] = useState<StationRow["station"] | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currencyId && data.currencies.length > 0) setCurrencyId(data.currencies[0].id);
  }, [currencyId, data.currencies]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedCurrency = data.currencies.find((c) => c.id === currencyId) ?? null;
  const cityById = new Map(data.cities.map((c) => [c.id, c]));
  const fuelProductNameById = new Map(data.fuelProducts.map((p) => [p.id, p.name]));

  function formatMoneyOrReason(value: number, nativeCurrencyCode: string): string {
    return formatMoney(value, nativeCurrencyCode) ?? t("list.row.conversionUnavailable");
  }

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
      if (sortBy === "criticality") {
        const rankDiff = CRITICALITY_RANK[a.state] - CRITICALITY_RANK[b.state];
        if (rankDiff !== 0) return rankDiff;
        const pa = a.totalCapacityLiters > 0 ? a.totalVolumeLiters / a.totalCapacityLiters : 1;
        const pb = b.totalCapacityLiters > 0 ? b.totalVolumeLiters / b.totalCapacityLiters : 1;
        return pa - pb;
      }
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

  // Extrait pour être réutilisé par les 3 formats d'export (P1-3, audit
  // module Stations 2026-09-16 : l'export était limité au CSV) — même
  // construction de lignes, seul le rendu final (CSV côté client, XLSX/DOCX
  // via le backend) diffère selon le format choisi.
  function buildExportTable(): { headers: string[]; rows: string[][] } {
    const headers = [t("list.columns.station"), "Ville", t("list.columns.status"), t("list.columns.stockByProduct"), t("list.columns.totalValue"), t("list.columns.sync")];
    const rows = filteredRows.map((row) => [
      row.station.name,
      row.station.cityId ? (cityById.get(row.station.cityId)?.name ?? "") : "",
      t(`list.status.${row.state}`),
      row.products.map((p) => `${p.fuelProductName}: ${formatVolume(p.volumeLiters)}/${formatVolume(p.capacityLiters)}`).join(" | "),
      row.totalValue !== null && row.totalCurrencyCode ? (formatMoney(row.totalValue, row.totalCurrencyCode) ?? `${row.totalValue} ${row.totalCurrencyCode}`) : t("list.row.valueNotCalculable"),
      row.lastMeasurementAt ? format.dateTime(new Date(row.lastMeasurementAt)) : t("list.row.syncOffline"),
    ]);
    return { headers, rows };
  }

  async function handleExport(exportFormat: "csv" | "xlsx" | "docx") {
    setExportMenuOpen(false);
    const { headers, rows } = buildExportTable();
    if (exportFormat === "csv") {
      downloadCsv("stations.csv", [headers, ...rows]);
      return;
    }
    if (!currentOrganization) return;
    setExporting(true);
    try {
      await exportTable(exportFormat, "stations", headers, rows, currentOrganization.id);
    } finally {
      setExporting(false);
    }
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

  // Totaux réseau par produit, sur les seules stations visibles (filtrées) —
  // même shape que ProductAggregate (hooks/useNetworkDashboard.ts) pour
  // pouvoir alimenter le même composant NetworkStockSummaryCards que le
  // tableau de bord, sans le dupliquer.
  const networkProducts = useMemo(() => {
    const byProduct = new Map<
      string,
      { name: string; color: string | null; volume: number; capacity: number; stationIds: Set<string>; monetary: number; sellableVolume: number; sellableMonetary: number; currencies: Set<string> }
    >();
    // Toujours une entrée par produit ACTIF du catalogue de l'organisation,
    // même sans aucune cuve qui le vend — sinon un produit sans station
    // (ex. "Pétrole") n'obtient jamais de carte du tout (P0-2, audit module
    // Stations 2026-09-16) au lieu d'une carte à 0.
    for (const product of data.fuelProducts) {
      if (!product.active) continue;
      byProduct.set(product.id, { name: product.name, color: product.displayColor, volume: 0, capacity: 0, stationIds: new Set<string>(), monetary: 0, sellableVolume: 0, sellableMonetary: 0, currencies: new Set<string>() });
    }
    for (const row of filteredRows) {
      for (const p of row.products) {
        // Un filtre produit actif ne doit pas seulement retenir/exclure des
        // stations entières : il doit aussi restreindre QUELS produits de
        // ces stations sont comptés, sinon une station qui vend Gasoil ET
        // Super continue d'alimenter la carte Super même filtrée sur Gasoil
        // (P0-3, audit module Stations 2026-09-16 — "le filtre n'a aucun
        // effet visible sur les cartes").
        if (productFilter && p.fuelProductId !== productFilter) continue;
        const entry =
          byProduct.get(p.fuelProductId) ??
          { name: p.fuelProductName, color: p.displayColor, volume: 0, capacity: 0, stationIds: new Set<string>(), monetary: 0, sellableVolume: 0, sellableMonetary: 0, currencies: new Set<string>() };
        entry.volume += p.volumeLiters;
        entry.capacity += p.capacityLiters;
        entry.sellableVolume += p.sellableVolumeLiters;
        entry.stationIds.add(row.station.id);
        if (p.currencyCode) {
          entry.currencies.add(p.currencyCode);
          entry.monetary += p.monetaryValue ?? 0;
          entry.sellableMonetary += p.sellableMonetaryValue ?? 0;
        }
        byProduct.set(p.fuelProductId, entry);
      }
    }
    return [...byProduct.entries()].map(([fuelProductId, e]) => ({
      fuelProductId,
      name: e.name,
      displayColor: e.color,
      volumeLiters: e.volume,
      capacityLiters: e.capacity,
      stationCount: e.stationIds.size,
      monetaryValue: e.currencies.size === 1 ? e.monetary : null,
      currencyCode: e.currencies.size === 1 ? [...e.currencies][0] : null,
      sellableVolumeLiters: e.sellableVolume,
      sellableMonetaryValue: e.currencies.size === 1 ? e.sellableMonetary : null,
    }));
  }, [filteredRows, data.fuelProducts, productFilter]);

  // Bandeau de fiabilité (« double vérité » du prototype, prototype.html
  // bandeauFiabilite() ~ligne 3001) : une station entière est jugée "hors
  // ligne" par useStationsList dès qu'aucune de ses cuves n'a de mesure en
  // ligne — c'est exactement le signal déjà calculé, jamais un second calcul.
  const offlineStations = filteredRows.filter((r) => !r.online);

  const networkCurrencies = new Set(filteredRows.map((r) => r.totalCurrencyCode).filter((c): c is string => c !== null));
  const networkTotalValue =
    filteredRows.every((r) => r.totalValue !== null || r.totalVolumeLiters === 0) && networkCurrencies.size <= 1 ? filteredRows.reduce((sum, r) => sum + (r.totalValue ?? 0), 0) : null;
  const networkTotalSellableVolumeLiters = filteredRows.reduce((sum, r) => sum + r.totalSellableVolumeLiters, 0);
  const networkTotalSellableValue =
    filteredRows.every((r) => r.totalSellableValue !== null || r.totalVolumeLiters === 0) && networkCurrencies.size <= 1
      ? filteredRows.reduce((sum, r) => sum + (r.totalSellableValue ?? 0), 0)
      : null;
  const networkVolumeLiters = filteredRows.reduce((sum, r) => sum + r.totalVolumeLiters, 0);
  const networkCapacityLiters = filteredRows.reduce((sum, r) => sum + r.totalCapacityLiters, 0);

  const filterBarProps = {
    badges: [
      { key: "active", label: t("list.badges.active", { count: activeCount }), active: badgeActive, onToggle: () => setBadgeActive((v) => !v), tone: "success" as const },
      { key: "offline", label: t("list.badges.offline", { count: offlineCount }), active: badgeOffline, onToggle: () => setBadgeOffline((v) => !v) },
      { key: "alerts", label: t("list.badges.alerts", { count: data.activeAlertsCount }), active: badgeAlerts, onToggle: () => setBadgeAlerts((v) => !v), tone: "warning" as const },
    ],
    statusLabel: t("list.filters.status"),
    statusValue: statusFilter,
    onStatusChange: (v: string) => setStatusFilter(v as StatusFilter),
    statusOptions: (["all", "online", "offline", "alert", "critical"] as StatusFilter[]).map((v) => ({ value: v, label: t(`list.filters.statusOptions.${v}`) })),
    cityLabel: t("list.filters.city"),
    cityAllLabel: t("list.filters.cityAll"),
    cityFilter,
    onCityFilterChange: setCityFilter,
    cities: data.cities,
    productLabel: t("list.filters.product"),
    productAllLabel: t("list.filters.productAll"),
    productFilter,
    onProductFilterChange: setProductFilter,
    fuelProducts: data.fuelProducts,
    sortLabel: t("list.filters.sortBy"),
    sortValue: sortBy,
    onSortChange: (v: string) => setSortBy(v as SortBy),
    sortOptions: (["criticality", "name", "lowestLevel", "highestValue", "oldestSync"] as SortBy[]).map((v) => ({ value: v, label: t(`list.filters.sortOptions.${v}`) })),
    searchPlaceholder: t("list.searchPlaceholder"),
    search,
    onSearchChange: setSearch,
  };

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
            <div ref={exportMenuRef} className="relative">
              <Button variant="outline" size="sm" onClick={() => setExportMenuOpen((v) => !v)} loading={exporting}>
                <Download className="size-4" aria-hidden />
                {t("list.export")}
              </Button>
              <DropdownMenu open={exportMenuOpen}>
                <DropdownMenuItem onClick={() => handleExport("csv")}>{t("list.exportFormat.csv")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("xlsx")}>{t("list.exportFormat.xlsx")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("docx")}>{t("list.exportFormat.docx")}</DropdownMenuItem>
              </DropdownMenu>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden />
              {t("list.add")}
            </Button>
          </div>
        }
      />

      {statusActionError && <Alert tone="error">{statusActionError}</Alert>}
      {data.error && <Alert tone="error">{data.error}</Alert>}

      {/* La barre de filtres ne dépend d'aucune donnée réseau pour
          s'afficher (elle lit `data.cities`/`data.fuelProducts`, vides tant
          que la requête n'a pas répondu, mais son squelette d'interaction
          reste utilisable) — elle ne doit jamais être bloquée par le
          chargement de la carte/des cartes/du tableau. */}
      <Card
        className="flex cursor-pointer items-center gap-3 transition-shadow hover:shadow-elevated"
        onClick={() => setMapOpen(true)}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
          <MapIcon className="size-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-h4 font-semibold text-text">{t("list.map.title")}</h2>
          <p className="text-body-sm text-primary">{t("list.map.open")}</p>
        </div>
      </Card>

      <Card>
        <StationsFilterBar {...filterBarProps} />
      </Card>

      {!data.loading && offlineStations.length > 0 && (
        <Alert tone="error">
          {t("list.reliabilityBanner.offline", { count: offlineStations.length, names: offlineStations.map((r) => r.station.name).join(", ") })}
        </Alert>
      )}

      {/* Cartes de synthèse réseau — toujours affichées dès que le
          catalogue a au moins un produit actif (`networkProducts` n'est
          plus jamais vide, voir son useMemo) : un filtre qui ne retient
          aucune station affiche des cartes à 0, jamais une section vide
          (P0-3, audit module Stations 2026-09-16 — "toutes les cartes
          disparaissent" en filtrant sur un produit sans station). */}
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
        networkProducts.length > 0 && (
          <NetworkStockSummaryCards
            products={networkProducts}
            totalVolumeLiters={networkVolumeLiters}
            totalCapacityLiters={networkCapacityLiters}
            totalSellableVolumeLiters={networkTotalSellableVolumeLiters}
            totalMonetaryValue={networkTotalValue}
            totalSellableMonetaryValue={networkTotalSellableValue}
            totalCurrencyCode={[...networkCurrencies][0] ?? null}
            formatMoney={formatMoney}
            onProductClick={setBreakdownFilter}
            onTotalClick={() => setBreakdownFilter({ fuelProductId: null, name: t("list.footer.networkTotal") })}
          />
        )
      )}

      {/* Liste des stations (cartes) — même donnée, squelette dédié plutôt
          que de réutiliser celui des cartes de synthèse au-dessus. */}
      {data.loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-card" />
          ))}
        </div>
      ) : data.stations.length === 0 ? (
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

      <Modal open={mapOpen} onOpenChange={setMapOpen} title={t("list.map.title")} size="full" closeLabel={tCommon("actions.close")}>
        <Stack>
          <Card>
            <StationsFilterBar {...filterBarProps} />
          </Card>
          <StationsMap
            height={640}
            onStationClick={setPreviewStationId}
            stations={filteredRows.filter((r) => r.station.latitude != null && r.station.longitude != null).map((r) => ({
              id: r.station.id,
              name: r.station.name,
              latitude: r.station.latitude as number,
              longitude: r.station.longitude as number,
              status: r.state,
              popupSubtitle: tRoot("stockSynthesis.sellableOfAvailable", {
                sellable: formatVolume(r.totalSellableVolumeLiters),
                available: formatVolume(r.totalVolumeLiters),
              }),
            }))}
          />
        </Stack>
      </Modal>

      {previewStationId &&
        (() => {
          const previewRow = filteredRows.find((r) => r.station.id === previewStationId) ?? data.rows.find((r) => r.station.id === previewStationId);
          if (!previewRow) return null;
          const moneyDisplay = previewRow.totalValue !== null && previewRow.totalCurrencyCode ? formatMoney(previewRow.totalValue, previewRow.totalCurrencyCode) : null;
          const city = previewRow.station.cityId ? (cityById.get(previewRow.station.cityId) ?? null) : null;
          const fresh = freshnessTone(previewRow.lastMeasurementAt);
          return (
            <Modal
              open={!!previewStationId}
              onOpenChange={(open) => !open && setPreviewStationId(null)}
              closeLabel={tCommon("actions.close")}
              size="lg"
              title={
                <div className="flex flex-wrap items-center gap-3">
                  <span>{previewRow.station.name}</span>
                  <Button size="sm" variant="outline" onClick={() => router.push(`/zylo-liquid/stations/${previewRow.station.id}`)}>
                    {t("list.viewDetail")}
                  </Button>
                </div>
              }
            >
              <Stack>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusDot state={previewRow.state} />
                  <StatusBadge state={previewRow.state} label={t(`list.status.${previewRow.state}`)} />
                  {city && <span className="text-body-sm text-text-muted">{city.name}</span>}
                  <StationSyncBadge freshness={fresh} label={previewRow.lastMeasurementAt ? format.dateTime(new Date(previewRow.lastMeasurementAt), { hour: "2-digit", minute: "2-digit" }) : t("list.row.syncOffline")} />
                </div>

                <ProductStockGrid
                  products={previewRow.products}
                  emptyLabel="—"
                  formatVolume={formatVolume}
                  formatMoney={formatMoney}
                  formatUnitPrice={(value) => format.number(value, { maximumFractionDigits: 1 })}
                />

                <div className="flex items-center justify-between border-t border-border-subtle pt-3">
                  <span className="text-body-sm text-text-muted">{t("list.columns.totalValue")}</span>
                  <span className="font-mono font-semibold text-text">
                    {previewRow.totalValue !== null && previewRow.totalCurrencyCode ? (moneyDisplay ?? t("list.row.conversionUnavailable")) : t("list.row.valueNotCalculable")}
                  </span>
                </div>
              </Stack>
            </Modal>
          );
        })()}

      {breakdownFilter && (
        <ProductBreakdownModal
          open={!!breakdownFilter}
          onOpenChange={(open) => !open && setBreakdownFilter(null)}
          product={breakdownFilter}
          tanks={data.tanks}
          stations={data.stations}
          stationStates={data.stationStates}
          fuelProductNameById={fuelProductNameById}
          formatVolume={formatVolume}
          formatMoney={formatMoneyOrReason}
        />
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
