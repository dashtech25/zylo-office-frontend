"use client";

import {
  Activity,
  AlertTriangle,
  Compass,
  Droplets,
  Fuel,
  Gauge,
  Info,
  MapPin,
  Navigation,
  Network,
  Ship,
  Zap,
} from "lucide-react";

import { Badge } from "@/shared/ui/Badge";
import { Card, CardContent } from "@/shared/ui/Card";
import { CardSectionHeader } from "@/shared/ui/CardSectionHeader";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Kpi } from "@/shared/ui/Kpi";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Stack } from "@/shared/ui/Stack";
import { Tabs } from "@/shared/ui/Tabs";

import { TrucksMap, type TruckMapPoint, type TruckMapStatus } from "@/modules/zylo-liquid/components/TrucksMap";
import { EChartsTrendChart } from "@/modules/zylo-tanker/components/EChartsTrendChart";
import {
  MOCK_ALARMS,
  MOCK_FLEET_KPIS,
  MOCK_VESSELS,
  mockConsumptionSeries,
  type MockAlarm,
  type MockVessel,
} from "@/modules/zylo-tanker/mock/fleetMock";

/** Module 1 "Tableau de bord" de SMART TANKER — écran frontend-only, aucune
 * donnée réelle branchée (voir mock/fleetMock.ts). Reproduit le patron
 * screens/<nom>/<Nom>Screen.tsx de zylo-liquid : composition pure à partir
 * de shared/ui, aucune logique métier dans src/app. */

const VESSEL_STATUS_LABEL: Record<MockVessel["status"], string> = {
  underway: "En route",
  moored: "À quai",
  anchored: "Au mouillage",
};

const VESSEL_STATUS_TONE: Record<MockVessel["status"], "success" | "info" | "warning"> = {
  underway: "success",
  moored: "info",
  anchored: "warning",
};

/** Statut navire -> statut générique de `TrucksMap` (moving/stopped/
 * unknown) — même mapping que SupervisionScreen (dupliqué localement,
 * fonction pure à 2 branches, pas de partage justifié). */
function toTruckMapStatus(status: MockVessel["status"]): TruckMapStatus {
  return status === "underway" ? "moving" : "stopped";
}

const ALARM_SEVERITY_TONE: Record<MockAlarm["severity"], "error" | "warning" | "info"> = {
  critical: "error",
  warning: "warning",
  info: "info",
};

const ALARM_SEVERITY_LABEL: Record<MockAlarm["severity"], string> = {
  critical: "Critique",
  warning: "Attention",
  info: "Info",
};

const KPI_TREND_LABEL: Record<"up" | "down" | "flat", string> = {
  up: "Hausse",
  down: "Baisse",
  flat: "Stable",
};

type SystemStatus = "ok" | "attention" | "panne";

interface SystemTile {
  label: string;
  icon: typeof Gauge;
  status: SystemStatus;
}

const SYSTEM_STATUS_LABEL: Record<SystemStatus, string> = {
  ok: "OK",
  attention: "Attention",
  panne: "Panne",
};

const SYSTEM_STATUS_TONE: Record<SystemStatus, "success" | "warning" | "error"> = {
  ok: "success",
  attention: "warning",
  panne: "error",
};

/** Dérive le statut d'un système à partir des alarmes actives du navire —
 * aucun capteur réel : une alarme "critical" sur le système = Panne, une
 * alarme "warning"/"info" = Attention, sinon OK. */
function deriveSystemStatus(alarms: MockAlarm[], systemMatch: (system: string) => boolean): SystemStatus {
  const matching = alarms.filter((a) => systemMatch(a.system));
  if (matching.some((a) => a.severity === "critical")) return "panne";
  if (matching.some((a) => a.severity === "warning")) return "attention";
  return "ok";
}

function formatCoordinate(value: number, positiveSuffix: string, negativeSuffix: string): string {
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix;
  return `${Math.abs(value).toFixed(4)}° ${suffix}`;
}

