"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { normalizeSearchText } from "@/shared/lib/normalizeSearchText";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
  /** Force l'affichage (`true`) ou le masquage (`false`) de la barre de
   * recherche intégrée. Par défaut, affichée automatiquement au-delà de
   * `SEARCH_THRESHOLD` options — jamais utile ni demandé pour une poignée
   * de choix (P2 §5.5, audit module Stations 2026-09-16). */
  searchable?: boolean;
  /** `shared/ui` ne dépend d'aucun système d'i18n (composants
   * présentationnels, labels toujours fournis par l'appelant — même
   * convention que `closeLabel` sur `Modal`) : ces deux textes ont donc une
   * valeur par défaut neutre, à surcharger par l'appelant pour les
   * traduire. */
  searchPlaceholder?: string;
  noResultsLabel?: string;
}

const SEARCH_THRESHOLD = 6;

/** Select accessible (clavier, aria) — remplace le pattern <select> natif
 * stylé / Dropdown maison observé chez AlloTech (§12 du rapport signale
 * l'absence de navigation clavier sur son Dropdown maison). Barre de
 * recherche intégrée, factorisée ici une seule fois plutôt que traitée au
 * cas par cas écran par écran (P2 §5.5, audit module Stations 2026-09-16) —
 * tout appelant existant en bénéficie automatiquement sans changement de
 * signature, dès que sa liste d'options dépasse `SEARCH_THRESHOLD`.
 *
 * Hauteur maximale sur le Viewport (2026-09-18, retour terrain : la liste
 * des devises — ~180 entrées — débordait sans fin hors de l'écran, aucune
 * limite n'existait) : seul endroit de toute l'application qui rend une
 * liste déroulante (39 usages, aucun <select> natif ailleurs) — cette
 * correction unique s'applique donc automatiquement partout, jamais un
 * correctif écran par écran. */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled,
  invalid,
  "aria-label": ariaLabel,
  searchable,
  searchPlaceholder = "Search...",
  noResultsLabel = "No results",
}: SelectProps) {
  const [query, setQuery] = useState("");
  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;

  const filteredOptions = useMemo(() => {
    if (!showSearch || !query.trim()) return options;
    const normalizedQuery = normalizeSearchText(query.trim());
    return options.filter((o) => normalizeSearchText(o.label).includes(normalizedQuery));
  }, [options, query, showSearch]);

  return (
    <RadixSelect.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
    >
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        aria-invalid={invalid}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-input border border-border bg-surface px-3 text-body-md text-text",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:bg-surface-muted disabled:text-text-disabled disabled:cursor-not-allowed",
          "data-[placeholder]:text-text-disabled",
          invalid && "border-error focus-visible:border-error focus-visible:ring-error/30"
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="size-4 text-text-muted" aria-hidden />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-50 overflow-hidden rounded-card border border-border bg-surface shadow-elevated"
          position="popper"
          sideOffset={4}
        >
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-border-subtle px-2 py-1.5">
              <Search className="size-3.5 shrink-0 text-text-muted" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                // Radix intercepte les touches pour son typeahead natif —
                // sans ce blocage, taper dans le champ ferait aussi défiler
                // la liste vers l'option correspondant à la 1re lettre
                // tapée. Laisse passer Escape/flèches/Entrée (navigation
                // normale du menu), bloque uniquement les autres touches.
                onKeyDown={(e) => {
                  if (!["Escape", "ArrowDown", "ArrowUp", "Enter"].includes(e.key)) e.stopPropagation();
                }}
                placeholder={searchPlaceholder}
                className="w-full border-none bg-transparent text-body-sm text-text outline-none placeholder:text-text-disabled"
              />
            </div>
          )}
          <RadixSelect.Viewport className="max-h-72 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-body-sm text-text-muted">{noResultsLabel}</div>
            ) : (
              filteredOptions.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-button py-2 pl-8 pr-3 text-body-md text-text outline-none",
                    "data-[highlighted]:bg-primary-muted data-[highlighted]:text-primary",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  )}
                >
                  <RadixSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                    <Check className="size-4" aria-hidden />
                  </RadixSelect.ItemIndicator>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))
            )}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
