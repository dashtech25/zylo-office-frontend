"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";

/** Palette proposée par défaut — sélectionnée pour éviter toute teinte
 * rougeâtre (réservée ailleurs dans l'app à l'indicateur de stock bas,
 * voir `isReservedRed` ci-dessous). Un champ hexadécimal libre reste
 * disponible pour un besoin hors palette, avec le même contrôle appliqué
 * côté client avant envoi (le backend valide de toute façon la même
 * règle : ne jamais compter uniquement sur la validation frontend). */
const DEFAULT_SWATCHES = [
  "#2563EB", "#0EA5E9", "#14B8A6", "#22C55E", "#84CC16",
  "#EAB308", "#F97316", "#A855F7", "#8B5CF6", "#EC4899",
  "#64748B", "#0F172A",
];

/** Réplique côté client la règle backend (`_reject_reserved_red`,
 * `schemas.py`) : rejette toute teinte perçue comme rouge, pas seulement
 * le rouge exact réservé à l'alerte stock bas. */
export function isReservedRed(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return false;
  const d = max - min;
  const saturation = lightness > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  return saturation > 0.25 && lightness > 0.15 && lightness < 0.85 && (hue <= 20 || hue >= 340);
}

export interface ColorPickerProps {
  value: string | null;
  onChange: (hex: string) => void;
  swatches?: string[];
  reservedColorMessage?: string;
  "aria-label"?: string;
}

/** Sélecteur de couleur visuel — remplace un `<Input>` texte où l'utilisateur
 * devait taper un code hexadécimal à la main. Générique, sans connaissance
 * métier : la contrainte "pas de rouge" est fournie par l'appelant via
 * `swatches` (déjà exclue par défaut ici) et vérifiée par `isReservedRed`
 * pour la saisie libre, pas imposée dans ce composant lui-même. */
export function ColorPicker({ value, onChange, swatches = DEFAULT_SWATCHES, reservedColorMessage, "aria-label": ariaLabel }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState(value ?? "");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
        {swatches.map((hex) => {
          const selected = value?.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => {
                onChange(hex);
                setCustomHex(hex);
              }}
              className={cn(
                "flex size-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                selected ? "border-text" : "border-transparent"
              )}
              style={{ backgroundColor: hex }}
              aria-label={hex}
              aria-pressed={selected}
            >
              {selected && <Check className="size-4 text-white drop-shadow" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <span className="size-6 shrink-0 rounded-full border border-border" style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : "transparent" }} />
        <input
          type="text"
          value={customHex}
          onChange={(e) => {
            const next = e.target.value;
            setCustomHex(next);
            if (/^#[0-9a-fA-F]{6}$/.test(next) && !isReservedRed(next)) onChange(next);
          }}
          placeholder="#1D4ED8"
          maxLength={7}
          className="h-8 w-28 rounded-input border border-border bg-surface px-2 font-mono text-body-sm text-text"
        />
        {reservedColorMessage && /^#[0-9a-fA-F]{6}$/.test(customHex) && isReservedRed(customHex) && (
          <span className="text-caption text-error">{reservedColorMessage}</span>
        )}
      </div>
    </div>
  );
}
