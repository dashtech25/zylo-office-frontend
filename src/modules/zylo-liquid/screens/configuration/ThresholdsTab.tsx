"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { EditTankModal } from "@/modules/zylo-liquid/screens/tank-detail/EditTankModal";
import type { FuelProduct, Station, Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Input, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

type SortKey = "station" | "tank" | "product" | "high" | "preAlarm" | "low" | "water";
type SortDirection = "asc" | "desc";

// Radix `Select.Item` refuse une valeur vide ("" est réservé au reset
// interne du composant) — sentinelle dédiée pour "tous les produits".
const ALL_PRODUCTS = "__all__";

/** Vue consolidée des seuils — Bloc 6 de refonte-configuration-zylo-liquid.md
 * (Phase 4 §6) : remplace l'accordéon station par station (Phase 1 §2.1,
 * un seuil n'était visible qu'après avoir ouvert sa station une par une)
 * par un seul tableau réseau, triable par colonne et filtrable par station
 * ou produit — même principe de barre d'outils au-dessus du tableau que la
 * grille de prix (Phase 3 §6). Ne réimplémente aucun calcul ni aucune
 * validation : réutilise `EditTankModal`, déjà utilisée depuis la
 * page Cuve. Les seuils restent définis par cuve (jamais un pourcentage
 * global) — seul le modèle de présentation change, pas le modèle de
 * données. */
export function ThresholdsTab({
  organizationId,
  stations,
  tanks,
  fuelProducts,
  onUpdated,
}: {
  organizationId: string;
  stations: Station[];
  tanks: Tank[];
  fuelProducts: FuelProduct[];
  onUpdated: () => void;
}) {
  const t = useTranslations("zyloLiquid.configuration.thresholds");
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState(ALL_PRODUCTS);
  const [sortKey, setSortKey] = useState<SortKey>("station");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const fuelProductNameById = useMemo(() => new Map(fuelProducts.map((p) => [p.id, p.name])), [fuelProducts]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tanks
      .filter((tank) => tank.active)
      .map((tank) => ({
        tank,
        station: stationById.get(tank.stationId) ?? null,
        productName: fuelProductNameById.get(tank.fuelProductId) ?? "?",
      }))
      .filter((row) => productFilter === ALL_PRODUCTS || row.tank.fuelProductId === productFilter)
      .filter((row) => {
        if (!normalizedQuery) return true;
        return row.station?.name.toLowerCase().includes(normalizedQuery) || row.tank.displayName.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case "station":
            cmp = (a.station?.name ?? "").localeCompare(b.station?.name ?? "");
            break;
          case "tank":
            cmp = a.tank.displayName.localeCompare(b.tank.displayName);
            break;
          case "product":
            cmp = a.productName.localeCompare(b.productName);
            break;
          case "high":
            cmp = (a.tank.heightAlarmMm ?? 0) - (b.tank.heightAlarmMm ?? 0);
            break;
          case "preAlarm":
            cmp = (a.tank.heightAlertMm ?? 0) - (b.tank.heightAlertMm ?? 0);
            break;
          case "low":
            cmp = (a.tank.lowAlarmMm ?? 0) - (b.tank.lowAlarmMm ?? 0);
            break;
          case "water":
            cmp = (a.tank.alertWaterMaxMm ?? 0) - (b.tank.alertWaterMaxMm ?? 0);
            break;
        }
        return sortDirection === "asc" ? cmp : -cmp;
      });
  }, [tanks, stationById, fuelProductNameById, productFilter, query, sortKey, sortDirection]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function SortHeader({ sortKeyValue, label, align }: { sortKeyValue: SortKey; label: string; align?: "right" }) {
    const active = sortKey === sortKeyValue;
    const Icon = active ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <TableHeaderCell className={align === "right" ? "text-right" : undefined}>
        <button type="button" className={`flex items-center gap-1 ${align === "right" ? "ml-auto" : ""}`} onClick={() => toggleSort(sortKeyValue)}>
          {label}
          <Icon className="size-3.5" aria-hidden />
        </button>
      </TableHeaderCell>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{t("banner")}</Alert>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} className="pl-8" />
        </div>
        <Select
          aria-label={t("filterProduct")}
          value={productFilter}
          onValueChange={setProductFilter}
          placeholder={t("filterProduct")}
          options={[{ value: ALL_PRODUCTS, label: t("filterProductAll") }, ...fuelProducts.map((p) => ({ value: p.id, label: p.name }))]}
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-body-sm text-text-muted">{t("empty")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <SortHeader sortKeyValue="station" label={t("columns.station")} />
              <SortHeader sortKeyValue="tank" label={t("columns.tank")} />
              <SortHeader sortKeyValue="product" label={t("columns.product")} />
              <SortHeader sortKeyValue="high" label={t("columns.high")} align="right" />
              <SortHeader sortKeyValue="preAlarm" label={t("columns.preAlarm")} align="right" />
              <SortHeader sortKeyValue="low" label={t("columns.low")} align="right" />
              <SortHeader sortKeyValue="water" label={t("columns.water")} align="right" />
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ tank, station, productName }) => (
              <TableRow key={tank.id}>
                <TableCell className="font-medium">{station?.name ?? "—"}</TableCell>
                <TableCell>{tank.displayName}</TableCell>
                <TableCell className="text-text-muted">{productName}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{tank.heightAlarmMm} mm</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{tank.heightAlertMm} mm</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{tank.lowAlarmMm} mm</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{tank.alertWaterMaxMm} mm</TableCell>
                <TableCell className="text-right">
                  <button type="button" onClick={() => setEditingTank(tank)} className="text-caption font-medium text-primary hover:underline">
                    {t("edit")}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editingTank && (
        <EditTankModal
          organizationId={organizationId}
          tank={editingTank}
          open={editingTank !== null}
          onOpenChange={(next: boolean) => !next && setEditingTank(null)}
          onUpdated={() => {
            setEditingTank(null);
            onUpdated();
          }}
        />
      )}
    </div>
  );
}
