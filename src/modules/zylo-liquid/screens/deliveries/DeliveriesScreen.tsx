"use client";

import { Download, Truck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { downloadCsv } from "@/modules/zylo-liquid/utils/downloadCsv";
import { Alert, Button, Card, EmptyState, Input, Kpi, PageHeader, Select, Stack, Table, TableBody, TableHead, TableHeaderCell, TableRow, Tabs } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

import { DeliveriesInProgressSection } from "./DeliveriesInProgressSection";
import { DeliveriesTable } from "./DeliveriesTable";
import { DeliveryDetailModal } from "./DeliveryDetailModal";
import { DeliveryInProgressDetailModal } from "./DeliveryInProgressDetailModal";
import { StationDeliveryGroup } from "./StationDeliveryGroup";
import { useDeliveriesInProgress, type DeliveryInProgressRow } from "./useDeliveriesInProgress";
import { useDeliveriesList, type DeliveryRow } from "./useDeliveriesList";

/** Registre des livraisons détectées automatiquement (saut de niveau en
 * cuve) — pas de fournisseur, pas de saisie manuelle, pas de comparatif
 * Auto/Manuel : décision produit déjà actée (voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md,
 * item #19 — "aucun endpoint de création manuelle" pour les livraisons).
 * Deux vues sur les mêmes données réelles : liste plate, ou groupée par
 * station (repli/dépli dans la même page, sans navigation). Le clic sur
 * une livraison ouvre le détail avec les mesures réelles de la sonde
 * pendant sa fenêtre de détection. */
export default function DeliveriesScreen() {
  const t = useTranslations("zyloLiquid.deliveries");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();

  const [stationId, setStationId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedRow, setSelectedRow] = useState<DeliveryRow | null>(null);
  const [selectedInProgressRow, setSelectedInProgressRow] = useState<DeliveryInProgressRow | null>(null);

  const filters = useMemo(
    () => ({
      stationId: stationId || undefined,
      fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDate: toDate ? new Date(toDate).toISOString() : undefined,
    }),
    [stationId, fromDate, toDate]
  );

  const data = useDeliveriesList(currentOrganization?.id ?? null, filters);
  const inProgress = useDeliveriesInProgress(currentOrganization?.id ?? null, data.tanks, data.stations, data.fuelProducts);

  function handleExport() {
    const header = [t("table.date"), t("table.station"), t("table.tank"), t("table.heightBefore"), t("table.heightAfter"), t("table.received"), t("table.value")];
    const csvRows = data.rows.map(({ delivery, tank, station, fuelProduct, valueAmount, currencyCode }) => [
      format.dateTime(new Date(delivery.endTime)),
      station?.name ?? "",
      `${tank?.displayName ?? ""} ${fuelProduct?.name ?? ""}`.trim(),
      `${delivery.startHeightMm}`,
      `${delivery.endHeightMm}`,
      delivery.volumeLiters === null ? "" : `${formatLiters(delivery.volumeLiters)} L`,
      valueAmount !== null && currencyCode ? formatMoney(format, valueAmount, currencyCode) : "",
    ]);
    downloadCsv("livraisons.csv", [header, ...csvRows]);
  }

  return (
    <Stack>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubtitle", { count: data.rows.length })}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={data.rows.length === 0}>
            <Download className="size-4" aria-hidden />
            {t("filters.export")}
          </Button>
        }
      />

      {data.error && <Alert tone="error">{data.error}</Alert>}

      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="w-full sm:w-56">
            <Select
              aria-label={t("filters.station")}
              value={stationId || "__all__"}
              onValueChange={(v) => setStationId(v === "__all__" ? "" : v)}
              options={[{ value: "__all__", label: t("filters.stationAll") }, ...data.stations.map((s) => ({ value: s.id, label: s.name }))]}
            />
          </div>
          <div className="w-full sm:w-44">
            <Input type="date" aria-label={t("filters.fromDate")} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="w-full sm:w-44">
            <Input type="date" aria-label={t("filters.toDate")} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </Card>

      <DeliveriesInProgressSection rows={inProgress.rows} onRowClick={setSelectedInProgressRow} />

      {data.productSummaries.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.productSummaries.map((p) => (
            <Kpi
              key={p.fuelProductId}
              label={p.fuelProductName}
              value={formatLiters(p.volumeLiters)}
              unit="L"
              sub={`${t("summary.count", { count: p.count })} · ${p.valueAmount !== null && p.currencyCode ? formatMoney(format, p.valueAmount, p.currencyCode) : t("summary.valueNotCalculable")}`}
            />
          ))}
        </div>
      )}

      {data.loading ? (
        <Card padding="none">
          <div className="p-5">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("table.date")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.station")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.heightBefore")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.heightAfter")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.received")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.value")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : data.rows.length === 0 ? (
        <EmptyState icon={Truck} title={t("empty")} />
      ) : (
        <Tabs
          items={[
            {
              value: "all",
              label: t("views.all"),
              content: (
                <Card padding="none">
                  <div className="p-5">
                    <DeliveriesTable rows={data.rows} onRowClick={setSelectedRow} />
                  </div>
                </Card>
              ),
            },
            {
              value: "byStation",
              label: t("views.byStation"),
              content:
                data.stationGroups.length === 0 ? (
                  <EmptyState title={t("noStation")} />
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.stationGroups.map((group) => (
                      <StationDeliveryGroup key={group.station.id} group={group} onRowClick={setSelectedRow} />
                    ))}
                  </div>
                ),
            },
          ]}
        />
      )}

      {selectedRow && currentOrganization && <DeliveryDetailModal organizationId={currentOrganization.id} row={selectedRow} onClose={() => setSelectedRow(null)} />}
      {selectedInProgressRow && currentOrganization && (
        <DeliveryInProgressDetailModal organizationId={currentOrganization.id} row={selectedInProgressRow} onClose={() => setSelectedInProgressRow(null)} />
      )}
    </Stack>
  );
}