function VesselDetail({ vessel }: { vessel: MockVessel }) {
  const vesselAlarms = MOCK_ALARMS.filter((a) => a.vesselId === vessel.id);
  const consumption = mockConsumptionSeries(vessel.id);
  const trendPoints = consumption.map((p) => ({ at: p.timestamp, value: p.liters }));

  const systems: SystemTile[] = [
    { label: "Moteur", icon: Gauge, status: deriveSystemStatus(vesselAlarms, (s) => s.toLowerCase().includes("moteur")) },
    { label: "Groupe électrogène", icon: Zap, status: deriveSystemStatus(vesselAlarms, (s) => s.toLowerCase().includes("électrogène") || s.toLowerCase().includes("electrogene")) },
    { label: "Cuves", icon: Droplets, status: deriveSystemStatus(vesselAlarms, (s) => s.toLowerCase().includes("cuve")) },
    { label: "Pompes", icon: Fuel, status: deriveSystemStatus(vesselAlarms, (s) => s.toLowerCase().includes("pompe")) },
    { label: "Réseau tuyauterie", icon: Network, status: deriveSystemStatus(vesselAlarms, (s) => s.toLowerCase().includes("tuyauterie") || s.toLowerCase().includes("réseau")) },
  ];

  return (
    <Stack gap="lg">
      {/* Position / GPS */}
      <Card>
        <CardSectionHeader
          icon={MapPin}
          title="Position"
          action={<Badge tone={VESSEL_STATUS_TONE[vessel.status]}>{VESSEL_STATUS_LABEL[vessel.status]}</Badge>}
        />
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto]">
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
          <div className="min-h-[220px] min-w-[240px] overflow-hidden rounded-card">
            <TrucksMap
              trucks={MOCK_VESSELS.map((v): TruckMapPoint => ({
                id: v.id,
                label: `${v.name} (${v.code})`,
                latitude: v.latitude,
                longitude: v.longitude,
                status: toTruckMapStatus(v.status),
              }))}
              selectedTruckId={vessel.id}
              height={220}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alarmes actives */}
        <Card>
          <CardSectionHeader icon={AlertTriangle} title={`Alarmes actives (${vesselAlarms.length})`} />
          <CardContent>
            {vesselAlarms.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="Aucune alarme active" description="Ce navire ne remonte aucune alarme active pour le moment." />
            ) : (
              <Stack gap="sm">
                {vesselAlarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className="flex items-start justify-between gap-3 rounded-card border border-border-subtle p-3"
                  >
                    <div>
                      <p className="text-body-sm font-medium text-text">{alarm.label}</p>
                      <p className="text-caption text-text-muted">{alarm.system}</p>
                    </div>
                    <Badge tone={ALARM_SEVERITY_TONE[alarm.severity]}>{ALARM_SEVERITY_LABEL[alarm.severity]}</Badge>
                  </div>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Consommation */}
        <Card>
          <CardSectionHeader icon={Activity} title="Consommation (24h)" />
          <CardContent>
            <EChartsTrendChart
              points={trendPoints}
              formatValue={(v) => `${v} L`}
              formatDate={(at) => at}
              seriesLabel={`Consommation de ${vessel.name} sur 24h`}
            />
          </CardContent>
        </Card>
      </div>

      {/* État des systèmes */}
      <Card>
        <CardSectionHeader icon={Ship} title="État des systèmes" />
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {systems.map((system) => (
              <div key={system.label} className="flex flex-col items-center gap-2 rounded-card border border-border-subtle p-4 text-center">
                <system.icon className="size-5 text-text-muted" aria-hidden />
                <p className="text-body-sm font-medium text-text">{system.label}</p>
                <Badge tone={SYSTEM_STATUS_TONE[system.status]}>{SYSTEM_STATUS_LABEL[system.status]}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default function DashboardScreen() {
  return (
    <Stack gap="lg">
      <PageHeader
        eyebrow="SMART TANKER"
        title="Tableau de bord"
        description="Vue temps réel de la flotte — position GPS, alarmes, consommation et état des systèmes."
      />

      {/* KPI flotte */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_FLEET_KPIS.map((kpi) => (
          <Kpi
            key={kpi.label}
            icon={Info}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend ? { direction: kpi.trend, value: KPI_TREND_LABEL[kpi.trend] } : undefined}
          />
        ))}
      </div>

      {/* Sélecteur de navire + détail */}
      <Tabs
        variant="pills"
        defaultValue={MOCK_VESSELS[0]?.id}
        items={MOCK_VESSELS.map((vessel) => ({
          value: vessel.id,
          label: (
            <span className="flex items-center gap-1.5">
              <Ship className="size-3.5" aria-hidden />
              {vessel.name}
            </span>
          ),
          content: <VesselDetail vessel={vessel} />,
        }))}
      />
    </Stack>
  );
}
