"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, Compass, Gauge, MapPin, Maximize2, Minimize2, Navigation, Radio, Ship } from "lucide-react";

import { TrucksMap, type TruckMapPoint, type TruckMapStatus } from "@/modules/zylo-liquid/components/TrucksMap";
import {
  Badge,
  type BadgeProps,
  Button,
  Card,
  CardContent,
  CardSectionHeader,
  EmptyState,
  Kpi,
  PageHeader,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/shared/ui";
import { VesselDestinationModal } from "@/modules/zylo-tanker/components/VesselDestinationModal";
import {
  MOCK_ALARMS,
  MOCK_VESSELS,
  mockVesselRoute,
  type MockVessel,
} from "@/modules/zylo-tanker/mock/fleetMock";
import { useLiveVesselPositions } from "@/modules/zylo-tanker/hooks/useLiveVesselPositions";

/** Écran "Localisation" (module SMART TANKER) — consolide dans un seul
 * endroit la fonctionnalité tracking/position auparavant répartie entre
 * DashboardScreen (détail navire : ETA, position GPS, destination) et
 * SupervisionScreen (filtres flotte, carte flotte, tableau navires).
 * Frontend-only : toutes les données viennent de `mock/fleetMock.ts`,
 * aucun appel API. */

const STATUS_LABEL: Record<MockVessel["status"], string> = {
  underway: "En route",
  moored: "À quai",
  anchored: "Au mouillage",
};

const STATUS_TONE: Record<MockVessel["status"], BadgeProps["tone"]> = {
  underway: "success",
  moored: "neutral",
  anchored: "warning",
};

/** Statut navire (underway/moored/anchored) -> statut générique de
 * `TrucksMap` (moving/stopped/unknown) : `anchored` reste distinct de
 * `moored` métier (à quai vs au mouillage) mais les deux sont visuellement
 * "à l'arrêt" sur cette carte partagée avec les camions, faute d'un
 * troisième statut dans le composant. */
function toTruckMapStatus(status: MockVessel["status"]): TruckMapStatus {
  if (status === "underway") return "moving";
  return "stopped";
}

function activeAlarmCount(vesselId: string): number {
  return MOCK_ALARMS.filter((alarm) => alarm.vesselId === vesselId).length;
}

/** Formate une durée en minutes en "Xh Ymin" (ou "Ymin" si < 1h), "—" si
 * pas d'ETA calculable (pas de destination ou navire à l'arrêt). Utilisée
 * dans le tableau flotte (une valeur "—" y est acceptable, contrairement à
 * la tuile Kpi du panneau détail qui utilise `formatEtaMinutes`). */
function formatEta(etaMinutes: number | null): string {
  if (etaMinutes === null) return "—";
  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  return `${hours}h ${minutes}min`;
}

/** Formate un ETA en minutes en "Xh Ymin" (ex. 135 -> "2h 15min"), ou
 * simplement "Ymin" sous l'heure — jamais appelé avec `null` (voir le
 * fallback `disabled` de la tuile Kpi ETA du panneau détail). Reprise
 * exacte de DashboardScreen. */
function formatEtaMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

/** Reprise exacte de DashboardScreen. */
function formatCoordinate(value: number, positiveSuffix: string, negativeSuffix: string): string {
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix;
  return `${Math.abs(value).toFixed(4)}° ${suffix}`;
}

type StatusFilter = "all" | MockVessel["status"];
type AlarmFilter = "all" | "active";
type SpeedFilter = "all" | "stopped" | "slow" | "normal" | "fast";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "underway", label: "En route" },
  { value: "moored", label: "À quai" },
  { value: "anchored", label: "Au mouillage" },
];

const ALARM_FILTER_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Avec alarme active" },
];

const SPEED_FILTER_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "stopped", label: "Arrêté (0 nd)" },
  { value: "slow", label: "Lent (< 5 nds)" },
  { value: "normal", label: "Normal (5–15 nds)" },
  { value: "fast", label: "Rapide (> 15 nds)" },
];

