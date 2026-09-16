"use client";

import { useMemo, useState } from "react";
import { Gauge, Thermometer, Waves } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardSectionHeader,
  PageHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/shared/ui";
import { EChartsTrendChart, type EChartsTrendChartPoint } from "@/modules/zylo-tanker/components/EChartsTrendChart";
import { cn } from "@/shared/lib/cn";
import { MOCK_PUMPS, MOCK_VESSELS, type MockPump } from "@/modules/zylo-tanker/mock/fleetMock";

/** Écran "Gestion des pompes" (module 7 / 20 du cahier des charges SMART
 * TANKER) — chantier frontend-only, données 100% mockées
 * (modules/zylo-tanker/mock/fleetMock.ts). Couvre débit, pression,
 * température et un historique de débit simulé pour la pompe sélectionnée.
 * Aucun appel API : le jour où le backend zylo-tanker existera, seule cette
 * fonction remplacera les imports mock par des appels à un futur
 * services/zyloTankerApi.ts, sans changer la mise en page. */

const STATUS_LABEL: Record<MockPump["status"], string> = {
  running: "En marche",
  idle: "À l'arrêt",
  fault: "Défaut",
};

const STATUS_TONE: Record<MockPump["status"], "success" | "idle" | "error"> = {
  running: "success",
  idle: "idle",
  fault: "error",
};

/** Série 24h plausible générée côté client autour du débit courant de la
 * pompe — aucune API d'historique n'existe encore pour ce module, donc pas
 * de vraie donnée à afficher ; une pompe à l'arrêt ou en défaut reste plate
 * autour de zéro plutôt que de simuler une activité qu'elle n'a pas. */
function buildFlowHistory(pump: MockPump): EChartsTrendChartPoint[] {
  const amplitude = pump.status === "running" ? pump.flowRateM3h * 0.12 : Math.max(pump.flowRateM3h, 2) * 0.5;
  return Array.from({ length: 24 }, (_, hour) => {
    const noise = Math.sin(hour / 2.6) * amplitude;
    const value = Math.max(0, Math.round(pump.flowRateM3h + noise));
    return { at: `${String(hour).padStart(2, "0")}:00`, value };
  });
}

export default function PumpsScreen() {
  const [vesselId, setVesselId] = useState(MOCK_VESSELS[0]?.id ?? "");
  const pumpsForVessel = useMemo(() => MOCK_PUMPS.filter((pump) => pump.vesselId === vesselId), [vesselId]);
  const [selectedPumpId, setSelectedPumpId] = useState(pumpsForVessel[0]?.id ?? "");

  const selectedPump =
    pumpsForVessel.find((pump) => pump.id === selectedPumpId) ?? pumpsForVessel[0] ?? null;

  function handleSelectVessel(nextVesselId: string) {
    setVesselId(nextVesselId);
    const firstPump = MOCK_PUMPS.find((pump) => pump.vesselId === nextVesselId);
    setSelectedPumpId(firstPump?.id ?? "");
  }

  const flowHistory = useMemo(() => (selectedPump ? buildFlowHistory(selectedPump) : []), [selectedPump]);

  return (
    <Stack gap="lg">
      <PageHeader
        eyebrow="SMART TANKER · Module 7"
        title="Gestion des pompes"
        description="Débit, pression, température et historique des pompes cargo, par navire."
      />

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Sélection du navire">
        {MOCK_VESSELS.map((vessel) => {
          const active = vessel.id === vesselId;
          return (
            <button
              key={vessel.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectVessel(vessel.id)}
              className={cn(
                "rounded-button px-3 py-1.5 text-body-sm font-medium transition-colors",
                active ? "bg-primary-muted text-primary" : "text-text-muted hover:bg-surface-muted"
              )}
            >
              {vessel.name}
              <span className="ml-1.5 text-caption text-text-muted">({vessel.code})</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardSectionHeader icon={Gauge} title="Pompes cargo" />
        <CardContent>
          {pumpsForVessel.length === 0 ? (
            <p className="text-body-sm text-text-muted">Aucune pompe enregistrée pour ce navire.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Pompe</TableHeaderCell>
                  <TableHeaderCell>Statut</TableHeaderCell>
                  <TableHeaderCell>Débit</TableHeaderCell>
                  <TableHeaderCell>Pression</TableHeaderCell>
                  <TableHeaderCell>Température</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pumpsForVessel.map((pump) => (
                  <TableRow
                    key={pump.id}
                    clickable
                    onClick={() => setSelectedPumpId(pump.id)}
                    className={cn(pump.id === selectedPumpId && "bg-primary-muted/40")}
                  >
                    <TableCell className="font-medium text-text">{pump.label}</TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[pump.status]}>{STATUS_LABEL[pump.status]}</Badge>
                    </TableCell>
                    <TableCell>{pump.flowRateM3h.toLocaleString("fr-FR")} m³/h</TableCell>
                    <TableCell>{pump.pressureBar.toLocaleString("fr-FR")} bar</TableCell>
                    <TableCell>{pump.temperatureC.toLocaleString("fr-FR")} °C</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardSectionHeader icon={Waves} title="Historique — débit sur 24h" />
        <CardContent>
          {selectedPump ? (
            <Stack gap="md">
              <div className="flex flex-wrap items-center gap-4 text-body-sm text-text-muted">
                <span className="text-text">{selectedPump.label}</span>
                <span className="flex items-center gap-1">
                  <Gauge className="size-3.5" aria-hidden />
                  {selectedPump.flowRateM3h.toLocaleString("fr-FR")} m³/h actuel
                </span>
                <span className="flex items-center gap-1">
                  <Thermometer className="size-3.5" aria-hidden />
                  {selectedPump.temperatureC.toLocaleString("fr-FR")} °C
                </span>
              </div>
              <EChartsTrendChart
                points={flowHistory}
                seriesLabel={`Débit ${selectedPump.label}`}
                formatValue={(value) => `${value} m³/h`}
                formatDate={(at) => at}
              />
            </Stack>
          ) : (
            <p className="text-body-sm text-text-muted">Sélectionnez une pompe pour afficher son historique.</p>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
