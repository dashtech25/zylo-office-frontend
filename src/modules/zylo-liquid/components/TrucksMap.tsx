"use client";

import { Layers } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";

export type TruckMapStatus = "moving" | "stopped" | "unknown";

export interface MapStyleOption {
  id: string;
  label: string;
  url: string;
}

/** Styles Mapbox proposés au sélecteur de couches (mission « tracking »,
 * étape 1 — demande explicite du commanditaire : « il faut proposer
 * plusieurs mode, tout les mode que notre fournisseur propose »). Liste
 * des styles standards publiés par Mapbox — jamais un style inventé. */
export const MAPBOX_STYLE_OPTIONS: MapStyleOption[] = [
  { id: "streets", label: "Rues", url: "mapbox://styles/mapbox/streets-v12" },
  { id: "outdoors", label: "Plein air", url: "mapbox://styles/mapbox/outdoors-v12" },
  { id: "light", label: "Clair", url: "mapbox://styles/mapbox/light-v11" },
  { id: "dark", label: "Sombre", url: "mapbox://styles/mapbox/dark-v11" },
  { id: "satellite", label: "Satellite", url: "mapbox://styles/mapbox/satellite-v9" },
  { id: "satellite-streets", label: "Satellite + rues", url: "mapbox://styles/mapbox/satellite-streets-v12" },
  { id: "nav-day", label: "Navigation (jour)", url: "mapbox://styles/mapbox/navigation-day-v1" },
  { id: "nav-night", label: "Navigation (nuit)", url: "mapbox://styles/mapbox/navigation-night-v1" },
];

const DEFAULT_STYLE = MAPBOX_STYLE_OPTIONS[0]!;

export interface TruckMapPoint {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  status: TruckMapStatus;
}

export interface TruckMapStop {
  latitude: number;
  longitude: number;
  durationLabel: string;
}

const STATUS_COLOR: Record<TruckMapStatus, string> = {
  moving: "#1F9D55",
  stopped: "#D97706",
  unknown: "#6B7280",
};

const ROUTE_SOURCE_ID = "truck-route";
const ROUTE_LAYER_ID = "truck-route-line";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** Carte de tracking des camions-citernes (mission « tracking », étape 1
 * — position + arrêts sur carte, 2026-09-11) — même composant mapbox que
 * `StationsMap`, étendu pour un tracé de trajet (polyligne) et des
 * marqueurs d'arrêt avec durée au clic. Camions sans position connue
 * (aucun boîtier, ou aucune position encore reçue) silencieusement omis
 * — jamais positionnés à une coordonnée inventée. */
