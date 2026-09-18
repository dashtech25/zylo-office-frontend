"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { Badge, EmptyState } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

import { FullscreenMapView } from "@/modules/zylo-liquid/components/FullscreenMapView";
import { StationsMap, type StationMapPoint } from "@/modules/zylo-liquid/components/StationsMap";

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
}: {
  loading: boolean;
  stationAggregates: DashboardStationAggregate[];
  totalStationsCount: number;
  formatVolume: (liters: number) => string;
  /** Non utilisée depuis la simplification du tableau à 2 colonnes (Station
   * + Statut) — gardée dans le contrat pour ne pas casser l'appelant. */
  formatMoney: (value: number, currencyCode: string) => string;
}) {
  const t = useTranslations("zyloLiquid");
  const tCommon = useTranslations("common");
  const [focusedStationId, setFocusedStationId] = useState<string | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

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

  function stationsTable() {
    if (loading) {
      return (
        <table className="w-full border-collapse text-body-sm">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={2} />
            ))}
          </tbody>
        </table>
      );
    }
    if (stationAggregates.length === 0) {
      return <EmptyState title={t("stations.empty")} />;
    }
    return (
      <>
        <table className="w-full border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-border-subtle text-caption font-semibold uppercase tracking-wide text-text-muted">
              <th className="py-2 text-left">{t("stations.columns.station")}</th>
              <th className="py-2 text-left">{t("stations.columns.status")}</th>
            </tr>
          </thead>
          <tbody>
            {stationAggregates.map(({ station, online }) => (
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
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-caption text-text-muted">{t("stations.totalStations", { count: totalStationsCount })}</p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="max-h-[420px] shrink-0 overflow-auto lg:w-[420px]">{stationsTable()}</div>

      <div className="relative h-[420px] min-w-0 flex-1">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-card bg-surface-muted" style={{ height: MAP_BLOCK_HEIGHT }} />
        ) : (
          <>
            <StationsMap fill stations={mapStations} focusStationId={focusedStationId} />
            <button
              type="button"
              onClick={() => setFullscreenOpen(true)}
              aria-label={t("stationsMapExpand")}
              className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full border border-border-subtle bg-surface text-text-muted shadow-elevated hover:bg-surface-muted hover:text-text"
            >
              <Maximize2 className="size-4" aria-hidden />
            </button>
          </>
        )}
      </div>

      <FullscreenMapView
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        closeLabel={tCommon("actions.close")}
        focusStationId={focusedStationId}
        onStationClick={setFocusedStationId}
        stations={mapStations}
        sidePanel={
          <div className="absolute left-4 top-4 z-10 max-h-[80vh] w-[min(92vw,380px)] overflow-auto rounded-card border border-border-subtle bg-surface p-3 shadow-elevated">
            {stationsTable()}
          </div>
        }
      />
    </div>
  );
}
