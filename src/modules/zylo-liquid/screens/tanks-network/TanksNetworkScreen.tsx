"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { computeTankVisualData, TankVisual } from "@/modules/zylo-liquid/components/TankVisual";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { Alert, Badge, Card, EmptyState, Input, PageHeader, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useTanksNetwork } from "./useTanksNetwork";

type Freshness = "ok" | "late" | "old" | "never";

function freshnessOf(lastMeasurementAt: string | null): Freshness {
  if (!lastMeasurementAt) return "never";
  const ageMin = (Date.now() - new Date(lastMeasurementAt).getTime()) / 60000;
  if (ageMin <= 15) return "ok";
  if (ageMin <= 45) return "late";
  return "old";
}

const FRESHNESS_TONE = { ok: "success", late: "warning", old: "error", never: "neutral" } as const;

/** Reproduit fidèlement `pageCuves()` du prototype validé (prototype.html,
 * ~ligne 4072) : filtres (station/produit/recherche), grille de vignettes
 * et tableau de synthèse. Les colonnes "Vendable" et "Couverture" restent
 * désactivées — le prototype les calcule sur une hypothèse déclarée (fond
 * de cuve en %) ou un débit de vente que le Niveau 1 ne fournit pas. Le
 * filtre "Rupture imminente" du prototype (basé sur la couverture) n'est
 * pas repris pour la même raison — un filtre qui ne filtrerait jamais rien
 * serait plus trompeur qu'absent. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
export default function TanksNetworkScreen() {
  const t = useTranslations("zyloLiquid.tanksNetwork");
  const tCommon = useTranslations("common");
  const tStations = useTranslations("zyloLiquid.stations");
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const data = useTanksNetwork(currentOrganization?.id ?? null);

  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  function formatVolume(liters: number): string {
    return `${formatLiters(liters)} L`;
  }

  const filteredRows = useMemo(() => {
    return data.rows
      .filter((row) => {
        if (stationFilter && row.station.id !== stationFilter) return false;
        if (productFilter && row.tank.fuelProductId !== productFilter) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (!`${row.tank.displayName} ${row.tank.tankNumber} ${row.station.name} ${row.station.code}`.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.state?.volumeLiters ?? -1) - (b.state?.volumeLiters ?? -1));
  }, [data.rows, search, stationFilter, productFilter]);

  return (
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle", { count: data.rows.length })} />

      {data.error && <Alert tone="error">{data.error}</Alert>}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[200px] flex-1">
                <Input icon={<Search className="size-4" aria-hidden />} placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("searchPlaceholder")} />
              </div>
              <div className="w-full sm:w-56">
                <Select
                  aria-label={t("filterStation")}
                  value={stationFilter || undefined}
                  onValueChange={(v) => setStationFilter(v === "__all__" ? "" : v)}
                  placeholder={t("filterStation")}
                  options={[{ value: "__all__", label: t("filterStation") }, ...data.stations.map((s) => ({ value: s.id, label: s.name }))]}
                />
              </div>
              <div className="w-full sm:w-56">
                <Select
                  aria-label={t("filterProduct")}
                  value={productFilter || undefined}
                  onValueChange={(v) => setProductFilter(v === "__all__" ? "" : v)}
                  placeholder={t("filterProduct")}
                  options={[{ value: "__all__", label: t("filterProduct") }, ...data.fuelProducts.map((p) => ({ value: p.id, label: p.name }))]}
                />
              </div>
            </div>
          </Card>

          {filteredRows.length === 0 ? (
            <EmptyState title={t("empty")} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredRows.map(({ tank, station, fuelProduct, state }) => (
                  <Card key={tank.id} className="flex flex-col items-center gap-2">
                    <div className="w-full">
                      <div className="truncate text-body-sm font-semibold text-text">
                        {station.code} · {tank.displayName}
                      </div>
                      <div className="truncate text-caption text-text-muted">{fuelProduct?.name ?? "?"}</div>
                    </div>
                    <div className="flex w-full justify-center py-1">{state ? <TankVisual tank={tank} state={state} mode="compact" fuelColor={fuelProduct?.displayColor} /> : <span className="text-caption text-text-muted">—</span>}</div>
                    <Link href={`/zylo-liquid/stations/${station.id}/tanks/${tank.id}`} className="text-caption font-medium text-primary hover:underline">
                      {tCommon("actions.open")}
                    </Link>
                  </Card>
                ))}
              </div>

              <Card padding="none">
                <div className="flex flex-col gap-1 p-5 pb-0">
                  <h2 className="text-h4 font-semibold text-text">{t("table.title")}</h2>
                  <p className="text-body-sm text-text-muted">{t("table.subtitle")}</p>
                </div>
                <div className="p-5">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>{t("table.station")}</TableHeaderCell>
                        <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
                        <TableHeaderCell>{t("table.product")}</TableHeaderCell>
                        <TableHeaderCell className="text-right">{t("table.volume")}</TableHeaderCell>
                        <TableHeaderCell className="text-right">{t("table.sellable")}</TableHeaderCell>
                        <TableHeaderCell className="text-right">{t("table.correctedAt15C")}</TableHeaderCell>
                        <TableHeaderCell className="text-right">{t("table.capacity")}</TableHeaderCell>
                        <TableHeaderCell className="text-right">{t("table.water")}</TableHeaderCell>
                        <TableHeaderCell className="text-right">{t("table.available")}</TableHeaderCell>
                        <TableHeaderCell className="text-right">{t("table.temperature")}</TableHeaderCell>
                        <TableHeaderCell className="text-right">{t("table.coverage")}</TableHeaderCell>
                        <TableHeaderCell>{t("table.data")}</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRows.map(({ tank, station, fuelProduct, state }) => {
                        const fresh = freshnessOf(state?.lastMeasurementAt ?? null);
                        const visual = state ? computeTankVisualData(tank, state) : null;
                        const waterAlert = Boolean(state?.waterHeightMm && state.waterHeightMm > tank.alertWaterMaxMm);
                        return (
                          <TableRow key={tank.id} clickable onClick={() => router.push(`/zylo-liquid/stations/${station.id}/tanks/${tank.id}`)}>
                            <TableCell>{station.code}</TableCell>
                            <TableCell>{tank.displayName}</TableCell>
                            <TableCell>{fuelProduct?.name ?? "?"}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{state?.volumeLiters === null || state?.volumeLiters === undefined ? "—" : formatVolume(state.volumeLiters)}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {state?.sellableVolumeLiters === null || state?.sellableVolumeLiters === undefined ? "—" : formatVolume(state.sellableVolumeLiters)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {state?.volumeLiters15C === null || state?.volumeLiters15C === undefined ? "—" : formatVolume(state.volumeLiters15C)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{formatVolume(tank.calibratedCapacityLiters ?? tank.capacityLiters)}</TableCell>
                            <TableCell className={`text-right font-mono tabular-nums ${waterAlert ? "text-error" : ""}`}>
                              {state?.waterHeightMm === null || state?.waterHeightMm === undefined ? "—" : `${Math.round(state.waterHeightMm)} mm`}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{visual ? formatVolume(visual.emptyVolumeLiters) : "—"}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{state?.temperatureC === null || state?.temperatureC === undefined ? "—" : `${state.temperatureC.toFixed(1)} °C`}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-text-muted">—</TableCell>
                            <TableCell>
                              <Badge tone={FRESHNESS_TONE[fresh]} dot>
                                {tStations(`freshness.${fresh}`)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </Stack>
  );
}
