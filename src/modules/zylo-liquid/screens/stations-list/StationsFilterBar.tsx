"use client";

import { Search } from "lucide-react";

import type { City, FuelProduct } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, Input, Select } from "@/shared/ui";

export type StationsStatusFilter = "all" | "online" | "offline" | "alert" | "critical";
export type StationsSortBy = "criticality" | "name" | "lowestLevel" | "highestValue" | "oldestSync";

interface StationsFilterBarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, any>) => string;
  statusFilter: StationsStatusFilter;
  onStatusFilterChange: (value: StationsStatusFilter) => void;
  badgeActive: boolean;
  onBadgeActiveToggle: () => void;
  activeCount: number;
  badgeOffline: boolean;
  onBadgeOfflineToggle: () => void;
  offlineCount: number;
  badgeAlerts: boolean;
  onBadgeAlertsToggle: () => void;
  activeAlertsCount: number;
  cityFilter: string;
  onCityFilterChange: (value: string) => void;
  cities: City[];
  productFilter: string;
  onProductFilterChange: (value: string) => void;
  fuelProducts: FuelProduct[];
  sortBy: StationsSortBy;
  onSortByChange: (value: StationsSortBy) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

/** Barre de badges + filtres + recherche de la page Stations, factorisée pour
 * être utilisée à l'identique (même état, même comportement) sur la page et
 * dans le modal "Carte du réseau" — jamais deux implémentations divergentes
 * du même filtrage. */
export function StationsFilterBar({
  t,
  statusFilter,
  onStatusFilterChange,
  badgeActive,
  onBadgeActiveToggle,
  activeCount,
  badgeOffline,
  onBadgeOfflineToggle,
  offlineCount,
  badgeAlerts,
  onBadgeAlertsToggle,
  activeAlertsCount,
  cityFilter,
  onCityFilterChange,
  cities,
  productFilter,
  onProductFilterChange,
  fuelProducts,
  sortBy,
  onSortByChange,
  search,
  onSearchChange,
}: StationsFilterBarProps) {
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone={badgeActive ? "success" : "neutral"} dot className="cursor-pointer" onClick={onBadgeActiveToggle}>
          {t("list.badges.active", { count: activeCount })}
        </Badge>
        <Badge tone={badgeOffline ? "neutral" : "neutral"} dot className="cursor-pointer border border-border" onClick={onBadgeOfflineToggle}>
          {t("list.badges.offline", { count: offlineCount })}
        </Badge>
        <Badge tone={badgeAlerts ? "warning" : "neutral"} dot className="cursor-pointer" onClick={onBadgeAlertsToggle}>
          {t("list.badges.alerts", { count: activeAlertsCount })}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-44">
          <Select
            aria-label={t("list.filters.status")}
            value={statusFilter}
            onValueChange={(v) => onStatusFilterChange(v as StationsStatusFilter)}
            options={(["all", "online", "offline", "alert", "critical"] as StationsStatusFilter[]).map((v) => ({ value: v, label: t(`list.filters.statusOptions.${v}`) }))}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label={t("list.filters.city")}
            value={cityFilter || undefined}
            onValueChange={(v) => onCityFilterChange(v === "__all__" ? "" : v)}
            placeholder={t("list.filters.cityAll")}
            options={[{ value: "__all__", label: t("list.filters.cityAll") }, ...cities.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label={t("list.filters.product")}
            value={productFilter || undefined}
            onValueChange={(v) => onProductFilterChange(v === "__all__" ? "" : v)}
            placeholder={t("list.filters.productAll")}
            options={[{ value: "__all__", label: t("list.filters.productAll") }, ...fuelProducts.map((p) => ({ value: p.id, label: p.name }))]}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label={t("list.filters.sortBy")}
            value={sortBy}
            onValueChange={(v) => onSortByChange(v as StationsSortBy)}
            options={(["criticality", "name", "lowestLevel", "highestValue", "oldestSync"] as StationsSortBy[]).map((v) => ({ value: v, label: t(`list.filters.sortOptions.${v}`) }))}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <Input icon={<Search className="size-4" aria-hidden />} placeholder={t("list.searchPlaceholder")} value={search} onChange={(e) => onSearchChange(e.target.value)} aria-label={t("list.searchPlaceholder")} />
        </div>
      </div>
    </>
  );
}
