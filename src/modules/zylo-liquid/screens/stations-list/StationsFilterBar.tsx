"use client";

import { Search } from "lucide-react";

import type { City, FuelProduct } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, type BadgeProps, Input, SearchableSelect } from "@/shared/ui";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterBadge {
  key: string;
  label: string;
  active: boolean;
  onToggle: () => void;
  tone?: BadgeProps["tone"];
}

interface StationsFilterBarProps {
  /** Rangée de badges toggle au-dessus des filtres (ex. "X actives") —
   * omise si non fournie, un contexte comme la Caisse n'a pas forcément de
   * badges d'état de cuve pertinents. */
  badges?: FilterBadge[];
  statusLabel: string;
  statusValue: string;
  onStatusChange: (value: string) => void;
  statusOptions: FilterOption[];
  cityLabel: string;
  cityAllLabel: string;
  cityFilter: string;
  onCityFilterChange: (value: string) => void;
  cities: City[];
  productLabel: string;
  productAllLabel: string;
  productFilter: string;
  onProductFilterChange: (value: string) => void;
  fuelProducts: FuelProduct[];
  sortLabel: string;
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: FilterOption[];
  searchPlaceholder: string;
  search: string;
  onSearchChange: (value: string) => void;
}

/** Barre de badges + filtres + recherche, factorisée pour être réutilisée à
 * l'identique (même comportement, jamais deux implémentations divergentes)
 * partout où une liste de stations doit être filtrée — page Stations, son
 * modal carte, et la page Caisse (ventes du jour par station). Entièrement
 * agnostique de l'i18n et du vocabulaire d'un filtre donné : tous les
 * libellés/options sont résolus par l'appelant (ex. "statut" veut dire
 * "état de la cuve" sur Stations mais "confiance du calcul" sur Caisse). */
export function StationsFilterBar({
  badges,
  statusLabel,
  statusValue,
  onStatusChange,
  statusOptions,
  cityLabel,
  cityAllLabel,
  cityFilter,
  onCityFilterChange,
  cities,
  productLabel,
  productAllLabel,
  productFilter,
  onProductFilterChange,
  fuelProducts,
  sortLabel,
  sortValue,
  onSortChange,
  sortOptions,
  searchPlaceholder,
  search,
  onSearchChange,
}: StationsFilterBarProps) {
  return (
    <>
      {badges && badges.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge key={badge.key} tone={badge.active ? (badge.tone ?? "neutral") : "neutral"} dot className="cursor-pointer" onClick={badge.onToggle}>
              {badge.label}
            </Badge>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-44">
          <SearchableSelect aria-label={statusLabel} value={statusValue} onValueChange={onStatusChange} options={statusOptions} />
        </div>
        <div className="w-full sm:w-44">
          <SearchableSelect
            aria-label={cityLabel}
            value={cityFilter || undefined}
            onValueChange={(v) => onCityFilterChange(v === "__all__" ? "" : v)}
            placeholder={cityAllLabel}
            options={[{ value: "__all__", label: cityAllLabel }, ...cities.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        <div className="w-full sm:w-44">
          <SearchableSelect
            aria-label={productLabel}
            value={productFilter || undefined}
            onValueChange={(v) => onProductFilterChange(v === "__all__" ? "" : v)}
            placeholder={productAllLabel}
            options={[{ value: "__all__", label: productAllLabel }, ...fuelProducts.map((p) => ({ value: p.id, label: p.name }))]}
          />
        </div>
        <div className="w-full sm:w-44">
          <SearchableSelect aria-label={sortLabel} value={sortValue} onValueChange={onSortChange} options={sortOptions} />
        </div>
        <div className="min-w-[200px] flex-1">
          <Input icon={<Search className="size-4" aria-hidden />} placeholder={searchPlaceholder} value={search} onChange={(e) => onSearchChange(e.target.value)} aria-label={searchPlaceholder} />
        </div>
      </div>
    </>
  );
}
