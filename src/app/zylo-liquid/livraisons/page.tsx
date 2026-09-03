"use client";

import { Banknote, Check, Scale, Truck } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { EmptyState } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { Kpi } from "../_components/Kpi";
import { useDeliveriesList } from "./_lib/useDeliveriesList";

/** Reproduit la structure de `pageLivraisons()` du prototype validé
 * (prototype.html, ~ligne 4477) : KPI, fiabilité fournisseur, graphique de
 * réapprovisionnement, journal des réceptions.
 *
 * Différence assumée avec le prototype : celui-ci compare un "bon de
 * livraison" déclaré à la mesure ATG (écart, conformité, impact financier,
 * fiabilité par fournisseur). Le Niveau 1 n'a ni entité fournisseur, ni
 * bon de livraison, ni saisie manuelle de réception — l'endpoint 10
 * (deliveries) détecte uniquement une livraison par variation de niveau
 * en cuve, sans valeur déclarée à comparer (contrat explicite : "aucun
 * endpoint de création manuelle"). Le journal et le graphique de
 * réapprovisionnement restent donc réels ; le contrôle contradictoire, la
 * fiabilité fournisseur et les KPI qui en dépendent restent désactivés.
 * Voir docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md
 * (item #18 IMPLEMENTER / item #19 NE PAS IMPLÉMENTER). */
export default function DeliveriesListPage() {
  const t = useTranslations("zyloLiquid.deliveries");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useDeliveriesList(currentOrganization?.id ?? null);

  function formatVolume(liters: number): string {
    return `${format.number(Math.round(liters))} L`;
  }
  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

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

      <div className="grid g4 kpi-scroll" style={{ marginBottom: 16 }}>
        <Kpi icon={Truck} label={t("kpis.volumeReceived.label")} value={formatVolume(data.totalVolumeLiters)} tone="brand" sub={t("kpis.volumeReceived.sub", { count: data.rows.length })} />
        <Kpi icon={Scale} label={t("kpis.gapCumulative.label")} disabled />
        <Kpi icon={Check} label={t("kpis.complianceRate.label")} disabled />
        <Kpi icon={Banknote} label={t("kpis.financialImpact.label")} disabled />
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2>{t("suppliers.title")}</h2>
          <div className="empty" style={{ marginTop: 12 }}>
            <div className="e-t">{tCommon("states.comingSoon")}</div>
          </div>
        </div>
        <div className="card">
          <h2>{t("chart.title")}</h2>
          <div className="ch-sub">{t("chart.subtitle")}</div>
          <div className="empty" style={{ marginTop: 12 }}>
            <div className="e-t">{tCommon("states.comingSoon")}</div>
          </div>
        </div>
      </div>

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : data.rows.length === 0 ? (
        <EmptyState icon={Truck} title={t("empty")} />
      ) : (
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
                  <th>{t("table.date")}</th>
                  <th>{t("table.station")}</th>
                  <th>{t("table.tank")}</th>
                  <th>{t("table.supplier")}</th>
                  <th className="r">{t("table.declared")}</th>
                  <th className="r">{t("table.received")}</th>
                  <th className="r">{t("table.gap")}</th>
                  <th className="r">{t("table.impact")}</th>
                  <th>{t("table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(({ delivery, tank, station, fuelProduct }) => (
                  <tr key={delivery.id}>
                    <td className="mono small">{formatDateTime(delivery.endTime)}</td>
                    <td>{station ? <Link href={`/zylo-liquid/stations/${station.id}`}>{station.code}</Link> : "—"}</td>
                    <td>
                      {tank?.displayName ?? "—"} · {fuelProduct?.name ?? "—"}
                    </td>
                    <td className="dim">—</td>
                    <td className="r dim">—</td>
                    <td className="r mono">{delivery.volumeLiters === null ? "—" : formatVolume(delivery.volumeLiters)}</td>
                    <td className="r dim">—</td>
                    <td className="r dim">—</td>
                    <td className="dim">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