export function TrucksMap({
  trucks,
  route,
  stops,
  height = 480,
  selectedTruckId,
  onTruckClick,
}: {
  trucks: TruckMapPoint[];
  /** Trajet du camion sélectionné — [longitude, latitude][] triés
   * chronologiquement, ou absent/vide si aucun camion sélectionné. */
  route?: [number, number][];
  stops?: TruckMapStop[];
  height?: number | string;
  selectedTruckId?: string | null;
  onTruckClick?: (truckId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const stopMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [styleOption, setStyleOption] = useState<MapStyleOption>(DEFAULT_STYLE);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: DEFAULT_STYLE.url,
      center: [9.7, 4.05],
      zoom: 5,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  const appliedStyleIdRef = useRef<string>(DEFAULT_STYLE.id);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedStyleIdRef.current === styleOption.id) return;
    appliedStyleIdRef.current = styleOption.id;
    map.setStyle(styleOption.url);
  }, [styleOption]);

  useEffect(() => {
    const maybeMap = mapRef.current;
    if (!maybeMap || !token) return;
    const map: mapboxgl.Map = maybeMap;

    function placeMarkers() {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupsRef.current.forEach((p) => p.remove());
      popupsRef.current = [];

      const bounds = new mapboxgl.LngLatBounds();
      let hasBounds = false;
      trucks.forEach((t) => {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", t.label);
        const selected = t.id === selectedTruckId;
        el.style.width = selected ? "20px" : "16px";
        el.style.height = selected ? "20px" : "16px";
        el.style.borderRadius = "50%";
        el.style.border = selected ? "3px solid #1D4ED8" : "2px solid white";
        el.style.boxShadow = "0 0 0 1px rgba(0,0,0,.15)";
        el.style.background = STATUS_COLOR[t.status];
        el.style.cursor = "pointer";
        el.onclick = () => onTruckClick?.(t.id);

        const popup = new mapboxgl.Popup({ offset: 12, closeButton: false, closeOnClick: false }).setLngLat([t.longitude, t.latitude]);
        popup.setHTML(`<div style="font-weight:600;">${escapeHtml(t.label)}</div>`);
        el.addEventListener("mouseenter", () => popup.addTo(map));
        el.addEventListener("mouseleave", () => popup.remove());
        popupsRef.current.push(popup);

        const marker = new mapboxgl.Marker({ element: el }).setLngLat([t.longitude, t.latitude]).addTo(map);
        markersRef.current.push(marker);
        bounds.extend([t.longitude, t.latitude]);
        hasBounds = true;
      });
      if (hasBounds && !route?.length) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 0 });
      }
    }

    function placeRoute() {
      const existingSource = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: route && route.length > 1 ? route : [] },
      };
      if (existingSource) {
        existingSource.setData(geojson);
      } else {
        map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: geojson });
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#1D4ED8", "line-width": 3, "line-opacity": 0.7 },
        });
      }

      stopMarkersRef.current.forEach((m) => m.remove());
      stopMarkersRef.current = [];
      (stops ?? []).forEach((stop) => {
        const el = document.createElement("div");
        el.style.width = "12px";
        el.style.height = "12px";
        el.style.borderRadius = "3px";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 0 0 1px rgba(0,0,0,.2)";
        el.style.background = "#D97706";
        const popup = new mapboxgl.Popup({ offset: 10, closeButton: false, closeOnClick: false }).setLngLat([stop.longitude, stop.latitude]);
        popup.setText(stop.durationLabel);
        el.addEventListener("mouseenter", () => popup.addTo(map));
        el.addEventListener("mouseleave", () => popup.remove());
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([stop.longitude, stop.latitude]).addTo(map);
        stopMarkersRef.current.push(marker);
      });

      if (route && route.length > 1) {
        const bounds = route.reduce((b, coord) => b.extend(coord), new mapboxgl.LngLatBounds(route[0], route[0]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
      }
    }

    function placeAll() {
      placeMarkers();
      placeRoute();
    }

    if (map.loaded()) placeAll();
    else map.once("load", placeAll);
    // Un changement de style (sélecteur de couches) recharge le style
    // Mapbox et efface sources/couches/marqueurs — il faut tout replacer.
    map.on("style.load", placeAll);
    return () => {
      map.off("style.load", placeAll);
    };
  }, [trucks, route, stops, selectedTruckId, token, onTruckClick]);

  function recenter() {
    const map = mapRef.current;
    if (!map) return;
    const points = trucks.length ? trucks.map((t) => [t.longitude, t.latitude] as [number, number]) : route;
    if (!points || points.length === 0) return;
    const bounds = points.reduce((b, coord) => b.extend(coord), new mapboxgl.LngLatBounds(points[0], points[0]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 300 });
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center rounded-card border border-dashed border-border-subtle text-body-sm text-text-muted" style={{ height }}>
        Carte indisponible — jeton Mapbox non configuré.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height }}>
      <div ref={containerRef} style={{ height: "100%", borderRadius: "var(--radius-card, 8px)", overflow: "hidden" }} />

      <button
        type="button"
        onClick={recenter}
        title="Recentrer"
        aria-label="Recentrer la carte"
        style={{
          position: "absolute", top: 84, right: 10, width: 29, height: 29, borderRadius: 4,
          background: "#fff", border: "none", boxShadow: "0 0 0 2px rgba(0,0,0,.1)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
        </svg>
      </button>

      <div style={{ position: "absolute", top: 122, right: 10 }}>
        <button
          type="button"
          onClick={() => setStyleMenuOpen((v) => !v)}
          title="Fond de carte"
          aria-label="Choisir le fond de carte"
          style={{
            width: 29, height: 29, borderRadius: 4, background: "#fff", border: "none",
            boxShadow: "0 0 0 2px rgba(0,0,0,.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <Layers size={15} color="#333" />
        </button>
        {styleMenuOpen && (
          <div
            style={{
              position: "absolute", top: 34, right: 0, background: "#fff", borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,.18)", padding: 6, minWidth: 168, zIndex: 20,
            }}
          >
            {MAPBOX_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setStyleOption(opt);
                  setStyleMenuOpen(false);
                }}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "6px 10px", borderRadius: 6,
                  fontSize: 13, border: "none", cursor: "pointer",
                  background: opt.id === styleOption.id ? "rgba(29,78,216,.1)" : "transparent",
                  color: opt.id === styleOption.id ? "#1D4ED8" : "#1f2937",
                  fontWeight: opt.id === styleOption.id ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
