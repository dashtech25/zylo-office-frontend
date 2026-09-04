"use client";

import { Banknote, Check, Scale, Truck } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { Alert, Card, EmptyState, Kpi, PageHeader, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useDeliveriesList } from "./useDeliveriesList";

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
export default function DeliveriesScreen() {
  const t = useTranslations("zyloLiquid.deliveries");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useDeliveriesList(currentOrganization?.id ?? null);

  function formatVolume(liters: number): string {
    return `${formatLiters(liters)} L`;
  }
  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle", { count: data.rows.length })} />

      {data.error && <Alert tone="error">{data.error}</Alert>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Truck} label={t("kpis.volumeReceived.label")} value={formatVolume(data.totalVolumeLiters)} tone="primary" sub={t("kpis.volumeReceived.sub", { count: data.rows.length })} />
        <Kpi icon={Scale} label={t("kpis.gapCumulative.label")} disabled disabledLabel={tCommon("states.comingSoon")} />
        <Kpi icon={Check} label={t("kpis.complianceRate.label")} disabled disabledLabel={tCommon("states.comingSoon")} />
        <Kpi icon={Banknote} label={t("kpis.financialImpact.label")} disabled disabledLabel={tCommon("states.comingSoon")} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-h4 font-semibold text-text">{t("suppliers.title")}</h2>
          <div className="mt-3">
            <EmptyState title={tCommon("states.comingSoon")} />
          </div>
        </Card>
        <Card>
          <h2 className="text-h4 font-semibold text-text">{t("chart.title")}</h2>
          <p className="mt-1 text-body-sm text-text-muted">{t("chart.subtitle")}</p>
          <div className="mt-3">
            <EmptyState title={tCommon("states.comingSoon")} />
          </div>
        </Card>
      </div>

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : data.rows.length === 0 ? (
        <EmptyState icon={Truck} title={t("empty")} />
      ) : (
        <Card padding="none">
          <div className="flex flex-col gap-1 p-5 pb-0">
            <h2 className="text-h4 font-semibold text-text">{t("table.title")}</h2>
            <p className="text-body-sm text-text-muted">{t("table.subtitle")}</p>
          </div>
          <div className="p-5">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("table.date")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.station")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.supplier")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.declared")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.received")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.gap")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.impact")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rows.map(({ delivery, tank, station, fuelProduct }) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-mono tabular-nums">{formatDateTime(delivery.endTime)}</TableCell>
                    <TableCell>{station ? <Link href={`/zylo-liquid/stations/${station.id}`} className="text-primary hover:underline">{station.code}</Link> : "—"}</TableCell>
                    <TableCell>
                      {tank?.displayName ?? "—"} · {fuelProduct?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-text-muted">—</TableCell>
                    <TableCell className="text-right text-text-muted">—</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{delivery.volumeLiters === null ? "—" : formatVolume(delivery.volumeLiters)}</TableCell>
                    <TableCell className="text-right text-text-muted">—</TableCell>
                    <TableCell className="text-right text-text-muted">—</TableCell>
                    <TableCell className="text-text-muted">—</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </Stack>
  );
}
