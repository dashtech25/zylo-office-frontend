"use client";

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
  type MockAlarm,
  type MockVessel,
} from "@/modules/zylo-tanker/mock/fleetMock";

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

function vesselById(id: string): MockVessel | undefined {
  return MOCK_VESSELS.find((vessel) => vessel.id === id);
}

function activeAlarmCount(vesselId: string): number {
  return MOCK_ALARMS.filter((alarm) => alarm.vesselId === vesselId).length;
}

export default function SupervisionScreen() {
  const sortedAlarms = [...MOCK_ALARMS].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });

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

      <FleetMapCard />

      <Card>
        <CardSectionHeader icon={Ship} title="Navires de la flotte" />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Code</TableHeaderCell>
                <TableHeaderCell>Navire</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell>Vitesse</TableHeaderCell>
                <TableHeaderCell>Cap</TableHeaderCell>
                <TableHeaderCell>Alarmes actives</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_VESSELS.map((vessel) => {
                const alarmCount = activeAlarmCount(vessel.id);
                return (
                  <TableRow key={vessel.id}>
                    <TableCell className="font-medium text-text">{vessel.code}</TableCell>
                    <TableCell>{vessel.name}</TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[vessel.status]}>{STATUS_LABEL[vessel.status]}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{vessel.speedKnots.toFixed(1)} nds</TableCell>
                    <TableCell className="tabular-nums">{vessel.headingDeg.toFixed(0)}°</TableCell>
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
                  const vessel = vesselById(alarm.vesselId);
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
 * statut, aucune connaissance propre aux camions. */
function FleetMapCard() {
  const points: TruckMapPoint[] = MOCK_VESSELS.map((vessel) => ({
    id: vessel.id,
    label: `${vessel.name} (${vessel.code})`,
    latitude: vessel.latitude,
    longitude: vessel.longitude,
    status: toTruckMapStatus(vessel.status),
  }));

  return (
    <Card>
      <CardSectionHeader icon={MapPin} title="Carte de la flotte" />
      <CardContent>
        <TrucksMap trucks={points} height={320} />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MOCK_VESSELS.map((vessel) => (
            <div
              key={vessel.id}
              className="flex items-center justify-between gap-3 rounded-card border border-border-subtle bg-surface px-3 py-2 text-body-sm"
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
