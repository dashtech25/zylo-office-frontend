"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { OrganizationMember } from "@/core/api/rbac";
import {
  listPrices,
  type City,
  type Currency,
  type FuelProduct,
  type Station,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, Input, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

const PAGE_SIZE = 25;

/** Historique complet des prix, filtrable par station/produit et par plage
 * de dates arbitraire, avec pagination serveur réelle — le backend
 * (`GET /prices`) supportait déjà `fromDate`/`toDate`/`limit`/`offset`,
 * jamais exploités par le frontend jusqu'ici : chaque écran ne récupérait
 * qu'un lot fixe (50-100 lignes) sans pouvoir remonter au-delà (P1-10,
 * audit module Stations 2026-09-16 — "le backend semble déjà supporter un
 * système complet, le frontend ne le présente pas encore de façon
 * satisfaisante"). Ne remplace pas la grille courante (PriceNetworkGrid,
 * prix actuellement applicables) : complémentaire, pour l'audit d'un
 * historique long. */
export function PriceHistoryBrowser({
  organizationId,
  stations,
  cities,
  fuelProducts,
  currencies,
  members,
}: {
  organizationId: string;
  stations: Station[];
  cities: City[];
  fuelProducts: FuelProduct[];
  currencies: Currency[];
  members: OrganizationMember[];
}) {
  const t = useTranslations("zyloLiquid.configuration.prices.history");
  const format = useFormatter();
  const [stationId, setStationId] = useState("");
  const [fuelProductId, setFuelProductId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ["zylo-liquid", "price-history-browser", organizationId, stationId, fuelProductId, fromDate, toDate, offset],
    queryFn: () =>
      listPrices(organizationId, {
        stationId: stationId || undefined,
        fuelProductId: fuelProductId || undefined,
        fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
        toDate: toDate ? new Date(toDate).toISOString() : undefined,
        limit: PAGE_SIZE,
        offset,
      }),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const hasPrevious = offset > 0;
  const hasNext = offset + rows.length < total;

  const stationById = new Map(stations.map((s) => [s.id, s]));
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const fuelProductById = new Map(fuelProducts.map((p) => [p.id, p]));
  const currencyById = new Map(currencies.map((c) => [c.id, c]));
  const memberById = new Map(members.map((m) => [m.userId, m]));

  function resetToFirstPage() {
    setOffset(0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          aria-label={t("station")}
          value={stationId}
          onValueChange={(v) => {
            setStationId(v);
            resetToFirstPage();
          }}
          options={[{ value: "", label: t("allStations") }, ...stations.map((s) => ({ value: s.id, label: s.name }))]}
        />
        <Select
          aria-label={t("product")}
          value={fuelProductId}
          onValueChange={(v) => {
            setFuelProductId(v);
            resetToFirstPage();
          }}
          options={[{ value: "", label: t("allProducts") }, ...fuelProducts.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <Input
          type="date"
          aria-label={t("fromDate")}
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            resetToFirstPage();
          }}
        />
        <Input
          type="date"
          aria-label={t("toDate")}
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            resetToFirstPage();
          }}
        />
      </div>

      {query.error && <Alert tone="error">{t("error")}</Alert>}

      {query.isPending ? (
        <Table>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={6} />
            ))}
          </TableBody>
        </Table>
      ) : rows.length === 0 ? (
        <p className="text-body-sm text-text-muted">{t("empty")}</p>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("columns.effectiveFrom")}</TableHeaderCell>
                <TableHeaderCell>{t("columns.station")}</TableHeaderCell>
                <TableHeaderCell>{t("columns.product")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("columns.price")}</TableHeaderCell>
                <TableHeaderCell>{t("columns.reason")}</TableHeaderCell>
                <TableHeaderCell>{t("columns.author")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((entry) => {
                const station = entry.stationId ? stationById.get(entry.stationId) : null;
                const city = station?.cityId ? cityById.get(station.cityId) : null;
                const currency = currencyById.get(entry.currencyId);
                const author = memberById.get(entry.createdBy);
                return (
                  <TableRow key={entry.id}>
                    <TableCell>{format.dateTime(new Date(entry.effectiveFrom), { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                    <TableCell>{station ? `${station.name}${city ? ` (${city.name})` : ""}` : t("networkDefault")}</TableCell>
                    <TableCell>{fuelProductById.get(entry.fuelProductId)?.name ?? "?"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {entry.priceAmount} {currency?.code ?? ""}
                    </TableCell>
                    <TableCell className="text-text-muted">{entry.changeReason ?? "—"}</TableCell>
                    <TableCell className="text-text-muted">{author?.fullName ?? t("unknownAuthor")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <span className="text-caption text-text-muted">{t("pageInfo", { from: offset + 1, to: offset + rows.length, total })}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrevious} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                <ChevronLeft className="size-4" aria-hidden />
                {t("previous")}
              </Button>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setOffset(offset + PAGE_SIZE)}>
                {t("next")}
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
