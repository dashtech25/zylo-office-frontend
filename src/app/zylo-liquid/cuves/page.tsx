"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { EmptyState } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { TankVisual, computeTankVisualData } from "../_components/TankVisual";
import { useTanksNetwork } from "./_lib/useTanksNetwork";

type Freshness = "ok" | "late" | "old" | "never";

function freshnessOf(lastMeasurementAt: string | null): Freshness {
  if (!lastMeasurementAt) return "never";
  const ageMin = (Date.now() - new Date(lastMeasurementAt).getTime()) / 60000;
  if (ageMin <= 15) return "ok";
  if (ageMin <= 45) return "late";
  return "old";
}

/** Reproduit fidèlement `pageCuves()` du prototype validé (prototype.html,
 * ~ligne 4072) : filtres (station/produit/recherche), grille de vignettes
 * et tableau de synthèse. Les colonnes "Vendable" et "Couverture" restent
 * désactivées — le prototype les calcule sur une hypothèse déclarée (fond
 * de cuve en %) ou un débit de vente que le Niveau 1 ne fournit pas. Le
 * filtre "Rupture imminente" du prototype (basé sur la couverture) n'est
 * pas repris pour la même raison — un filtre qui ne filtrerait jamais rien
 * serait plus trompeur qu'absent. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
export default function TanksNetworkPage() {
  const t = useTranslations("zyloLiquid.tanksNetwork");
  const tCommon = useTranslations("common");
  const tStations = useTranslations("zyloLiquid.stations");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useTanksNetwork(currentOrganization?.id ?? null);

  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  function formatVolume(liters: number): string {
    return `${format.number(Math.round(liters))} L`;
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
    <>
      <div className="page-head">
        <div className="ph-text">
          <h1>{t("pageTitle")}</h1>
          <div className="ph-sub">{t("pageSubtitle", { count: data.rows.length })}</div>
        </div>
      </div>

      {data.error && (
        <div className="banner crit">
          <div>{data.error}</div>
        </div>
      )}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row">
              <div style={{ flex: 1, minWidth: 200 }}>
                <input className="f" placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("searchPlaceholder")} />
              </div>
              <select className="f" style={{ width: "auto" }} value={stationFilter} onChange={(e) => setStationFilter(e.target.value)} aria-label={t("filterStation")}>
                <option value="">{t("filterStation")}</option>
                {data.stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select className="f" style={{ width: "auto" }} value={productFilter} onChange={(e) => setProductFilter(e.target.value)} aria-label={t("filterProduct")}>
                <option value="">{t("filterProduct")}</option>
                {data.fuelProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <EmptyState title={t("empty")} />
          ) : (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="grid g4">
                  {filteredRows.map(({ tank, station, fuelProduct, state }) => (
                    <div key={tank.id} className="tankcard">
                      <div className="tank-top">
                        <div style={{ flex: 1 }}>
                          <div className="tt-name">
                            {station.code} · {tank.displayName}
                          </div>
                          <div className="tt-prod">{fuelProduct?.name ?? "?"}</div>
                        </div>
                      </div>
                      <div className="row" style={{ justifyContent: "center" }}>
                        {state ? (
                          <TankVisual tank={tank} state={state} mode="compact" fuelColor={fuelProduct?.displayColor} />
                        ) : (
                          <span className="xsmall dim">—</span>
                        )}
                      </div>
                      <Link href={`/zylo-liquid/stations/${station.id}/tanks/${tank.id}`} className="small strong">
                        {tCommon("actions.open")}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: 16 }} className="card-head">
                  <div style={{ flex: 1 }}>
                    <h2>{t("table.title")}</h2>
                    <div className="ch-sub">{t("table.subtitle")}</div>
                  </div>
                </div>
                <div className="tw" style={{ border: "none" }}>
                  <table className="t">
                    <thead>
                      <tr>
                        <th>{t("table.station")}</th>
                        <th>{t("table.tank")}</th>
                        <th>{t("table.product")}</th>
                        <th className="r">{t("table.volume")}</th>
                        <th className="r">{t("table.capacity")}</th>
                        <th className="r">{t("table.sellable")}</th>
                        <th className="r">{t("table.water")}</th>
                        <th className="r">{t("table.available")}</th>
                        <th className="r">{t("table.temperature")}</th>
                        <th className="r">{t("table.coverage")}</th>
                        <th>{t("table.data")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map(({ tank, station, fuelProduct, state }) => {
                        const fresh = freshnessOf(state?.lastMeasurementAt ?? null);
                        const visual = state ? computeTankVisualData(tank, state) : null;
                        return (
                          <tr key={tank.id} className="clickable" onClick={() => (window.location.href = `/zylo-liquid/stations/${station.id}/tanks/${tank.id}`)}>
                            <td>{station.code}</td>
                            <td>{tank.displayName}</td>
                            <td>{fuelProduct?.name ?? "?"}</td>
                            <td className="r mono">{state?.volumeLiters === null || state?.volumeLiters === undefined ? "—" : formatVolume(state.volumeLiters)}</td>
                            <td className="r mono">{formatVolume(tank.calibratedCapacityLiters ?? tank.capacityLiters)}</td>
                            <td className="r mono dim">—</td>
                            <td className="r mono" style={{ color: state?.waterHeightMm && state.waterHeightMm > tank.alertWaterMaxMm ? "var(--crit)" : undefined }}>
                              {state?.waterHeightMm === null || state?.waterHeightMm === undefined ? "—" : `${Math.round(state.waterHeightMm)} mm`}
                            </td>
                            <td className="r mono">{visual ? formatVolume(visual.emptyVolumeLiters) : "—"}</td>
                            <td className="r mono">{state?.temperatureC === null || state?.temperatureC === undefined ? "—" : `${state.temperatureC.toFixed(1)} °C`}</td>
                            <td className="r mono dim">—</td>
                            <td>
                              <span className={`fresh f-${fresh === "never" ? "old" : fresh}`}>
                                <span className="fd" />
                                {tStations(`freshness.${fresh}`)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
