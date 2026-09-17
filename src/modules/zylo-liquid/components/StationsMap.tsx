"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export type StationMapStatus = "online" | "alert" | "critical" | "offline";

export interface StationMapPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: StationMapStatus;
  /** Ligne supplémentaire de la fiche au survol (ex. volume vendable),
   * déjà formatée par l'appelant (agnostique de l'i18n/formatage) — absente
   * pour les usages qui n'ont pas cette donnée (ex. carte d'une seule
   * station), auquel cas le popup se limite au nom. */
  popupSubtitle?: string;
  /** Produits vendus par la station, déjà formatés par l'appelant (ex.
   * "Diesel, Super"), affichés en permanence sous le nom dans l'étiquette du
   * marqueur (demande commanditaire 2026-09-17 : identifier chaque station
   * sans avoir à cliquer dessus). */
  productsLabel?: string;
  /** Statut opérationnel déclaré (`Station.status`, décision humaine —
   * jamais déduit des horaires, cf. StationDetailScreen.tsx), déjà traduit
   * par l'appelant. */
  operationalLabel?: string;
  operationalTone?: "success" | "warning" | "neutral";
  /** Connectivité télémétrie (capteurs), déjà traduite par l'appelant. */
  connectivityLabel?: string;
  connected?: boolean;
  /** Nombre d'alertes actives ; badge affiché seulement si > 0. */
  alertsCount?: number;
  alertsLabel?: string;
}

const STATUS_COLOR: Record<StationMapStatus, string> = {
  online: "#1F9D55",
  alert: "#D97706",
  critical: "#DC2626",
  offline: "#6B7280",
};

const TONE_COLOR: Record<"success" | "warning" | "neutral", string> = {
  success: "#1F9D55",
  warning: "#D97706",
  neutral: "#6B7280",
};

// Fonds de carte proposés au choix (demande commanditaire 2026-09-17 : "le
// filtre par défaut c'est satellite rue [...] permettre de choisir le
// filtre nous-mêmes") — satellite+rues est le style par défaut à l'ouverture.
const MAP_STYLES: { id: string; label: string; url: string }[] = [
  { id: "satellite-streets", label: "Satellite + rues", url: "mapbox://styles/mapbox/satellite-streets-v12" },
  { id: "streets", label: "Rues", url: "mapbox://styles/mapbox/streets-v12" },
  { id: "satellite", label: "Satellite", url: "mapbox://styles/mapbox/satellite-v9" },
  { id: "outdoors", label: "Extérieur", url: "mapbox://styles/mapbox/outdoors-v12" },
  { id: "light", label: "Clair", url: "mapbox://styles/mapbox/light-v11" },
  { id: "dark", label: "Sombre", url: "mapbox://styles/mapbox/dark-v11" },
];
const DEFAULT_MAP_STYLE = MAP_STYLES[0];

const LAYERS_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/>' +
  '<path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/>' +
  '<path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>' +
  "</svg>";

/** Contrôle Mapbox custom (aucun équivalent natif, contrairement au zoom ou
 * à la géolocalisation) : bouton "calques" ouvrant la liste des fonds de
 * carte disponibles. `mapboxgl.setStyle` recharge sources/couches mais ne
 * touche pas aux marqueurs (DOM séparé) — aucune replace nécessaire. */
class MapStyleControl implements mapboxgl.IControl {
  private map?: mapboxgl.Map;
  private container?: HTMLDivElement;
  private activeId: string;

