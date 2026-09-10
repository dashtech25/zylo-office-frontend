"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Ligne secondaire affichée sous le libellé (ex. "Gasoil · 20 000 L de
   * capacité · 5 000 L disponible") — aussi incluse dans la recherche,
   * pour retrouver une cuve en tapant son produit plutôt que son nom. */
  description?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
}

/** Select avec recherche en direct (filtre libellé + description) —
 * `@radix-ui/react-select` ne le permet pas nativement et le projet n'a
 * pas de dépendance combobox. Même pattern « présentationnel, pas de
 * portail » que `DropdownMenu` (menu ancré au trigger, fermeture au clic
 * extérieur) plutôt qu'une nouvelle dépendance pour un unique besoin.
 * Mission « formulaire de commande intelligent », 2026-09-10 — Commande
 * (cuve/produit), réutilisable partout ailleurs où une liste devient
 * longue. */
export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  invalid,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) searchInputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(normalized) || (o.description ?? "").toLowerCase().includes(normalized)
    );
  }, [options, query]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-input border border-border bg-surface px-3 text-body-md text-text",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:bg-surface-muted disabled:text-text-disabled disabled:cursor-not-allowed",
          invalid && "border-error focus-visible:border-error focus-visible:ring-error/30"
        )}
      >
        <span className={cn("truncate text-left", !selected && "text-text-disabled")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-text-muted" aria-hidden />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[280px] rounded-card border border-border bg-surface shadow-elevated">
          <div className="relative border-b border-border-subtle p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-input border border-border bg-surface pl-8 pr-2 text-body-sm text-text placeholder:text-text-disabled focus-visible:outline-none focus-visible:border-primary"
            />
          </div>
          <div role="listbox" className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-body-sm text-text-muted">{emptyLabel}</p>
            )}
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                onClick={() => {
                  onValueChange?.(option.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-button px-3 py-2 text-left transition-colors",
                  "hover:bg-primary-muted hover:text-primary",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
              >
                <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center">
                  {option.value === value && <Check className="size-4" aria-hidden />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body-md text-text">{option.label}</span>
                  {option.description && <span className="truncate text-caption text-text-muted">{option.description}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
