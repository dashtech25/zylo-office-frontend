"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";

import type { Station, StationCurrentState, Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, Button, Modal } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

import { formatPercent } from "@/modules/zylo-liquid/utils/formatPercent";

export interface ProductFilter {
  /** null = vue "Total réseau", tous produits confondus. */
  fuelProductId: string | null;
  /** Libellé déjà résolu par l'appelant (nom du produit, ou la traduction
   * de "Total réseau") — ce composant ne décide jamais lui-même du libellé
   * de la vue "tous produits", pour rester agnostique de l'i18n appelant. */
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductFilter;
  tanks: Tank[];
  stations: Station[];
  stationStates: Record<string, StationCurrentState>;
  fuelProductNameById: Map<string, string>;
  formatVolume: (liters: number) => string;
  formatMoney: (value: number, currencyCode: string) => string;
}

interface TankRow {
  tankId: string;
  label: string;
  volumeLiters: number;
  capacityLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
}

interface StationGroup {
  station: Station;
  online: boolean;
  rows: TankRow[];
}

export function ProductBreakdownModal({
  open,
  onOpenChange,
  product,
  tanks,
  stations,
  stationStates,
  fuelProductNameById,
  formatVolume,
  formatMoney,
}: Props) {
  const t = useTranslations("zyloLiquid.productBreakdown");
  const tStations = useTranslations("zyloLiquid.stations");

  const relevantTanks = tanks.filter((tank) => tank.active && (product.fuelProductId === null || tank.fuelProductId === product.fuelProductId));

  const groups: StationGroup[] = [];
  for (const station of stations) {
    // Une station désactivée ne doit jamais être comptée comme "vendant" le
    // produit, même si une cuve active y reste configurée — sinon ce
    // comptage diverge de `stationCount` de la carte qui ouvre cette modale
    // (celle-ci n'agrège que les stations actives, voir useStationsList.ts)
    // et affiche un nombre de stations trop élevé (P0-4, audit module
    // Stations 2026-09-16).
    if (station.status !== "active") continue;
    const tanksForStation = relevantTanks.filter((tank) => tank.stationId === station.id);
    if (tanksForStation.length === 0) continue;

    const state = stationStates[station.id];
    const online = (state?.tanks ?? []).some((ts) => ts.sensorStatus === "online");

    const rows: TankRow[] = tanksForStation.map((tank) => {
      const tankState = state?.tanks.find((ts) => ts.tankId === tank.id);
      const label =
        product.fuelProductId === null ? `${tank.displayName} (${fuelProductNameById.get(tank.fuelProductId) ?? "?"})` : tank.displayName;
      return {
        tankId: tank.id,
        label,
        volumeLiters: tankState?.volumeLiters ?? 0,
        capacityLiters: tank.calibratedCapacityLiters ?? tank.capacityLiters,
        monetaryValue: tankState?.monetaryValue ?? null,
        currencyCode: tankState?.currencyCode ?? null,
      };
    });

    groups.push({ station, online, rows });
  }

  const totalVolume = groups.reduce((sum, g) => sum + g.rows.reduce((s, r) => s + r.volumeLiters, 0), 0);
  const totalCapacity = groups.reduce((sum, g) => sum + g.rows.reduce((s, r) => s + r.capacityLiters, 0), 0);
  const tankCount = groups.reduce((sum, g) => sum + g.rows.length, 0);
  const currencies = new Set(groups.flatMap((g) => g.rows.map((r) => r.currencyCode).filter((c): c is string => c !== null)));
  const totalValue =
    currencies.size === 1
      ? groups.reduce((sum, g) => sum + g.rows.reduce((s, r) => s + (r.monetaryValue ?? 0), 0), 0)
      : null;
  const totalCurrency = currencies.size === 1 ? [...currencies][0] : null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      closeLabel={t("close")}
      title={t("title", { product: product.name, volume: formatVolume(totalVolume), capacity: formatVolume(totalCapacity) })}
      footer={
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          {t("close")}
        </Button>
      }
      size="xl"
    >
      <div className="mb-4 flex flex-wrap items-center gap-4 text-body-sm text-text-muted">
        <span>{t("stationsConcerned", { count: groups.length })}</span>
        <span>{t("tanksCount", { count: tankCount })}</span>
        {totalValue !== null && totalCurrency !== null && (
          <span className="font-semibold text-text">{t("totalStockValue", { value: formatMoney(totalValue, totalCurrency) })}</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-border-subtle text-caption font-semibold uppercase tracking-wide text-text-muted">
              <th className="py-2 text-left">{t("columns.stationTank")}</th>
              <th className="py-2 text-right">{t("columns.volume")}</th>
              <th className="py-2 text-right">{t("columns.capacity")}</th>
              <th className="py-2 text-left pl-4">{t("columns.rate")}</th>
              <th className="py-2 text-right">{t("columns.value")}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const stationVolume = group.rows.reduce((s, r) => s + r.volumeLiters, 0);
              const stationCapacity = group.rows.reduce((s, r) => s + r.capacityLiters, 0);
              const stationRate = stationCapacity > 0 ? (stationVolume / stationCapacity) * 100 : 0;
              const stationCurrencies = new Set(group.rows.map((r) => r.currencyCode).filter((c): c is string => c !== null));
              const stationValue =
                stationCurrencies.size === 1 ? group.rows.reduce((s, r) => s + (r.monetaryValue ?? 0), 0) : null;

              return (
                <Fragment key={group.station.id}>
                  <tr className="border-b border-border-subtle">
                    <td colSpan={5} className="py-2 font-semibold text-text">
                      <span className="inline-flex items-center gap-2">
                        {group.station.name}
                        <Badge tone={group.online ? "success" : "neutral"} size="sm" dot>
                          {group.online ? tStations("status.online") : tStations("status.offline")}
                        </Badge>
                      </span>
                    </td>
                  </tr>
                  {group.rows.map((row) => {
                    const rate = row.capacityLiters > 0 ? (row.volumeLiters / row.capacityLiters) * 100 : 0;
                    return (
                      <tr key={row.tankId} className="border-b border-border-subtle/60">
                        <td className="py-2 pl-4 text-text">{row.label}</td>
                        <td className="py-2 text-right tabular-nums text-text">{formatVolume(row.volumeLiters)}</td>
                        <td className="py-2 text-right tabular-nums text-text-muted">{formatVolume(row.capacityLiters)}</td>
                        <td className="py-2 pl-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-pill bg-surface-muted">
                              <div className={cn("h-full rounded-pill bg-primary")} style={{ width: `${Math.min(100, rate)}%` }} />
                            </div>
                            <span className="tabular-nums text-caption text-text-muted">{formatPercent(rate)}%</span>
                          </div>
                        </td>
                        <td className="py-2 text-right tabular-nums text-text">
                          {row.monetaryValue !== null && row.currencyCode ? formatMoney(row.monetaryValue, row.currencyCode) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-b border-border-subtle bg-surface-muted/60 font-medium">
                    <td className="py-2 pl-4 text-text">{t("subtotal", { station: group.station.name })}</td>
                    <td className="py-2 text-right tabular-nums text-text">{formatVolume(stationVolume)}</td>
                    <td className="py-2 text-right tabular-nums text-text-muted">{formatVolume(stationCapacity)}</td>
                    <td className="py-2 pl-4 tabular-nums text-text-muted">{formatPercent(stationRate)}%</td>
                    <td className="py-2 text-right tabular-nums text-text">
                      {stationValue !== null && stationCurrencies.size === 1 ? formatMoney(stationValue, [...stationCurrencies][0]) : "—"}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
            <tr className="bg-primary-muted font-bold text-primary">
              <td className="rounded-l-button py-3 pl-4">{t("total", { product: product.name })}</td>
              <td className="py-3 text-right tabular-nums">{formatVolume(totalVolume)}</td>
              <td className="py-3 text-right tabular-nums">{formatVolume(totalCapacity)}</td>
              <td className="py-3 pl-4 tabular-nums">{formatPercent(totalCapacity > 0 ? (totalVolume / totalCapacity) * 100 : 0)}%</td>
              <td className="rounded-r-button py-3 text-right tabular-nums">
                {totalValue !== null && totalCurrency !== null ? formatMoney(totalValue, totalCurrency) : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