function matchesSpeedFilter(speedKnots: number, filter: SpeedFilter): boolean {
  switch (filter) {
    case "stopped":
      return speedKnots === 0;
    case "slow":
      return speedKnots > 0 && speedKnots < 5;
    case "normal":
      return speedKnots >= 5 && speedKnots <= 15;
    case "fast":
      return speedKnots > 15;
    default:
      return true;
  }
}

/** Liste de navires cliquable — grille de cartes en mode normal (dans le
 * flux de la page), panneau flottant compact en mode étendu (survol de la
 * carte, style "liste de flotte" de MarineTraffic/VesselFinder). */
function VesselListPanel({
  vessels,
  selectedVesselId,
  onSelectVessel,
  floating,
}: {
  vessels: MockVessel[];
  selectedVesselId: string | null;
  onSelectVessel: (vesselId: string | null) => void;
  floating: boolean;
}) {
  return (
    <div className={floating ? "flex flex-col gap-2" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
      {vessels.map((vessel) => (
        <button
          key={vessel.id}
          type="button"
          onClick={() => onSelectVessel(vessel.id === selectedVesselId ? null : vessel.id)}
          className={`flex items-center justify-between gap-3 rounded-card border px-3 py-2 text-left text-body-sm transition-colors ${
            floating ? "backdrop-blur-sm" : ""
          } ${
            vessel.id === selectedVesselId
              ? "border-primary bg-primary-muted/40"
              : floating
                ? "border-border-subtle bg-surface/90 hover:bg-primary-muted/20"
                : "border-border-subtle bg-surface hover:bg-primary-muted/20"
          }`}
        >
          <span className="flex items-center gap-2 font-medium text-text">
            <Ship className="size-4 text-text-muted" aria-hidden />
            {vessel.name}
          </span>
          <span className="flex items-center gap-3 text-text-muted">
            <span className="flex items-center gap-1 tabular-nums">
              <MapPin className="size-3.5" aria-hidden />
              {vessel.latitude.toFixed(3)}, {vessel.longitude.toFixed(3)}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Gauge className="size-3.5" aria-hidden />
              {vessel.speedKnots.toFixed(1)} nds
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Compass className="size-3.5" aria-hidden />
              {vessel.headingDeg.toFixed(0)}°
            </span>
            <span className="flex items-center gap-1">
              <Radio className="size-3.5" aria-hidden />
              {STATUS_LABEL[vessel.status]}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Carte "flotte" — vraie carte Mapbox, `TrucksMap` (mêmes marqueurs,
 * survol, recentrage et sélecteur de fond de carte que le tracking camions
 * de Zylo Liquid) réutilisé tel quel : générique sur id/label/lat/lon/
 * statut, aucune connaissance propre aux camions. `TrucksMap` n'accepte
 * qu'un seul `route` global (pas un tracé par navire) : le trajet affiché
 * est donc celui du navire sélectionné (clic sur la carte, une carte-navire
 * ou une ligne du tableau), navires à quai exclus (aucun trajet restant à
 * parcourir).
 *
 * Mode étendu : bouton "agrandir" qui bascule la carte dans un portail
 * React (`createPortal` vers `document.body`) couvrant tout le viewport du
 * navigateur — jamais l'API Fullscreen (`requestFullscreen`), qui bascule
 * l'écran entier en mode kiosque OS (pattern explicitement écarté). Le
 * portail est nécessaire pour échapper au contexte d'empilement de
 * `ZyloTankerShell` (sidebar/topbar) de façon fiable. Style MarineTraffic/
 * VesselFinder : la carte occupe tout le fond du viewport, les contrôles
 * (fermer, liste des navires) flottent par-dessus en overlay, jamais un
 * header de page classique. Affiche toujours TOUS les navires de la flotte
 * en mode étendu (`allVessels`, pas `vessels` filtrés) — la vue "voir toute
 * la flotte" doit rester valable même si des filtres sont actifs ailleurs
 * sur l'écran. `key` différente entre les deux modes pour forcer un
 * remount propre de `TrucksMap` (Mapbox GL ne redétecte pas toujours un
 * changement de taille de son conteneur). */
function FleetMapCard({
  vessels,
  allVessels,
  selectedVesselId,
  onSelectVessel,
}: {
  vessels: MockVessel[];
  allVessels: MockVessel[];
  selectedVesselId: string | null;
  onSelectVessel: (vesselId: string | null) => void;
}) {
  // Étendue par défaut : la carte flotte s'ouvre directement en mode
  // agrandi à l'arrivée sur l'écran Localisation (demande explicite),
  // l'utilisateur peut toujours réduire via le bouton ou Échap.
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!isExpanded) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsExpanded(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isExpanded]);

  const displayedVessels = isExpanded ? allVessels : vessels;
  const points: TruckMapPoint[] = displayedVessels.map((vessel) => ({
    id: vessel.id,
    label: `${vessel.name} (${vessel.code})`,
    latitude: vessel.latitude,
    longitude: vessel.longitude,
    status: toTruckMapStatus(vessel.status),
    headingDeg: vessel.headingDeg,
  }));

  const selectedVessel = selectedVesselId ? displayedVessels.find((vessel) => vessel.id === selectedVesselId) : undefined;
  const route =
    selectedVessel && selectedVessel.status !== "moored" ? mockVesselRoute(selectedVessel.id) : undefined;

  const mapNode = (
    <TrucksMap
      key={isExpanded ? "expanded" : "embedded"}
      trucks={points}
      route={route}
      height={isExpanded ? "100vh" : 320}
      selectedTruckId={selectedVesselId}
      onTruckClick={(vesselId) => onSelectVessel(vesselId === selectedVesselId ? null : vesselId)}
      markerKind="ship"
    />
  );

  if (isExpanded) {
    return createPortal(
          <div className="fixed inset-0 z-50 bg-surface">
            {mapNode}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              title="Réduire la carte"
              aria-label="Réduire la carte"
              className="absolute top-2.5 left-14 z-10 flex h-[29px] items-center gap-1.5 rounded bg-white px-2.5 text-body-sm font-medium text-text shadow-[0_0_0_2px_rgba(0,0,0,.1)]"
            >
              <Minimize2 className="size-3.5" aria-hidden />
              Réduire
            </button>
            <div className="absolute bottom-4 left-4 z-10 max-h-[45vh] w-80 overflow-y-auto rounded-card">
              <VesselListPanel
                vessels={allVessels}
                selectedVesselId={selectedVesselId}
                onSelectVessel={onSelectVessel}
                floating
              />
            </div>
          </div>,
      document.body
    );
  }

  return (
    <Card>
      <CardSectionHeader
        icon={MapPin}
        title="Carte de la flotte"
        action={
          <Button variant="outline" size="sm" type="button" onClick={() => setIsExpanded(true)}>
            <Maximize2 className="size-3.5" aria-hidden />
            Étendre
          </Button>
        }
      />
      <CardContent>
        {mapNode}
        <div className="mt-4">
          <VesselListPanel vessels={vessels} selectedVesselId={selectedVesselId} onSelectVessel={onSelectVessel} floating={false} />
        </div>
      </CardContent>
    </Card>
  );
}

/** Panneau détail du navire sélectionné — fusion des blocs "ETA" et
 * "Position" de DashboardScreen (formatage identique). */
function VesselDetailPanel({
  vessel,
  onDefineDestination,
}: {
  vessel: MockVessel;
  onDefineDestination: () => void;
}) {
  return (
    <Stack gap="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Clock}
          label="ETA"
          value={vessel.etaMinutes !== null ? formatEtaMinutes(vessel.etaMinutes) : undefined}
          disabled={vessel.etaMinutes === null}
          disabledLabel="Aucune destination définie"
        />
      </div>

      <Card>
        <CardSectionHeader
          icon={MapPin}
          title="Position"
          action={<Badge tone={STATUS_TONE[vessel.status]}>{STATUS_LABEL[vessel.status]}</Badge>}
        />
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="flex items-center gap-1.5 text-caption uppercase tracking-wide text-text-muted">
                <MapPin className="size-3.5" aria-hidden />
                Latitude
              </p>
              <p className="tabular-nums mt-1 text-body-md font-semibold text-text">
                {formatCoordinate(vessel.latitude, "N", "S")}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-caption uppercase tracking-wide text-text-muted">
                <MapPin className="size-3.5" aria-hidden />
                Longitude
              </p>
              <p className="tabular-nums mt-1 text-body-md font-semibold text-text">
                {formatCoordinate(vessel.longitude, "E", "O")}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-caption uppercase tracking-wide text-text-muted">
                <Compass className="size-3.5" aria-hidden />
                Cap
              </p>
              <p className="tabular-nums mt-1 text-body-md font-semibold text-text">{vessel.headingDeg}°</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-caption uppercase tracking-wide text-text-muted">
                <Navigation className="size-3.5" aria-hidden />
                Vitesse
              </p>
              <p className="tabular-nums mt-1 text-body-md font-semibold text-text">{vessel.speedKnots.toFixed(1)} nds</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-subtle p-3">
            <div>
              <p className="text-caption uppercase tracking-wide text-text-muted">Destination</p>
              <p className="mt-1 text-body-sm font-medium text-text">
                {vessel.destinationLabel ?? "Aucune destination définie"}
              </p>
            </div>
            <Button variant="outline" size="sm" type="button" onClick={onDefineDestination}>
              Définir la destination
            </Button>
          </div>
        </CardContent>
      </Card>
    </Stack>
  );
}

/** Destination définie manuellement pour un navire (mock uniquement — pas
 * de persistance réelle) : remplace les champs destination du navire live
 * tant que l'onglet n'a pas été rechargé. Reprise exacte de la logique de
 * fusion `vessel + override` de DashboardScreen. */
interface DestinationOverride {
  lat: number;
  lon: number;
  label: string;
}

export default function LocalisationScreen() {
  const liveVessels = useLiveVesselPositions(MOCK_VESSELS);
  const [destinationOverrides, setDestinationOverrides] = useState<Record<string, DestinationOverride>>({});
  const [destinationModalVesselId, setDestinationModalVesselId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [destinationFilter, setDestinationFilter] = useState<string>("all");
  const [alarmFilter, setAlarmFilter] = useState<AlarmFilter>("all");
  const [speedFilter, setSpeedFilter] = useState<SpeedFilter>("all");
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);

  const vessels = liveVessels.map((vessel) => {
    const override = destinationOverrides[vessel.id];
    if (!override) return vessel;
    return {
      ...vessel,
      destinationLatitude: override.lat,
      destinationLongitude: override.lon,
      destinationLabel: override.label || vessel.destinationLabel,
    };
  });

  // Filtres appliqués hors "destination", pour calculer la liste des
  // destinations distinctes disponibles compte tenu des autres critères
  // déjà actifs — même patron en cascade que SupervisionScreen.
  const vesselsBeforeDestinationFilter = useMemo(() => {
    return vessels.filter((vessel) => {
      if (statusFilter !== "all" && vessel.status !== statusFilter) return false;
      if (alarmFilter === "active" && activeAlarmCount(vessel.id) === 0) return false;
      if (!matchesSpeedFilter(vessel.speedKnots, speedFilter)) return false;
      return true;
    });
  }, [vessels, statusFilter, alarmFilter, speedFilter]);

  const destinationOptions = useMemo(() => {
    const labels = new Set<string>();
    vesselsBeforeDestinationFilter.forEach((vessel) => {
      if (vessel.destinationLabel) labels.add(vessel.destinationLabel);
    });
    return [
      { value: "all", label: "Toutes" },
      ...Array.from(labels)
        .sort((a, b) => a.localeCompare(b))
        .map((label) => ({ value: label, label })),
    ];
  }, [vesselsBeforeDestinationFilter]);

  const filteredVessels = useMemo(() => {
    return vesselsBeforeDestinationFilter.filter((vessel) => {
      if (destinationFilter !== "all" && vessel.destinationLabel !== destinationFilter) return false;
      return true;
    });
  }, [vesselsBeforeDestinationFilter, destinationFilter]);

  const selectedVessel = selectedVesselId ? filteredVessels.find((vessel) => vessel.id === selectedVesselId) ?? null : null;
  const destinationModalVessel = vessels.find((v) => v.id === destinationModalVesselId) ?? null;

  return (
    <Stack gap="lg">
      <PageHeader
        eyebrow="SMART TANKER"
        title="Localisation"
        description="Suivi temps réel de la flotte — filtres, carte, tableau et détail de position par navire."
      />

      <Card>
        <CardSectionHeader icon={MapPin} title="Filtres" />
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-body-sm text-text-muted">Statut</label>
              <Select
                aria-label="Filtrer par statut"
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              />
            </div>
            <div>
              <label className="mb-1 block text-body-sm text-text-muted">Destination</label>
              <Select
                aria-label="Filtrer par destination"
                options={destinationOptions}
                value={destinationFilter}
                onValueChange={setDestinationFilter}
              />
            </div>
            <div>
              <label className="mb-1 block text-body-sm text-text-muted">Alarme</label>
              <Select
                aria-label="Filtrer par alarme"
                options={ALARM_FILTER_OPTIONS}
                value={alarmFilter}
                onValueChange={(value) => setAlarmFilter(value as AlarmFilter)}
              />
            </div>
            <div>
              <label className="mb-1 block text-body-sm text-text-muted">Vitesse</label>
              <Select
                aria-label="Filtrer par vitesse"
                options={SPEED_FILTER_OPTIONS}
                value={speedFilter}
                onValueChange={(value) => setSpeedFilter(value as SpeedFilter)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <FleetMapCard
        vessels={filteredVessels}
        allVessels={vessels}
        selectedVesselId={selectedVesselId}
        onSelectVessel={setSelectedVesselId}
      />

      <Card>
        <CardSectionHeader icon={Ship} title="Navires de la flotte" />
        <CardContent>
          {filteredVessels.length === 0 ? (
            <EmptyState icon={Ship} title="Aucun navire" description="Aucun navire ne correspond aux filtres sélectionnés." />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Navire</TableHeaderCell>
                  <TableHeaderCell>Position</TableHeaderCell>
                  <TableHeaderCell>Vitesse</TableHeaderCell>
                  <TableHeaderCell>Cap</TableHeaderCell>
                  <TableHeaderCell>Destination</TableHeaderCell>
                  <TableHeaderCell>ETA</TableHeaderCell>
                  <TableHeaderCell>Alarmes actives</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredVessels.map((vessel) => {
                  const alarmCount = activeAlarmCount(vessel.id);
                  return (
                    <TableRow
                      key={vessel.id}
                      clickable
                      onClick={() => setSelectedVesselId(vessel.id === selectedVesselId ? null : vessel.id)}
                    >
                      <TableCell className="font-medium text-text">{vessel.code}</TableCell>
                      <TableCell>{vessel.name}</TableCell>
                      <TableCell className="tabular-nums text-text-muted">
                        {vessel.latitude.toFixed(3)}, {vessel.longitude.toFixed(3)}
                      </TableCell>
                      <TableCell className="tabular-nums">{vessel.speedKnots.toFixed(1)} nds</TableCell>
                      <TableCell className="tabular-nums">{vessel.headingDeg.toFixed(0)}°</TableCell>
                      <TableCell>{vessel.destinationLabel ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{formatEta(vessel.etaMinutes)}</TableCell>
                      <TableCell>
                        {alarmCount > 0 ? (
                          <Badge tone="error" dot>
                            {alarmCount}
                          </Badge>
                        ) : (
                          <span className="text-text-muted">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardSectionHeader icon={Ship} title="Détail du navire" />
        <CardContent>
          {selectedVessel ? (
            <VesselDetailPanel
              vessel={selectedVessel}
              onDefineDestination={() => setDestinationModalVesselId(selectedVessel.id)}
            />
          ) : (
            <EmptyState
              icon={Ship}
              title="Aucun navire sélectionné"
              description="Cliquez sur un navire pour voir son détail."
            />
          )}
        </CardContent>
      </Card>

      {destinationModalVessel && (
        <VesselDestinationModal
          vessel={destinationModalVessel}
          open
          onClose={() => setDestinationModalVesselId(null)}
          onSave={(lat, lon, label) => {
            setDestinationOverrides((prev) => ({
              ...prev,
              [destinationModalVessel.id]: { lat, lon, label },
            }));
          }}
        />
      )}
    </Stack>
  );
}
