"use client";

import { AlertTriangle } from "lucide-react";

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
import { MOCK_ALARMS, MOCK_FLEET_KPIS, MOCK_VESSELS, type MockAlarm } from "@/modules/zylo-tanker/mock/fleetMock";

/** Écran "Centre de supervision" (module 19 SMART TANKER) — vue flotte,
 * un niveau au-dessus du tableau de bord d'un seul navire. Frontend-only :
 * toutes les données viennent de `mock/fleetMock.ts`, aucun appel API. */

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

export default function SupervisionScreen() {
  const sortedAlarms = [...MOCK_ALARMS].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });

  const vesselById = (id: string) => MOCK_VESSELS.find((vessel) => vessel.id === id);

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
