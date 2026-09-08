"use client";

import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { City, Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Checkbox, Input } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

interface CityGroup {
  cityId: string | null;
  cityName: string;
  stations: Station[];
}

interface CountryGroup {
  countryId: string | null;
  countryName: string;
  cities: CityGroup[];
}

const UNGROUPED_KEY = "__ungrouped__";

/** Sélecteur de station unique, réutilisé partout où une station doit être
 * choisie (page_configuration.md — audit de la section Configuration
 * carburant) : recherche texte + regroupement par pays > ville, au lieu
 * d'une liste plate. Remplace les listes plates ad hoc (formulaire prix
 * individuel, BulkPriceModal, ProductStationsToggle) par une seule brique.
 * Reste agnostique du métier de l'appelant : ne sait rien de "prix" ou de
 * "produit", seulement "stations" et "villes". */
interface BaseProps {
  stations: Station[];
  cities: City[];
  /** Rendu optionnel d'un indicateur par station (ex. badge "prix manquant") — l'appelant reste seul responsable de son sens métier. */
  renderStationExtra?: (station: Station) => React.ReactNode;
  className?: string;
}

interface SingleProps extends BaseProps {
  mode: "single";
  value: string | null;
  onChange: (stationId: string) => void;
}

interface MultipleProps extends BaseProps {
  mode: "multiple";
  selected: Set<string>;
  onToggle: (stationId: string) => void;
}

export type StationPickerProps = SingleProps | MultipleProps;

function buildGroups(stations: Station[], cities: City[]): CountryGroup[] {
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const countryGroups = new Map<string, CountryGroup>();

  for (const station of stations) {
    const city = station.cityId ? cityById.get(station.cityId) : undefined;
    const countryKey = city?.countryId ?? UNGROUPED_KEY;
    const countryGroup = countryGroups.get(countryKey) ?? {
      countryId: city?.countryId ?? null,
      countryName: city?.countryName ?? "",
      cities: [],
    };
    if (!countryGroups.has(countryKey)) countryGroups.set(countryKey, countryGroup);

    const cityKey = city?.id ?? UNGROUPED_KEY;
    let cityGroup = countryGroup.cities.find((g) => (g.cityId ?? UNGROUPED_KEY) === cityKey);
    if (!cityGroup) {
      cityGroup = { cityId: city?.id ?? null, cityName: city?.name ?? "", stations: [] };
      countryGroup.cities.push(cityGroup);
    }
    cityGroup.stations.push(station);
  }

  return [...countryGroups.values()].sort((a, b) => a.countryName.localeCompare(b.countryName));
}

export function StationPicker(props: StationPickerProps) {
  const t = useTranslations("zyloLiquid.stationPicker");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => buildGroups(props.stations, props.cities), [props.stations, props.cities]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => ({
        ...group,
        cities: group.cities
          .map((city) => ({ ...city, stations: city.stations.filter((s) => s.name.toLowerCase().includes(normalizedQuery) || s.code.toLowerCase().includes(normalizedQuery)) }))
          .filter((city) => city.stations.length > 0),
      }))
      .filter((group) => group.cities.length > 0);
  }, [groups, normalizedQuery]);

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function countryStationIds(group: CountryGroup): string[] {
    return group.cities.flatMap((c) => c.stations.map((s) => s.id));
  }

  return (
    <div className={cn("flex flex-col gap-2", props.className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} className="pl-8" />
      </div>

      <div className="max-h-72 overflow-y-auto rounded-input border border-border">
        {filteredGroups.length === 0 && <p className="p-3 text-body-sm text-text-muted">{t("noResults")}</p>}
        {filteredGroups.map((group) => {
          const key = group.countryId ?? UNGROUPED_KEY;
          const isCollapsed = collapsed.has(key);
          const stationIds = countryStationIds(group);
          const allSelected = props.mode === "multiple" && stationIds.every((id) => props.selected.has(id));
          const someSelected = props.mode === "multiple" && stationIds.some((id) => props.selected.has(id));

          return (
            <div key={key} className="border-b border-border-subtle last:border-b-0">
              <div className="flex items-center gap-2 bg-surface-muted px-2 py-1.5">
                <button type="button" onClick={() => toggleCollapsed(key)} className="flex items-center gap-1.5 text-body-sm font-semibold text-text">
                  {isCollapsed ? <ChevronRight className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
                  {group.countryName || t("ungrouped")}
                </button>
                {props.mode === "multiple" && (
                  <label className="ml-auto flex items-center gap-1.5 text-caption text-text-muted">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => stationIds.forEach((id) => (allSelected ? props.selected.has(id) : !props.selected.has(id)) && props.onToggle(id))}
                    />
                    {t("selectAllInCountry")}
                  </label>
                )}
              </div>
              {!isCollapsed &&
                group.cities.map((city) => (
                  <div key={city.cityId ?? UNGROUPED_KEY} className="px-2 py-1">
                    <p className="px-1 py-0.5 text-caption font-medium text-text-muted">{city.cityName || t("ungroupedCity")}</p>
                    {city.stations.map((station) =>
                      props.mode === "single" ? (
                        <button
                          key={station.id}
                          type="button"
                          onClick={() => props.onChange(station.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-input px-2 py-1.5 text-left text-body-sm",
                            props.value === station.id ? "bg-primary-muted text-primary" : "text-text hover:bg-surface-muted"
                          )}
                        >
                          <span>{station.name}</span>
                          {props.renderStationExtra?.(station)}
                        </button>
                      ) : (
                        <div key={station.id} className="flex items-center justify-between gap-2 rounded-input px-2 py-1 hover:bg-surface-muted">
                          <Checkbox name={station.id} checked={props.selected.has(station.id)} onChange={() => props.onToggle(station.id)} label={station.name} className="flex-1" />
                          {props.renderStationExtra?.(station)}
                        </div>
                      )
                    )}
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
