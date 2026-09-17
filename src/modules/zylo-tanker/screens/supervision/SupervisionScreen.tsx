"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Compass, Gauge, MapPin, Radio, Ship } from "lucide-react";

import { TrucksMap, type TruckMapPoint, type TruckMapStatus } from "@/modules/zylo-liquid/components/TrucksMap";
import {
  Badge,
  type BadgeProps,
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
import {
  MOCK_ALARMS,
  MOCK_FLEET_KPIS,
  MOCK_VESSELS,
  mockVesselRoute,
  type MockAlarm,
  type MockVessel,
} from "@/modules/zylo-tanker/mock/fleetMock";
import { useLiveVesselPositions } from "@/modules/zylo-tanker/hooks/useLiveVesselPositions";

/** Écran "Centre de supervision" (module 19 SMART TANKER) — vue flotte,
 * un niveau au-dessus du tableau de bord d'un seul navire. Frontend-only :
 * toutes les données viennent de `mock/fleetMock.ts`, aucun appel API. */

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

const SEVERITY_LABEL: Record<MockAlarm["severity"], string> = {
  critical: "Critique",
  warning: "Avertissement",
  info: "Info",
};

const SEVERITY_TONE: Record<MockAlarm["severity"], BadgeProps["tone"]> = {
  critical: "critical",
  warning: "warning",
  info: "info",
};

const SEVERITY_ORDER: Record<MockAlarm["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const KPI_TREND_LABEL: Record<"up" | "down" | "flat", string> = {
  up: "En hausse",
  down: "En baisse",
  flat: "Stable",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTriggeredAt(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

function activeAlarmCount(vesselId: string): number {
  return MOCK_ALARMS.filter((alarm) => alarm.vesselId === vesselId).length;
}

/** Formate une durée en minutes en "Xh Ymin" (ou "Ymin" si < 1h), "—" si
 * pas d'ETA calculable (pas de destination ou navire à l'arrêt). */
function formatEta(etaMinutes: number | null): string {
  if (etaMinutes === null) return "—";
  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  return `${hours}h ${minutes}min`;
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

export default function SupervisionScreen() {
  const liveVessels = useLiveVesselPositions(MOCK_VESSELS);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [destinationFilter, setDestinationFilter] = useState<string>("all");
  const [alarmFilter, setAlarmFilter] = useState<AlarmFilter>("all");
  const [speedFilter, setSpeedFilter] = useState<SpeedFilter>("all");
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);

  // Filtres appliqués hors "destination", pour calculer la liste des
  // destinations distinctes disponibles compte tenu des autres critères
  // déjà actifs (§2 de la consigne : options de destination dépendantes
  // des navires filtrés par les autres critères).
  const vesselsBeforeDestinationFilter = useMemo(() => {
    return liveVessels.filter((vessel) => {
      if (statusFilter !== "all" && vessel.status !== statusFilter) return false;
      if (alarmFilter === "active" && activeAlarmCount(vessel.id) === 0) return false;
      if (!matchesSpeedFilter(vessel.speedKnots, speedFilter)) return false;
      return true;
    });
  }, [liveVessels, statusFilter, alarmFilter, speedFilter]);

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

  const sortedAlarms = [...MOCK_ALARMS]
    .filter((alarm) => filteredVessels.some((vessel) => vessel.id === alarm.vesselId))
    .sort((a, b) => {
      const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
    });

  const filteredVesselById = (id: string) => filteredVessels.find((vessel) => vessel.id === id);

  return (
    <Stack gap="lg">
      <PageHeader
        eyebrow="SMART TANKER"
        title="Centre de supervision"
        description="Vue flotte : navires, positions et alertes centralisées, tous navires confondus."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MOCK_FLEET_KPIS.map((kpi) => (
          <Kpi
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend ? { direction: kpi.trend, value: KPI_TREND_LABEL[kpi.trend] } : undefined}
          />
        ))}
      </div>

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
                  <TableHeaderCell>Statut</TableHeaderCell>
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
                      <TableCell>
                        <Badge tone={STATUS_TONE[vessel.status]}>{STATUS_LABEL[vessel.status]}</Badge>
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
        <CardSectionHeader icon={AlertTriangle} title="Alertes centralisées" />
        <CardContent>
          {sortedAlarms.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Aucune alerte" description="Aucune alarme active sur la flotte." />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Sévérité</TableHeaderCell>
                  <TableHeaderCell>Navire</TableHeaderCell>
                  <TableHeaderCell>Alarme</TableHeaderCell>
                  <TableHeaderCell>Système</TableHeaderCell>
                  <TableHeaderCell>Déclenchée</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedAlarms.map((alarm) => {
                  const vessel = filteredVesselById(alarm.vesselId);
                  return (
                    <TableRow key={alarm.id}>
                      <TableCell>
                        <Badge tone={SEVERITY_TONE[alarm.severity]}>{SEVERITY_LABEL[alarm.severity]}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-text">{vessel?.name ?? alarm.vesselId}</TableCell>
                      <TableCell>{alarm.label}</TableCell>
                      <TableCell className="text-text-muted">{alarm.system}</TableCell>
                      <TableCell className="tabular-nums text-text-muted">{formatTriggeredAt(alarm.triggeredAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

/** Statut navire (underway/moored/anchored) -> statut générique de
 * `TrucksMap` (moving/stopped/unknown) : `anchored` reste distinct de
 * `moored` métier (à quai vs au mouillage) mais les deux sont visuellement
 * "à l'arrêt" sur cette carte partagée avec les camions, faute d'un
 * troisième statut dans le composant. */
function toTruckMapStatus(status: MockVessel["status"]): TruckMapStatus {
  if (status === "underway") return "moving";
  return "stopped";
}

/** Carte "flotte" — vraie carte Mapbox, `TrucksMap` (mêmes marqueurs,
 * survol, recentrage et sélecteur de fond de carte que le tracking camions
 * de Zylo Liquid) réutilisé tel quel : générique sur id/label/lat/lon/
 * statut, aucune connaissance propre aux camions. `TrucksMap` n'accepte
 * qu'un seul `route` global (pas un tracé par navire) : le trajet affiché
 * est donc celui du navire sélectionné (clic sur la carte ou une ligne du
 * tableau), navires à quai exclus (aucun trajet restant à parcourir). */
function FleetMapCard({
  vessels,
  selectedVesselId,
  onSelectVessel,
}: {
  vessels: MockVessel[];
  selectedVesselId: string | null;
  onSelectVessel: (vesselId: string | null) => void;
}) {
  const points: TruckMapPoint[] = vessels.map((vessel) => ({
    id: vessel.id,
    label: `${vessel.name} (${vessel.code})`,
    latitude: vessel.latitude,
    longitude: vessel.longitude,
    status: toTruckMapStatus(vessel.status),
  }));

  const selectedVessel = selectedVesselId ? vessels.find((vessel) => vessel.id === selectedVesselId) : undefined;
  const route =
    selectedVessel && selectedVessel.status !== "moored" ? mockVesselRoute(selectedVessel.id) : undefined;

  return (
    <Card>
      <CardSectionHeader icon={MapPin} title="Carte de la flotte" />
      <CardContent>
        <TrucksMap
          trucks={points}
          route={route}
          height={320}
          selectedTruckId={selectedVesselId}
          onTruckClick={(vesselId) => onSelectVessel(vesselId === selectedVesselId ? null : vesselId)}
        />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {vessels.map((vessel) => (
            <button
              key={vessel.id}
              type="button"
              onClick={() => onSelectVessel(vessel.id === selectedVesselId ? null : vessel.id)}
              className={`flex items-center justify-between gap-3 rounded-card border px-3 py-2 text-left text-body-sm transition-colors ${
                vessel.id === selectedVesselId
                  ? "border-primary bg-primary-muted/40"
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
      </CardContent>
    </Card>
  );
}
