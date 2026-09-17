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
      style: "mapbox://styles/mapbox/streets-v12",
      center: [9.7, 4.05],
      zoom: 5,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    // Position actuelle de l'utilisateur (demande commanditaire 2026-09-17,
    // vue plein écran) — bouton natif Mapbox, aucune UI custom nécessaire.
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }), "top-right");
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
        // Marqueur = pin neutre dont seule la BORDURE porte la couleur de
        // criticité (vert/orange/rouge/gris) — demande commanditaire
        // 2026-09-17 : "je ne veux pas que le point soit rouge [...] c'est
        // plutôt la bordure [...] qui doit être rouge ou orange", surmonté
        // d'une étiquette TOUJOURS visible (nom, produits, statut
        // opérationnel, connectivité, alertes) plutôt qu'un point anonyme.
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

        const pin = document.createElement("div");
        pin.style.cssText = `width:18px;height:18px;border-radius:50%;background:#ffffff;border:3px solid ${STATUS_COLOR[s.status]};box-shadow:0 0 0 1px rgba(0,0,0,.15);`;

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
