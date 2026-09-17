"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { Badge, EmptyState } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

import { StationsMap, type StationMapPoint } from "@/modules/zylo-liquid/components/StationsMap";
import { formatPercent } from "@/modules/zylo-liquid/utils/formatPercent";

export interface DashboardStationAggregate {
  station: { id: string; name: string; status: "active" | "inactive" | string; latitude: number | null; longitude: number | null };
  online: boolean;
  volumeLiters: number;
  capacityLiters: number;
  monetaryValue: number | null;
  currencyCode: string | null;
  mainProductName: string | null;
}

const MAP_BLOCK_HEIGHT = 420;

/** Row 3 du dashboard réseau : « Où sont mes stations ? » — table compacte
 * synchronisée avec une carte (StationsMap), reprenant la même table que
 * l'ancienne section stations du dashboard (cf. historique
 * DashboardScreen.tsx) mais placée à côté d'une carte au lieu d'être seule.
 * Cliquer une ligne fait voler la carte sur la station (StationsMap.focusStationId),
 * comme le panneau flottant de StationsListScreen.tsx mais sans
 * collapse/expand (table toujours visible ici). */
export function DashboardStationsMapBlock({
  loading,
  stationAggregates,
  totalStationsCount,
  formatVolume,
  formatMoney,
}: {
  loading: boolean;
  stationAggregates: DashboardStationAggregate[];
  totalStationsCount: number;
  formatVolume: (liters: number) => string;
  formatMoney: (value: number, currencyCode: string) => string;
}) {
  const t = useTranslations("zyloLiquid");
  const [focusedStationId, setFocusedStationId] = useState<string | null>(null);

  const mapStations: StationMapPoint[] = stationAggregates
    .filter(({ station }) => station.latitude != null && station.longitude != null)
    .map(({ station, online, volumeLiters, capacityLiters, mainProductName }) => ({
      id: station.id,
      name: station.name,
      latitude: station.latitude as number,
      longitude: station.longitude as number,
      status: online ? "online" : "offline",
      popupSubtitle: `${formatVolume(volumeLiters)} / ${formatVolume(capacityLiters)}`,
      productsLabel: mainProductName ?? undefined,
    }));

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="max-h-[420px] shrink-0 overflow-auto lg:w-[420px]">
        {loading ? (
          <table className="w-full border-collapse text-body-sm">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={7} />
              ))}
            </tbody>
          </table>
        ) : stationAggregates.length === 0 ? (
          <EmptyState title={t("stations.empty")} />
        ) : (
          <>
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-border-subtle text-caption font-semibold uppercase tracking-wide text-text-muted">
                  <th className="py-2 text-left">{t("stations.columns.station")}</th>
                  <th className="py-2 text-left">{t("stations.columns.status")}</th>
                  <th className="py-2 text-left">{t("stations.columns.mainProduct")}</th>
                  <th className="py-2 text-right">{t("stations.columns.currentStock")}</th>
                  <th className="py-2 text-right">{t("stations.columns.capacity")}</th>
                  <th className="py-2 pl-4 text-left">{t("stations.columns.rate")}</th>
                  <th className="py-2 text-right">{t("stations.columns.value")}</th>
                </tr>
              </thead>
              <tbody>
                {stationAggregates.map(({ station, online, volumeLiters, capacityLiters, monetaryValue, currencyCode, mainProductName }) => {
                  const rate = capacityLiters > 0 ? (volumeLiters / capacityLiters) * 100 : 0;
                  return (
                    <tr
                      key={station.id}
                      onClick={() => setFocusedStationId(station.id)}
                      className={cn(
                        "cursor-pointer border-b border-border-subtle/60",
                        focusedStationId === station.id && "bg-surface-muted"
                      )}
                    >
                      <td className="py-2 text-text">{station.name}</td>
                      <td className="py-2">
                        <Badge tone={online ? "success" : "neutral"} size="sm" dot>
                          {online ? t("stations.status.online") : t("stations.status.offline")}
                        </Badge>
                      </td>
                      <td className="py-2 text-text-muted">{mainProductName ?? "—"}</td>
                      <td className="py-2 text-right tabular-nums text-text">{formatVolume(volumeLiters)}</td>
                      <td className="py-2 text-right tabular-nums text-text-muted">{formatVolume(capacityLiters)}</td>
                      <td className="py-2 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-pill bg-surface-muted">
                            <div className="h-full rounded-pill bg-primary" style={{ width: `${Math.min(100, rate)}%` }} />
                          </div>
                          <span className="tabular-nums text-caption text-text-muted">{formatPercent(rate)}%</span>
                        </div>
                      </td>
                      <td className="py-2 text-right tabular-nums text-text">
                        {monetaryValue !== null && currencyCode ? formatMoney(monetaryValue, currencyCode) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-caption text-text-muted">{t("stations.totalStations", { count: totalStationsCount })}</p>
          </>
        )}
      </div>

      <div className="h-[420px] min-w-0 flex-1">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-card bg-surface-muted" style={{ height: MAP_BLOCK_HEIGHT }} />
        ) : (
          <StationsMap fill stations={mapStations} focusStationId={focusedStationId} />
        )}
      </div>
    </div>
  );
}
