"use client";

import { AlertTriangle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import type { CurrencyCashBlock, NetworkProductCashLine } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { Alert, Card, EmptyState, Input, PageHeader, Stack } from "@/shared/ui";
import { KpiSkeleton, ListSkeleton } from "@/shared/ui/Skeleton";
import { cn } from "@/shared/lib/cn";

import { StationsFilterBar } from "@/modules/zylo-liquid/screens/stations-list/StationsFilterBar";
import { useStationsList } from "@/modules/zylo-liquid/screens/stations-list/useStationsList";

import { aggregateCaisseCurrencyBlocks, aggregateCaisseProducts } from "./cashAggregation";
import { CaisseStationsTable } from "./CaisseStationsTable";
import { CashSummaryCards } from "./CashSummaryCards";
import { DailySummaryCard } from "./DailySummaryCard";
import { NetworkCashModal } from "./NetworkCashModal";
import { StationCashCardsModal } from "./StationCashCardsModal";
import { useCashPeriod, useNetworkCash, type CashQuickPeriod } from "./useCashData";
import { useCaisseStationRows, type CaisseStationRow } from "./useCaisseStationRows";

const QUICK_PERIODS: CashQuickPeriod[] = ["today", "yesterday", "7d", "30d", "custom"];
type ConfidenceFilter = "all" | "reliable" | "partial" | "incomplete_data" | "insufficient_data" | "anomaly";
type CaisseSortBy = "name" | "highestValue" | "lowestValue";

/** Caisse du jour (page_caisse.md, validé avant implémentation) : le
 * propriétaire du réseau part d'un chiffre global par devise et descend
 * réseau -> station -> produit -> cuve -> mesures (NetworkCashModal ->
 * StationCashModal -> TankCashModal). Rien n'est jamais présenté comme une
 * comptabilité officielle (page_caisse.md §33) : chaque montant non
 * calculable affiche sa raison plutôt qu'un zéro silencieux.
 *
 * Filtrage par station (ville/produit/confiance/recherche) réutilise
 * `StationsFilterBar` (page Stations) — les cartes et le tableau se
 * recalculent tous deux à partir du même sous-ensemble filtré, jamais deux
 * périmètres divergents. */
export default function CaisseScreen() {
  const t = useTranslations("zyloLiquid.caisse");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();

  const period = useCashPeriod();
  const { data, loading, error } = useNetworkCash(currentOrganization?.id ?? null, period.fromDate, period.toDate, period.mode);
  const stationsList = useStationsList(currentOrganization?.id ?? null);

  const yesterdayRange = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    const yesterdayMidnight = new Date(todayMidnight);
    yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
    return { from: yesterdayMidnight.toISOString(), to: todayMidnight.toISOString() };
  }, []);
  const showComparison = period.quickPeriod === "today";
  const comparison = useNetworkCash(
    showComparison ? currentOrganization?.id ?? null : null,
    yesterdayRange.from,
    yesterdayRange.to
  );

  // Moyenne des 7 derniers jours PLEINS (hors aujourd'hui, encore partiel) —
  // page_caisse.md §L "comparaison temporelle", validé après le socle P0.
  const last7DaysRange = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(todayMidnight);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return { from: sevenDaysAgo.toISOString(), to: todayMidnight.toISOString() };
  }, []);
  const last7Days = useNetworkCash(showComparison ? currentOrganization?.id ?? null : null, last7DaysRange.from, last7DaysRange.to);

  const [openBlock, setOpenBlock] = useState<CurrencyCashBlock | null>(null);
  const [openProductBlock, setOpenProductBlock] = useState<NetworkProductCashLine | null>(null);
  const [openStationRow, setOpenStationRow] = useState<CaisseStationRow | null>(null);

  const [cityFilter, setCityFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [sortBy, setSortBy] = useState<CaisseSortBy>("highestValue");
  const [search, setSearch] = useState("");

  const activeStations = useMemo(() => stationsList.stations.filter((s) => s.status === "active"), [stationsList.stations]);
  const allRows = useCaisseStationRows(activeStations, data);
  const cityById = useMemo(() => new Map(stationsList.cities.map((c) => [c.id, c])), [stationsList.cities]);

  const filteredRows = useMemo(() => {
    const rows = allRows.filter((row) => {
      if (confidenceFilter !== "all" && row.confidence !== confidenceFilter) return false;
      if (cityFilter && row.station.cityId !== cityFilter) return false;
      if (productFilter && !row.products.some((p) => p.fuelProductId === productFilter)) return false;
      if (search.trim() && !row.station.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sortBy === "name") return a.station.name.localeCompare(b.station.name);
      if (sortBy === "highestValue") return (b.monetaryValue ?? -Infinity) - (a.monetaryValue ?? -Infinity);
      return (a.monetaryValue ?? Infinity) - (b.monetaryValue ?? Infinity);
    });
  }, [allRows, confidenceFilter, cityFilter, productFilter, search, sortBy]);

  function clearFilters() {
    setCityFilter("");
    setProductFilter("");
    setConfidenceFilter("all");
    setSearch("");
  }

  const filteredProductBlocks = useMemo(() => aggregateCaisseProducts(filteredRows), [filteredRows]);
  const filteredCurrencyBlocks = useMemo(() => aggregateCaisseCurrencyBlocks(filteredRows), [filteredRows]);

  const confidenceOptions: ConfidenceFilter[] = ["all", "reliable", "partial", "incomplete_data", "insufficient_data", "anomaly"];
  const sortOptions: CaisseSortBy[] = ["highestValue", "lowestValue", "name"];

  return (
    <Stack gap="lg">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-pill border border-border-subtle p-1">
              {QUICK_PERIODS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => period.setQuickPeriod(value)}
                  className={cn(
                    "rounded-pill px-3 py-1.5 text-body-sm font-medium transition-colors",
                    period.quickPeriod === value ? "bg-primary-muted text-primary" : "text-text-muted hover:bg-surface-muted"
                  )}
                >
                  {t(`periods.${value}`)}
                </button>
              ))}
            </div>
            {period.quickPeriod === "today" && (
              <label className="flex items-center gap-1.5 text-caption text-text-muted">
                <input type="checkbox" checked={period.isOperationalDay} onChange={(e) => period.setIsOperationalDay(e.target.checked)} />
                {t("operationalDayToggle")}
              </label>
            )}
            {period.quickPeriod === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  aria-label={t("customFrom")}
                  value={period.customFrom}
                  onChange={(e) => period.setCustomFrom(e.target.value)}
                />
                <span className="text-text-muted">→</span>
                <Input
                  type="datetime-local"
                  aria-label={t("customTo")}
                  value={period.customTo}
                  onChange={(e) => period.setCustomTo(e.target.value)}
                />
              </div>
            )}
          </div>
        }
      />

      {/* Vue globale des ventes du jour : la toute première information visible
          sur cette page est le montant total, en très grand — jamais noyée
          dans une liste de texte (demande explicite du commanditaire). Basée
          sur `data.currencyBlocks`, non filtrée par les filtres de la table
          plus bas — c'est un chiffre réseau global, pas un sous-ensemble. */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiSkeleton />
        </div>
      ) : (
        data &&
        data.currencyBlocks.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.currencyBlocks.map((block) => (
              <Card key={block.currencyCode} className="border-secondary/20 bg-secondary text-white">
                <p className="text-body-sm font-semibold uppercase tracking-wide text-white/70">
                  {period.quickPeriod === "today" ? t("heroTotal.titleToday") : t("heroTotal.titlePeriod", { period: t(`periods.${period.quickPeriod}`) })}
                </p>
                <p className="mt-2 text-h1 font-bold tabular-nums">{formatMoney(format, block.monetaryValue, block.currencyCode)}</p>
              </Card>
            ))}
          </div>
        )
      )}

      <Alert tone="info">{t("banner")}</Alert>
      {showComparison && <DailySummaryCard data={data} comparisonData={comparison.data} weeklyAverageData={last7Days.data} />}
      {error && <Alert tone="error">{error}</Alert>}

      {data && data.incompletePricingStationCount > 0 && (
        <Card className="border-l-4 border-l-warning">
          <div className="flex items-center gap-2 text-body-sm text-text">
            <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
            {t("incompletePricingBanner", { count: data.incompletePricingStationCount })}
          </div>
        </Card>
      )}

      {loading || stationsList.loading ? (
        <Stack gap="lg">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </div>
          <Card>
            <ListSkeleton rows={6} />
          </Card>
        </Stack>
      ) : allRows.length === 0 ? (
        <Alert tone="warning">{t("noData")}</Alert>
      ) : (
        <>
          <Card>
            <StationsFilterBar
              statusLabel={t("filters.confidence")}
              statusValue={confidenceFilter}
              onStatusChange={(v) => setConfidenceFilter(v as ConfidenceFilter)}
              statusOptions={confidenceOptions.map((v) => ({ value: v, label: v === "all" ? t("filters.confidenceAll") : t(`confidence.${v}`) }))}
              cityLabel={t("filters.city")}
              cityAllLabel={t("filters.cityAll")}
              cityFilter={cityFilter}
              onCityFilterChange={setCityFilter}
              cities={stationsList.cities}
              productLabel={t("filters.product")}
              productAllLabel={t("filters.productAll")}
              productFilter={productFilter}
              onProductFilterChange={setProductFilter}
              fuelProducts={stationsList.fuelProducts}
              sortLabel={t("filters.sortBy")}
              sortValue={sortBy}
              onSortChange={(v) => setSortBy(v as CaisseSortBy)}
              sortOptions={sortOptions.map((v) => ({ value: v, label: t(`filters.sortOptions.${v}`) }))}
              searchPlaceholder={t("filters.searchPlaceholder")}
              search={search}
              onSearchChange={setSearch}
            />
          </Card>

          <CashSummaryCards
            productBlocks={filteredProductBlocks}
            currencyBlocks={filteredCurrencyBlocks}
            onProductClick={setOpenProductBlock}
            onTotalClick={setOpenBlock}
          />

          {filteredRows.length === 0 ? (
            <EmptyState title={t("noResultsFiltered")} actionLabel={t("clearFilters")} onAction={clearFilters} />
          ) : (
            <CaisseStationsTable rows={filteredRows} cityById={cityById} onRowClick={setOpenStationRow} />
          )}
        </>
      )}

      {data?.lastMeasurementAt && (
        <p className="text-caption text-text-muted">
          {t("lastUpdate", { time: format.dateTime(new Date(data.lastMeasurementAt), { hour: "2-digit", minute: "2-digit" }) })}
        </p>
      )}

      <NetworkCashModal
        open={openBlock !== null}
        onOpenChange={(next) => !next && setOpenBlock(null)}
        organizationId={currentOrganization?.id ?? ""}
        block={openBlock}
        title={openBlock ? t("networkModal.title", { currency: openBlock.currencyCode }) : ""}
        fromDate={period.fromDate}
        toDate={period.toDate}
        mode={period.mode}
      />

      <NetworkCashModal
        open={openProductBlock !== null}
        onOpenChange={(next) => !next && setOpenProductBlock(null)}
        organizationId={currentOrganization?.id ?? ""}
        block={openProductBlock}
        title={openProductBlock ? t("networkModal.productTitle", { product: openProductBlock.fuelProductName, currency: openProductBlock.currencyCode ?? "—" }) : ""}
        fromDate={period.fromDate}
        toDate={period.toDate}
        mode={period.mode}
      />

      <StationCashCardsModal
        open={openStationRow !== null}
        onOpenChange={(next) => !next && setOpenStationRow(null)}
        organizationId={currentOrganization?.id ?? ""}
        row={openStationRow}
        fromDate={period.fromDate}
        toDate={period.toDate}
        mode={period.mode}
      />
    </Stack>
  );
}
