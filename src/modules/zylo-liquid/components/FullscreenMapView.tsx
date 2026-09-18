"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { StationsMap, type StationMapPoint } from "./StationsMap";

export interface FullscreenMapViewProps {
  open: boolean;
  onClose: () => void;
  closeLabel: string;
  stations: StationMapPoint[];
  onStationClick?: (stationId: string) => void;
  focusStationId?: string | null;
  /** Contenu flottant par-dessus la carte (filtres, panneau de liste...) —
   * chaque appelant place ses propres blocs `absolute`, le composant ne
   * connaît que le mécanisme plein-fenêtre lui-même. */
  sidePanel?: React.ReactNode;
}

/** Vue carte plein-fenêtre partagée — la carte devient le fond de toute la
 * fenêtre du navigateur (pas la Fullscreen API du navigateur, un simple
 * overlay CSS `fixed inset-0`), Échap ou le bouton fermer pour en sortir.
 * Extrait de `StationsListScreen` (seul endroit qui l'avait jusqu'ici) pour
 * être réutilisé tel quel par le tableau de bord réseau — un seul rendu,
 * jamais une deuxième implémentation qui pourrait diverger. */
export function FullscreenMapView({ open, onClose, closeLabel, stations, onStationClick, focusStationId, sidePanel }: FullscreenMapViewProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-surface">
      <div className="absolute inset-0">
        <StationsMap fill onStationClick={onStationClick} focusStationId={focusStationId} stations={stations} />
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full border border-border-subtle bg-surface text-text-muted shadow-elevated hover:bg-surface-muted hover:text-text"
      >
        <X className="size-4" aria-hidden />
      </button>

      {sidePanel}
    </div>
  );
}
