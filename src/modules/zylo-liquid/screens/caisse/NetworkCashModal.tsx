"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import type { CashMode, StationCashSummary } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { downloadCsv } from "@/modules/zylo-liquid/utils/downloadCsv";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { Badge, Button, Modal } from "@/shared/ui";

import { CashConfidenceBadge } from "./CashConfidenceBadge";
import { CashReasonNote } from "./CashReasonNote";
import { StationCashModal } from "./StationCashModal";

type SortKey = "station" | "volume" | "value";

/** Répartition réseau -> station (page_caisse.md §17) — clic sur une
 * station pour descendre au niveau produit/cuve (StationCashModal).
 * S'inspire du principe d'exploration de ProductBreakdownModal (tableau
 * groupé, ligne total), adapté à la caisse plutôt qu'au stock. Tri par
 * en-tête + badges meilleure/plus faible contribution (page_caisse.md §L,
 * classement des stations) : le classement reste calculé sur la valeur
 * réelle, indépendamment du tri affiché, pour ne jamais perdre le repère si
 * l'utilisateur trie par nom.
 *
 * `block` reste structurel (pas juste `CurrencyCashBlock`) pour être
 * réutilisé tel quel par un `NetworkProductCashLine` (drill-down au clic
 * sur une carte produit de CashSummaryCards) — jamais une deuxième modale
 * dupliquée pour ce même besoin d'exploration réseau -> station. */
interface CashDrilldownBlock {
  currencyCode: string | null;
  monetaryValue: number | null;
  monetaryValueNotCalculableReason?: string | null;
  volumeSoldLiters: number;
  stations: StationCashSummary[];
}

export function NetworkCashModal({
  open,
  onOpenChange,
  organizationId,
  block,
  title,
  fromDate,
  toDate,
  mode = "calendar",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  block: CashDrilldownBlock | null;
  /** Titre déjà résolu par l'appelant (devise seule pour le total réseau,
   * produit + devise pour le drill-down d'une carte produit) — cette modale
   * reste agnostique de ce qu'elle représente. */
  title: string;
  fromDate: string;
  toDate: string;
  mode?: CashMode;
}) {
  const t = useTranslations("zyloLiquid.caisse.networkModal");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [openStationId, setOpenStationId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDesc, setSortDesc] = useState(true);

  const rankedByValue = useMemo(() => {
    if (!block) return { bestId: null as string | null, worstId: null as string | null };
    const withValue = block.stations.filter((s): s is StationCashSummary & { monetaryValue: number } => s.monetaryValue !== null);
    if (withValue.length < 2) return { bestId: null, worstId: null };
    const sorted = [...withValue].sort((a, b) => b.monetaryValue - a.monetaryValue);
    return { bestId: sorted[0].stationId, worstId: sorted[sorted.length - 1].stationId };
  }, [block]);

  const sortedStations = useMemo(() => {
    if (!block) return [];
    const rows = [...block.stations];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "station") cmp = a.stationName.localeCompare(b.stationName);
      else if (sortKey === "volume") cmp = a.volumeSoldLiters - b.volumeSoldLiters;
      else cmp = (a.monetaryValue ?? -Infinity) - (b.monetaryValue ?? -Infinity);
      return sortDesc ? -cmp : cmp;
    });
    return rows;
  }, [block, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((v) => !v);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="size-3 opacity-40" aria-hidden />;
    return sortDesc ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />;
  }

  function handleExport() {
    if (!block) return;
    downloadCsv(`caisse-${block.currencyCode ?? "produit"}.csv`, [
      ["station", "volumeSoldLiters", "monetaryValue", "currency", "confidence"],
      ...sortedStations.map((s) => [s.stationName, String(s.volumeSoldLiters), s.monetaryValue !== null ? String(s.monetaryValue) : "", block.currencyCode ?? "", s.confidence]),
    ]);
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        closeLabel={tCommon("actions.close")}
        size="xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4" aria-hidden />
              {t("exportCsv")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {tCommon("actions.close")}
            </Button>
          </>
        }
      >
        {block && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-border-subtle text-caption font-semibold uppercase tracking-wide text-text-muted">
                  <th className="py-2 text-left">
                    <button type="button" onClick={() => toggleSort("station")} className="inline-flex items-center gap-1 hover:text-text">
                      {t("columns.station")} <SortIcon column="station" />
                    </button>
                  </th>
                  <th className="py-2 text-right">
                    <button type="button" onClick={() => toggleSort("volume")} className="inline-flex items-center gap-1 hover:text-text">
                      {t("columns.volume")} <SortIcon column="volume" />
                    </button>
                  </th>
                  <th className="py-2 text-right">
                    <button type="button" onClick={() => toggleSort("value")} className="inline-flex items-center gap-1 hover:text-text">
                      {t("columns.value")} <SortIcon column="value" />
                    </button>
                  </th>
                  <th className="py-2 text-right">{t("columns.share")}</th>
                  <th className="py-2 text-left pl-4">{t("columns.confidence")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedStations.map((station) => (
                  <tr
                    key={station.stationId}
                    className="cursor-pointer border-b border-border-subtle/60 hover:bg-surface-muted"
                    onClick={() => setOpenStationId(station.stationId)}
                  >
                    <td className="py-2 text-text underline decoration-dotted">
                      <span className="inline-flex items-center gap-2">
                        {station.stationName}
                        {station.stationId === rankedByValue.bestId && <Badge tone="success">{t("bestContributor")}</Badge>}
                        {station.stationId === rankedByValue.worstId && <Badge tone="warning">{t("worstContributor")}</Badge>}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-text">{formatLiters(station.volumeSoldLiters)} L</td>
                    <td className="py-2 text-right tabular-nums text-text">
                      {station.monetaryValue !== null && station.currencyCode
                        ? formatMoney(format, station.monetaryValue, station.currencyCode)
                        : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums text-text-muted">
                      {station.monetaryValue !== null && block.monetaryValue !== null && block.monetaryValue > 0
                        ? `${((station.monetaryValue / block.monetaryValue) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="py-2 pl-4">
                      <CashConfidenceBadge confidence={station.confidence} />
                    </td>
                  </tr>
                ))}
                <tr className="bg-primary-muted font-bold text-primary">
                  <td className="rounded-l-button py-3">{t("total")}</td>
                  <td className="py-3 text-right tabular-nums">{formatLiters(block.volumeSoldLiters)} L</td>
                  <td className="rounded-r-button py-3 text-right tabular-nums" colSpan={3}>
                    {block.monetaryValue !== null && block.currencyCode ? (
                      formatMoney(format, block.monetaryValue, block.currencyCode)
                    ) : (
                      <CashReasonNote reason={block.monetaryValueNotCalculableReason ?? null} />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <StationCashModal
        open={openStationId !== null}
        onOpenChange={(next) => !next && setOpenStationId(null)}
        organizationId={organizationId}
        stationId={openStationId}
        fromDate={fromDate}
        toDate={toDate}
        mode={mode}
      />
    </>
  );
}
