"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Droplets,
  Gauge as GaugeIcon,
  ShieldCheck,
  Thermometer,
} from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardSectionHeader,
  CardTitle,
  Kpi,
  PageHeader,
  ProgressBar,
  Stack,
} from "@/shared/ui";
import { EChartsTrendChart, type EChartsTrendChartPoint } from "@/modules/zylo-tanker/components/EChartsTrendChart";
import { MOCK_TANKS, MOCK_VESSELS, type MockTank } from "@/modules/zylo-tanker/mock/fleetMock";

/** Écran "Gestion des cuves" (module 2 / 20 de SMART TANKER) — 100 %
 * frontend-only, aucune donnée réelle : tout provient de
 * `mock/fleetMock.ts` (MOCK_VESSELS, MOCK_TANKS). Couvre les six
 * fonctions du cahier des charges : niveaux carburant/cargaison/eau,
 * température, pression, détection de fuite, historique, prévision
 * d'autonomie. Reprend le vocabulaire visuel de
 * `modules/zylo-liquid/screens/tanks-network` (jauge de remplissage,
 * badge produit, indicateur de fuite) sans importer ses composants —
 * `TankGauge`/`TankVisual`/`TankStatusBadge` de zylo-liquid sont couplés
 * aux types capteur (`heightMm`, seuils d'alarme mm) de ce module et ne
 * s'appliquent pas au mock simplifié de zylo-tanker (litres directs) ;
 * seul `TrendChart`, générique sur `{at, value}`, est réellement
 * réutilisable et l'est ici pour la mini-tendance d'historique. */

/** Taux de consommation/déchargement journalier mocké, en fraction de la
 * capacité totale — aucune donnée réelle de débit n'existe encore côté
 * backend SMART TANKER. Volontairement différencié par produit : un
 * combustible de propulsion (Super/Gasoil) se consomme plus vite au
 * jour le jour qu'une cargaison pétrolière ou de l'eau de ballast, qui
 * ne bougent qu'au déchargement. Sert uniquement à donner un ordre de
 * grandeur affiché — jamais présenté comme une mesure réelle. */
const MOCK_DAILY_DRAW_RATE: Record<MockTank["product"], number> = {
  Super: 0.07,
  Gasoil: 0.06,
  Pétrole: 0.015,
  "Eau de ballast": 0.02,
};

const PRODUCT_TONE: Record<MockTank["product"], "primary" | "secondary" | "warning" | "info"> = {
  Super: "primary",
  Gasoil: "secondary",
  Pétrole: "warning",
  "Eau de ballast": "info",
};

function fillPercent(tank: MockTank): number {
  return tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
}

function levelTone(tank: MockTank): "error" | "warning" | "success" {
  if (tank.leakSuspected) return "error";
  const pct = fillPercent(tank);
  if (pct <= 15) return "warning";
  return "success";
}

const TONE_COLOR: Record<"error" | "warning" | "success", string> = {
  error: "var(--color-error)",
  warning: "var(--color-warning)",
  success: "var(--color-success)",
};

/** Estimation grossière "jours restants" = niveau actuel / (capacité ×
 * taux journalier mocké). Toujours annoncée comme une estimation à
 * l'écran — jamais un chiffre présenté comme une mesure certaine. */
function estimateAutonomyDays(tank: MockTank): number {
  const dailyDraw = tank.capacityLiters * MOCK_DAILY_DRAW_RATE[tank.product];
  if (dailyDraw <= 0) return 0;
  return Math.max(0, Math.round(tank.currentLevelLiters / dailyDraw));
}

/** Petit historique mocké déterministe (même tracé à chaque rendu pour une
 * même cuve) : 6 points remontant vers le niveau actuel avec une légère
 * variation dérivée de l'identifiant de la cuve, pas un `Math.random()`
 * qui changerait à chaque re-render. */
function mockHistory(tank: MockTank): EChartsTrendChartPoint[] {
  const seed = tank.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const points: EChartsTrendChartPoint[] = [];
  const hoursAgo = [10, 8, 6, 4, 2, 0];
  for (let i = 0; i < hoursAgo.length; i++) {
    const wobble = ((seed * (i + 1)) % 7) - 3; // -3..+3 %
    const drift = (hoursAgo.length - 1 - i) * (fillPercent(tank) > 20 ? 0.6 : -0.6);
    const pct = Math.max(0, Math.min(100, fillPercent(tank) + wobble * 0.4 + drift));
    const d = new Date();
    d.setHours(d.getHours() - hoursAgo[i]);
    points.push({ at: d.toISOString(), value: Math.round(pct * 10) / 10 });
  }
  return points;
}

