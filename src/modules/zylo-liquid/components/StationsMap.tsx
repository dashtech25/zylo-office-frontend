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
}

const STATUS_COLOR: Record<StationMapStatus, string> = {
  online: "#1F9D55",
  alert: "#D97706",
  critical: "#DC2626",
  offline: "#6B7280",
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
  onStationClick,
}: {
  stations: StationMapPoint[];
  height?: number;
  /** Quand fourni, remplace la navigation par défaut vers la page de la
   * station (ex. pour ouvrir un modal d'aperçu à la place). */
  onStationClick?: (stationId: string) => void;
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
      style: "mapbox://styles/mapbox/light-v11",
      center: [9.7, 4.05],
      zoom: 5,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", s.name);
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "50%";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 0 0 1px rgba(0,0,0,.15)";
        el.style.background = STATUS_COLOR[s.status];
        el.style.cursor = "pointer";
        el.onclick = () => (onStationClick ? onStationClick(s.id) : router.push(`/zylo-liquid/stations/${s.id}`));

        const popupHtml = s.popupSubtitle
          ? `<div style="font-weight:600;">${escapeHtml(s.name)}</div><div style="color:#6B7280;margin-top:2px;">${escapeHtml(s.popupSubtitle)}</div>`
          : null;
        // `Marker.setPopup` n'affiche le popup qu'au CLIC (togglePopup interne
        // de Mapbox GL) — jamais au survol. La fiche brève demandée au survol
        // est donc gérée manuellement ici (mouseenter/mouseleave), sans passer
        // par setPopup, pour ne pas entrer en conflit avec le clic qui ouvre
        // déjà la navigation/le modal d'aperçu.
        const popup = new mapboxgl.Popup({ offset: 12, closeButton: false, closeOnClick: false }).setLngLat([s.longitude, s.latitude]);
        if (popupHtml) popup.setHTML(popupHtml);
        else popup.setText(s.name);
        el.addEventListener("mouseenter", () => popup.addTo(map));
        el.addEventListener("mouseleave", () => popup.remove());
        popupsRef.current.push(popup);

        const marker = new mapboxgl.Marker({ element: el }).setLngLat([s.longitude, s.latitude]).addTo(map);
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

  if (!token) {
    return (
      <div className="flex items-center justify-center rounded-card border border-dashed border-border-subtle text-body-sm text-text-muted" style={{ height }}>
        Carte indisponible — jeton Mapbox non configuré.
      </div>
    );
  }

  return <div ref={containerRef} style={{ height, borderRadius: "var(--radius-card, 8px)", overflow: "hidden" }} />;
}