  constructor(private onChange: (styleId: string) => void, initialStyleId: string) {
    this.activeId = initialStyleId;
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;
    const container = document.createElement("div");
    container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
    container.style.position = "relative";

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Fond de carte");
    button.style.cssText = "display:flex;align-items:center;justify-content:center;width:29px;height:29px;color:#333;";
    button.innerHTML = LAYERS_ICON_SVG;

    const panel = document.createElement("div");
    panel.style.cssText =
      "display:none;position:absolute;top:0;right:32px;min-width:160px;border-radius:8px;background:#ffffff;box-shadow:0 1px 6px rgba(0,0,0,.3);padding:4px;";

    MAP_STYLES.forEach((style) => {
      const option = document.createElement("button");
      option.type = "button";
      option.dataset.styleId = style.id;
      option.textContent = style.label;
      option.style.cssText =
        "display:block;width:100%;text-align:left;padding:6px 10px;border-radius:6px;background:transparent;border:none;font-size:13px;font-family:inherit;cursor:pointer;color:#111827;";
      option.onmouseenter = () => (option.style.background = "#F3F4F6");
      option.onmouseleave = () => (option.style.background = style.id === this.activeId ? "#EEF2FF" : "transparent");
      option.style.background = style.id === this.activeId ? "#EEF2FF" : "transparent";
      option.onclick = () => {
        this.activeId = style.id;
        this.map!.setStyle(style.url);
        this.onChange(style.id);
        panel.style.display = "none";
        panel.querySelectorAll<HTMLButtonElement>("button[data-style-id]").forEach((el) => {
          el.style.background = el.dataset.styleId === style.id ? "#EEF2FF" : "transparent";
        });
      };
      panel.appendChild(option);
    });

    button.onclick = () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    };
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target as Node)) panel.style.display = "none";
    });

    container.appendChild(button);
    container.appendChild(panel);
    this.container = container;
    return container;
  }

  onRemove(): void {
    this.container?.parentNode?.removeChild(this.container);
    this.map = undefined;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** Carte géographique du réseau (« Implantation du réseau » du prototype
 * validé, prototype.html ~ligne 3836) — reprend `Station.latitude/longitude`
 * déjà présents en base mais jamais utilisés jusqu'ici. Mapbox GL JS choisi
 * car aucune dépendance de cartographie n'existait déjà dans le projet (rien
 * à réutiliser) et le token fourni est un token Mapbox. Stations sans
 * coordonnées connues sont silencieusement omises — jamais positionnées à
 * une coordonnée inventée (0,0 ou autre). */
