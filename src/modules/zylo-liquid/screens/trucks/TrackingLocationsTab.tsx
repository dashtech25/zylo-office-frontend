"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { CreateTrackingLocationInput, TrackingLocation, TrackingLocationType } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, Modal, SearchableSelect, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { MapPin } from "lucide-react";

import { useTrucks } from "./useTrucks";

type PositionMethod = "current" | "coordinates" | "search";

const LOCATION_TYPES: TrackingLocationType[] = ["port", "entrepot", "depot_fournisseur", "libre"];

/** Onglet « Lieux » (mission « tracking », étape 2 — scénario 3, validé
 * avec le commanditaire) — un lieu se pose comme un point Google Maps
 * (position actuelle / coordonnées / recherche d'adresse), jamais une
 * géozone dessinée. Le rayon de tolérance reste une valeur par défaut
 * invisible, pas un objet à manipuler sur la carte. */
export function TrackingLocationsTab({ data }: { data: ReturnType<typeof useTrucks> }) {
  const t = useTranslations("zyloLiquid.trucks.locations");
  const tCommon = useTranslations("common");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrackingLocation | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(location: TrackingLocation) {
    setDeleteError(null);
    try {
      await data.removeTrackingLocation(location.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : tCommon("states.error"));
    }
  }

  const activeLocations = data.trackingLocations.filter((l) => l.status === "active");

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <MapPin className="size-4" aria-hidden />
          {t("newLocation")}
        </Button>
      </div>

      {deleteError && <Alert tone="error">{deleteError}</Alert>}

      <Card padding="none">
        <div className="p-5">
          {activeLocations.length === 0 ? (
            <EmptyState icon={MapPin} title={t("empty")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("table.name")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.type")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.radius")}</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {activeLocations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium text-text">{location.name}</TableCell>
                    <TableCell><Badge tone="neutral">{t(`type.${location.type}`)}</Badge></TableCell>
                    <TableCell>{location.radiusMeters} m</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditing(location); setFormOpen(true); }}>{tCommon("actions.edit")}</Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(location)}>{tCommon("actions.delete")}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <TrackingLocationFormModal data={data} location={editing} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function TrackingLocationFormModal({
  data,
  location,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof useTrucks>;
  location: TrackingLocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.trucks.locations");
  const tCommon = useTranslations("common");
  const isEdit = location !== null;

  const [method, setMethod] = useState<PositionMethod>("search");
  const [name, setName] = useState("");
  const [type, setType] = useState<TrackingLocationType>("libre");
  const [radiusMeters, setRadiusMeters] = useState("150");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  // Ref-callback (état, pas useRef) — nécessaire car ce formulaire est
  // rendu dans le portail Radix du Modal : au premier rendu où `open`
  // passe à true, le noeud DOM n'est pas encore attaché au moment où
  // l'effet de création de la carte s'exécute (useRef seul resterait
  // `null`, jamais réévalué). Avec un état, l'effet redéclenche dès que
  // le noeud apparaît réellement.
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const circleSourceId = "tracking-location-radius";
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!open) return;
    setMethod(isEdit ? "coordinates" : "search");
    setName(location?.name ?? "");
    setType(location?.type ?? "libre");
    setRadiusMeters(location ? String(location.radiusMeters) : "150");
    setLatitude(location?.latitude ?? null);
    setLongitude(location?.longitude ?? null);
    setLatInput(location ? String(location.latitude) : "");
    setLonInput(location ? String(location.longitude) : "");
    setSearchQuery("");
    setSearchResults([]);
    setGeoError(null);
    setSubmitError(null);
    setAttempted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, location?.id]);

  useEffect(() => {
    if (!open || !mapContainer || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [longitude ?? 9.7, latitude ?? 4.05],
      zoom: latitude !== null ? 13 : 5,
    });
    mapRef.current = map;
    map.on("click", (e) => {
      setLatitude(e.lngLat.lat);
      setLongitude(e.lngLat.lng);
      setLatInput(String(e.lngLat.lat.toFixed(6)));
      setLonInput(String(e.lngLat.lng.toFixed(6)));
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mapContainer, token]);

  useEffect(() => {
    const maybeMap = mapRef.current;
    if (!maybeMap) return;
    const map: mapboxgl.Map = maybeMap;
    const radius = Number(radiusMeters) || 150;

    function draw() {
      markerRef.current?.remove();
      markerRef.current = null;
      if (latitude === null || longitude === null) return;

      markerRef.current = new mapboxgl.Marker({ color: "#1D4ED8" }).setLngLat([longitude, latitude]).addTo(map);
      map.flyTo({ center: [longitude, latitude], zoom: 14, duration: 300 });

      const circle = circlePolygon(latitude, longitude, radius);
      const existing = map.getSource(circleSourceId) as mapboxgl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(circle);
      } else {
        map.addSource(circleSourceId, { type: "geojson", data: circle });
        map.addLayer({ id: `${circleSourceId}-fill`, type: "fill", source: circleSourceId, paint: { "fill-color": "#1D4ED8", "fill-opacity": 0.15 } });
        map.addLayer({ id: `${circleSourceId}-line`, type: "line", source: circleSourceId, paint: { "line-color": "#1D4ED8", "line-width": 2 } });
      }
    }

    if (map.loaded()) draw();
    else map.once("load", draw);
  }, [latitude, longitude, radiusMeters]);

  function handleUseCurrentPosition() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError(t("geolocationUnsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLatInput(String(pos.coords.latitude.toFixed(6)));
        setLonInput(String(pos.coords.longitude.toFixed(6)));
      },
      () => setGeoError(t("geolocationDenied")),
    );
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !token) return;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${token}&limit=5`;
    const res = await fetch(url);
    const body = await res.json();
    setSearchResults((body.features ?? []).map((f: { place_name: string; center: [number, number] }) => ({ name: f.place_name, lon: f.center[0], lat: f.center[1] })));
  }

  function applyCoordinatesInput() {
    const lat = Number(latInput);
    const lon = Number(lonInput);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      setLatitude(lat);
      setLongitude(lon);
    }
  }

  const missingRequired = !name.trim() || latitude === null || longitude === null;
  const displayError = attempted && missingRequired ? t("required") : submitError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (missingRequired) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateTrackingLocationInput = {
        name: name.trim(), type, latitude: latitude as number, longitude: longitude as number, radiusMeters: Number(radiusMeters) || 150,
      };
      if (isEdit && location) {
        await data.editTrackingLocation(location.id, payload);
      } else {
        await data.addTrackingLocation(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("editTitle") : t("createTitle")}
      size="lg"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>{tCommon("actions.cancel")}</Button>
          <Button size="sm" type="submit" form="tracking-location-form" loading={submitting}>{tCommon("actions.save")}</Button>
        </>
      }
    >
      <form id="tracking-location-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {displayError && <Alert tone="error">{displayError}</Alert>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("name")}>
            {(f) => <Input {...f} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />}
          </FormField>
          <FormField label={t("type.label")}>
            {() => (
              <SearchableSelect aria-label={t("type.label")} value={type} onValueChange={(v) => setType(v as TrackingLocationType)}
                options={LOCATION_TYPES.map((v) => ({ value: v, label: t(`type.${v}`) }))} />
            )}
          </FormField>
        </div>

        {!isEdit && (
          <div className="flex gap-2">
            {(["search", "current", "coordinates"] as PositionMethod[]).map((m) => (
              <Button key={m} type="button" size="sm" variant={method === m ? "primary" : "outline"} onClick={() => setMethod(m)}>
                {t(`method.${m}`)}
              </Button>
            ))}
          </div>
        )}

        {!isEdit && method === "current" && (
          <div className="flex flex-col gap-2">
            {geoError && <Alert tone="error">{geoError}</Alert>}
            <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentPosition}>{t("useCurrentPosition")}</Button>
          </div>
        )}

        {!isEdit && method === "search" && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("searchPlaceholder")} className="flex-1" />
              <Button type="button" variant="outline" size="sm" onClick={handleSearch}>{tCommon("actions.search")}</Button>
            </div>
            {searchResults.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-card border border-border-subtle">
                {searchResults.map((r) => (
                  <li key={r.name}>
                    <button
                      type="button"
                      onClick={() => { setLatitude(r.lat); setLongitude(r.lon); setLatInput(String(r.lat)); setLonInput(String(r.lon)); setSearchResults([]); setSearchQuery(r.name); }}
                      className="block w-full px-3 py-2 text-left text-body-sm hover:bg-surface-muted"
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(isEdit || method === "coordinates") && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t("latitude")}>
              {(f) => <Input {...f} value={latInput} onChange={(e) => setLatInput(e.target.value)} onBlur={applyCoordinatesInput} placeholder="4.0500000" />}
            </FormField>
            <FormField label={t("longitude")}>
              {(f) => <Input {...f} value={lonInput} onChange={(e) => setLonInput(e.target.value)} onBlur={applyCoordinatesInput} placeholder="9.7000000" />}
            </FormField>
          </div>
        )}

        <FormField label={t("radius")} hint={t("radiusHint")}>
          {(f) => <Input {...f} type="number" min={10} max={5000} value={radiusMeters} onChange={(e) => setRadiusMeters(e.target.value)} />}
        </FormField>

        {token ? (
          <div ref={setMapContainer} style={{ height: 260, borderRadius: "var(--radius-card, 8px)", overflow: "hidden" }} />
        ) : (
          <p className="text-body-sm text-text-muted">{t("mapUnavailable")}</p>
        )}
      </form>
    </Modal>
  );
}

function circlePolygon(lat: number, lon: number, radiusMeters: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64;
  const coords: [number, number][] = [];
  const earthRadius = 6371000;
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusMeters * Math.cos(angle)) / (earthRadius * Math.cos((lat * Math.PI) / 180));
    const dy = (radiusMeters * Math.sin(angle)) / earthRadius;
    coords.push([lon + (dx * 180) / Math.PI, lat + (dy * 180) / Math.PI]);
  }
  coords.push(coords[0]!);
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}