function formatLiters(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} L`;
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function TankCard({ tank }: { tank: MockTank }) {
  const pct = fillPercent(tank);
  const tone = levelTone(tank);
  const autonomyDays = estimateAutonomyDays(tank);
  const history = mockHistory(tank);

  return (
    <Card variant={tank.leakSuspected ? "outline" : "default"} className={tank.leakSuspected ? "border-error" : undefined}>
      <CardHeader className="items-start">
        <div>
          <CardTitle>{tank.displayName}</CardTitle>
          <p className="mt-0.5 text-caption text-text-muted">Cuve n°{tank.tankNumber}</p>
        </div>
        <Badge tone={PRODUCT_TONE[tank.product]}>{tank.product}</Badge>
      </CardHeader>

      <CardContent>
        <Stack gap="md">
          {tank.leakSuspected && (
            <div className="flex items-center gap-2 rounded-button bg-error-muted px-3 py-2 text-body-sm font-semibold text-error">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              Fuite suspectée — vérification requise
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-body-sm font-medium text-text">{formatLiters(tank.currentLevelLiters)}</span>
              <span className="text-caption text-text-muted">/ {formatLiters(tank.capacityLiters)}</span>
            </div>
            <ProgressBar percent={pct} color={TONE_COLOR[tone]} />
            <p className="mt-1 text-caption text-text-muted">{pct.toFixed(1)} % de remplissage</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-button bg-surface-muted px-3 py-2">
              <Thermometer className="size-4 text-text-muted" aria-hidden />
              <div>
                <p className="text-caption text-text-muted">Température</p>
                <p className="text-body-sm font-semibold text-text">{tank.temperatureC.toFixed(1)} °C</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-button bg-surface-muted px-3 py-2">
              <GaugeIcon className="size-4 text-text-muted" aria-hidden />
              <div>
                <p className="text-caption text-text-muted">Pression</p>
                <p className="text-body-sm font-semibold text-text">{tank.pressureBar.toFixed(2)} bar</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-button border border-border-subtle px-3 py-2">
            <Clock className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
            <div>
              <p className="text-body-sm font-semibold text-text">≈ {autonomyDays} j restants</p>
              <p className="text-caption text-text-muted">Prévision d&apos;autonomie — estimation mockée, pas une mesure</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-caption font-medium uppercase tracking-wide text-text-muted">Historique récent (remplissage)</p>
            <EChartsTrendChart
              points={history}
              formatValue={(v) => `${v.toFixed(1)} %`}
              formatDate={formatHour}
              seriesLabel={`Historique de remplissage — ${tank.displayName}`}
            />
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function TanksScreen() {
  const [selectedVesselId, setSelectedVesselId] = useState(MOCK_VESSELS[0]?.id ?? "");

  const tanksForVessel = useMemo(
    () => MOCK_TANKS.filter((tank) => tank.vesselId === selectedVesselId),
    [selectedVesselId]
  );

  const leaksCount = tanksForVessel.filter((t) => t.leakSuspected).length;
  const avgFillPct = tanksForVessel.length
    ? tanksForVessel.reduce((sum, t) => sum + fillPercent(t), 0) / tanksForVessel.length
    : 0;

  return (
    <Stack gap="lg">
      <PageHeader
        eyebrow="SMART TANKER — Module 2 / 20"
        title="Gestion des cuves"
        description="Niveaux, température, pression, détection de fuite, historique et prévision d'autonomie — données de démonstration, aucun capteur réel connecté."
      />

      <div role="tablist" aria-label="Navire" className="flex flex-wrap gap-2">
        {MOCK_VESSELS.map((vessel) => {
          const active = vessel.id === selectedVesselId;
          return (
            <button
              key={vessel.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedVesselId(vessel.id)}
              className={
                active
                  ? "rounded-button bg-primary px-4 py-2 text-body-sm font-semibold text-white shadow-soft"
                  : "rounded-button border border-border-subtle bg-surface px-4 py-2 text-body-sm font-medium text-text-muted hover:bg-surface-muted"
              }
            >
              {vessel.name} <span className="opacity-70">({vessel.code})</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi icon={Droplets} label="Cuves suivies" value={tanksForVessel.length} />
        <Kpi
          icon={AlertTriangle}
          label="Fuites suspectées"
          value={leaksCount}
          tone={leaksCount > 0 ? "error" : "success"}
        />
        <Kpi icon={ShieldCheck} label="Remplissage moyen" value={avgFillPct.toFixed(1)} unit="%" />
      </div>

      <Card padding="none">
        <div className="p-6 pb-0">
          <CardSectionHeader title="Cuves du navire sélectionné" />
        </div>
        <CardContent className="p-6 pt-2">
          {tanksForVessel.length === 0 ? (
            <p className="text-body-sm text-text-muted">Aucune cuve mockée pour ce navire.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {tanksForVessel.map((tank) => (
                <TankCard key={tank.id} tank={tank} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="flat">
        <div className="flex items-center gap-2 text-caption text-text-muted">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          Les prévisions d&apos;autonomie et l&apos;historique affichés sont des estimations mockées à des fins de
          démonstration — aucune API SMART TANKER n&apos;est appelée depuis cet écran.
        </div>
      </Card>
    </Stack>
  );
}