export function StationsMap({
  stations,
  height = 320,
  fill = false,
  onStationClick,
  focusStationId,
}: {
  stations: StationMapPoint[];
  height?: number;
  /** Occupe 100% du conteneur parent (largeur/hauteur) au lieu d'une hauteur
   * fixe en pixels — utilisé par la vue plein écran, dont la hauteur
   * disponible dépend de la fenêtre du navigateur plutôt que d'être connue à
   * l'avance. `height` est alors ignoré. */
  fill?: boolean;
  /** Quand fourni, remplace la navigation par défaut vers la page de la
   * station (ex. pour ouvrir un modal d'aperçu à la place). */
  onStationClick?: (stationId: string) => void;
  /** Cliquer une station dans un panneau externe (ex. liste latérale du
   * réseau, P1-4 audit module Stations 2026-09-16) doit zoomer directement
   * dessus sur la carte — changer cette prop déclenche un `flyTo` vers ses
   * coordonnées, sans toucher aux marqueurs déjà posés. */
  focusStationId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const router = useRouter();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE.url,
      center: [9.7, 4.05],
      zoom: 5,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    // Position actuelle de l'utilisateur (demande commanditaire 2026-09-17,
    // vue plein écran) — bouton natif Mapbox, aucune UI custom nécessaire.
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }), "top-right");
    // Choix du fond de carte (demande commanditaire 2026-09-17) — satellite +
    // rues par défaut, switchable via le bouton "calques".
    map.addControl(new MapStyleControl(() => {}, DEFAULT_MAP_STYLE.id), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
     
  }, [token]);

  useEffect(() => {
    const maybeMap = mapRef.current;
    if (!maybeMap || !token) return;
    const map: mapboxgl.Map = maybeMap;

    function placeMarkers() {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupsRef.current.forEach((p) => p.remove());
      popupsRef.current = [];
      if (stations.length === 0) return;

      const bounds = new mapboxgl.LngLatBounds();
      stations.forEach((s) => {
        // Marqueur = badge rond coloré (criticité : vert/orange/rouge/gris)
        // contenant une icône de station-service, surmonté d'une étiquette
        // TOUJOURS visible (nom, produits, statut opérationnel,
        // connectivité, alertes) plutôt qu'un point anonyme.
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.alignItems = "center";
        wrapper.style.cursor = "pointer";
        wrapper.setAttribute("role", "button");
        wrapper.tabIndex = 0;
        wrapper.setAttribute(
          "aria-label",
          [s.name, s.operationalLabel, s.connectivityLabel, s.alertsLabel].filter(Boolean).join(" — ")
        );

        const label = document.createElement("div");
        label.style.cssText =
          "margin-bottom:4px;max-width:180px;border-radius:8px;background:#ffffff;box-shadow:0 1px 4px rgba(0,0,0,.25);padding:4px 8px;";
        const nameHtml = `<div style="font-size:12px;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.name)}</div>`;
        const productsHtml = s.productsLabel
          ? `<div style="font-size:10px;color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.productsLabel)}</div>`
          : "";
        const operationalBadge = s.operationalLabel
          ? `<span style="font-size:9px;padding:1px 4px;border-radius:4px;background:${TONE_COLOR[s.operationalTone ?? "neutral"]};color:#fff;">${escapeHtml(s.operationalLabel)}</span>`
          : "";
        const connectivityBadge = s.connectivityLabel
          ? `<span style="font-size:9px;padding:1px 4px;border-radius:4px;background:${s.connected ? TONE_COLOR.success : TONE_COLOR.neutral};color:#fff;">${escapeHtml(s.connectivityLabel)}</span>`
          : "";
        const alertsBadge =
          s.alertsCount && s.alertsCount > 0
            ? `<span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:9999px;background:${STATUS_COLOR.critical};color:#fff;">${s.alertsCount}</span>`
            : "";
        const badgesRow = operationalBadge || connectivityBadge || alertsBadge
          ? `<div style="display:flex;align-items:center;gap:4px;margin-top:2px;">${operationalBadge}${connectivityBadge}${alertsBadge}</div>`
          : "";
        label.innerHTML = nameHtml + productsHtml + badgesRow;

        // Icône pompe à essence (lucide "fuel") plutôt qu'un point anonyme —
        // demande commanditaire 2026-09-17 : "les points ne sont pas
        // toujours bien [...] remplacer par des logos de stations service".
        // Le fond coloré du badge continue de porter la criticité, l'icône
        // reste neutre (blanche) au-dessus.
        const pin = document.createElement("div");
        pin.style.cssText = `width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${STATUS_COLOR[s.status]};border:2px solid #ffffff;box-shadow:0 0 0 1px rgba(0,0,0,.15);`;
        pin.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5"/>' +
          '<path d="M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16"/>' +
          '<path d="M2 21h13"/>' +
          '<path d="M3 9h11"/>' +
          "</svg>";

        wrapper.appendChild(label);
        wrapper.appendChild(pin);
        wrapper.onclick = () => (onStationClick ? onStationClick(s.id) : router.push(`/zylo-liquid/stations/${s.id}`));
        wrapper.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            wrapper.click();
          }
        });

        // Popup complémentaire au survol (ex. volume vendable/disponible) —
        // distinct de l'étiquette permanente ci-dessus, conservé tel quel.
        const popupHtml = s.popupSubtitle
          ? `<div style="font-weight:600;">${escapeHtml(s.name)}</div><div style="color:#6B7280;margin-top:2px;">${escapeHtml(s.popupSubtitle)}</div>`
          : null;
        if (popupHtml) {
          const popup = new mapboxgl.Popup({ offset: 28, closeButton: false, closeOnClick: false }).setLngLat([s.longitude, s.latitude]).setHTML(popupHtml);
          wrapper.addEventListener("mouseenter", () => popup.addTo(map));
          wrapper.addEventListener("mouseleave", () => popup.remove());
          popupsRef.current.push(popup);
        }

        const marker = new mapboxgl.Marker({ element: wrapper, anchor: "bottom" }).setLngLat([s.longitude, s.latitude]).addTo(map);
        markersRef.current.push(marker);
        bounds.extend([s.longitude, s.latitude]);
      });
      if (stations.length > 0) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 12, duration: 0 });
      }
    }

    if (map.loaded()) placeMarkers();
    else map.once("load", placeMarkers);
  }, [stations, token, router, onStationClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !token || !focusStationId) return;
    const target = stations.find((s) => s.id === focusStationId);
    if (!target) return;
    const center: [number, number] = [target.longitude, target.latitude];
    function fly() {
      map!.flyTo({ center, zoom: 14, duration: 600 });
    }
    if (map.loaded()) fly();
    else map.once("load", fly);
  }, [focusStationId, stations, token]);

  if (!token) {
    return (
      <div
        className="flex items-center justify-center rounded-card border border-dashed border-border-subtle text-body-sm text-text-muted"
        style={fill ? { height: "100%" } : { height }}
      >
        Carte indisponible — jeton Mapbox non configuré.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={fill ? { height: "100%", width: "100%", borderRadius: "var(--radius-card, 8px)", overflow: "hidden" } : { height, borderRadius: "var(--radius-card, 8px)", overflow: "hidden" }}
    />
  );
}
