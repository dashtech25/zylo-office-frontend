"use client";

import { Activity, Calendar, Coins, Gauge, Route, Ship } from "lucide-react";

import { Badge } from "@/shared/ui/Badge";
import { Card, CardContent } from "@/shared/ui/Card";
import { CardSectionHeader } from "@/shared/ui/CardSectionHeader";
import { Kpi } from "@/shared/ui/Kpi";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Stack } from "@/shared/ui/Stack";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui/Table";
import { Tabs } from "@/shared/ui/Tabs";

import { EChartsTrendChart } from "@/modules/zylo-tanker/components/EChartsTrendChart";
import { MOCK_VESSELS, mockConsumptionSeries, type MockVessel } from "@/modules/zylo-tanker/mock/fleetMock";

/** Module 9 "Consommation carburant" de SMART TANKER — écran frontend-only,
 * aucune donnée réelle branchée. Suit le même patron que
 * screens/dashboard/DashboardScreen.tsx (sélecteur de navire en Tabs
 * "pills", composition pure à partir de shared/ui + TrendChart de
 * zylo-liquid). Les trajets passés sont mockés localement à cet écran
 * (aucun module métier "trajets" n'existe encore côté backend) — ne pas les
 * déplacer dans fleetMock.ts tant qu'un second écran n'en a pas besoin. */

/** Prix carburant mocké — aucune source réelle branchée, utilisé uniquement
 * pour estimer un coût journalier illustratif. */
const FUEL_PRICE_XAF_PER_LITER = 650;

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XAF",
  maximumFractionDigits: 0,
});

const litersFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function formatLiters(value: number): string {
  return `${litersFormatter.format(value)} L`;
}

interface MockTrip {
  id: string;
  vesselId: string;
  route: string;
  date: string;
  distanceNm: number;
  liters: number;
}

/** Trajets passés illustratifs — 2 à 3 par navire, cohérents avec les ports
 * du golfe de Guinée déjà utilisés ailleurs dans le mock (Douala, Kribi,
 * Limbé). Purement démonstratif : aucun historique réel n'existe encore. */
const MOCK_TRIPS: MockTrip[] = [
  { id: "tr1", vesselId: "v1", route: "Douala → Kribi", date: "2026-09-10", distanceNm: 92, liters: 14200 },
  { id: "tr1b", vesselId: "v1", route: "Kribi → Douala", date: "2026-09-12", distanceNm: 92, liters: 13850 },
  { id: "tr1c", vesselId: "v1", route: "Douala → Limbé", date: "2026-09-14", distanceNm: 58, liters: 8900 },
  { id: "tr2", vesselId: "v2", route: "Limbé → Douala", date: "2026-09-09", distanceNm: 58, liters: 4100 },
  { id: "tr2b", vesselId: "v2", route: "Douala → Douala (cabotage)", date: "2026-09-13", distanceNm: 21, liters: 1650 },
];

function tripCost(liters: number): number {
  return liters * FUEL_PRICE_XAF_PER_LITER;
}

function VesselConsumption({ vessel }: { vessel: MockVessel }) {
  const series = mockConsumptionSeries(vessel.id);
  const lastPoint = series[series.length - 1];
  const dailyTotalLiters = series.reduce((sum, p) => sum + p.liters, 0);
  const dailyCost = dailyTotalLiters * FUEL_PRICE_XAF_PER_LITER;
  const trendPoints = series.map((p) => ({ at: p.timestamp, value: p.liters }));
  const trips = MOCK_TRIPS.filter((t) => t.vesselId === vessel.id);

  return (
    <Stack gap="lg">
      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          icon={Gauge}
          label="Consommation instantanée"
          value={formatLiters(lastPoint.liters)}
          unit="/h"
          sub="Estimation — débit horaire extrapolé du dernier relevé"
        />
        <Kpi
          icon={Activity}
          label="Consommation journalière"
          value={formatLiters(dailyTotalLiters)}
          sub="Cumul des 24 dernières heures"
        />
        <Kpi
          icon={Coins}
          label="Coût estimé du jour"
          value={currencyFormatter.format(dailyCost)}
          sub={`Estimation — ${litersFormatter.format(FUEL_PRICE_XAF_PER_LITER)} XAF/L (prix mocké)`}
        />
      </div>

      {/* Graphique 24h */}
      <Card>
        <CardSectionHeader icon={Activity} title="Consommation horaire (24h)" />
        <CardContent>
          <EChartsTrendChart
            points={trendPoints}
            formatValue={(v) => formatLiters(v)}
            formatDate={(at) => at}
            seriesLabel={`Consommation de ${vessel.name} sur 24h`}
          />
        </CardContent>
      </Card>

      {/* Par trajet */}
      <Card>
        <CardSectionHeader icon={Route} title="Consommation par trajet" />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Trajet</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Distance</TableHeaderCell>
                <TableHeaderCell>Consommation</TableHeaderCell>
                <TableHeaderCell>Coût estimé</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-medium text-text">{trip.route}</TableCell>
                  <TableCell>{new Date(trip.date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="tabular-nums">{trip.distanceNm} nq</TableCell>
                  <TableCell className="tabular-nums">{formatLiters(trip.liters)}</TableCell>
                  <TableCell className="tabular-nums">{currencyFormatter.format(tripCost(trip.liters))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-caption text-text-muted">
            Données illustratives — historique de trajets non encore branché à une source réelle.
          </p>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default function ConsumptionScreen() {
  return (
    <Stack gap="lg">
      <PageHeader
        eyebrow="SMART TANKER"
        title="Consommation carburant"
        description="Consommation instantanée, journalière, par trajet et coûts associés — par navire."
      />

      <Tabs
        variant="pills"
        defaultValue={MOCK_VESSELS[0]?.id}
        items={MOCK_VESSELS.map((vessel) => ({
          value: vessel.id,
          label: (
            <span className="flex items-center gap-1.5">
              <Ship className="size-3.5" aria-hidden />
              {vessel.name}
              <Badge tone="neutral" className="ml-1">
                <Calendar className="mr-1 size-3" aria-hidden />
                {vessel.code}
              </Badge>
            </span>
          ),
          content: <VesselConsumption vessel={vessel} />,
        }))}
      />
    </Stack>
  );
}
