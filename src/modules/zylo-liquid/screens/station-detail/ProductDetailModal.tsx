"use client";

import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { listPrices, type PriceHistoryEntry, type Station, type StationFuelProductOverview } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { formatFreshness } from "@/shared/lib/formatDateTime";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { Alert, Badge, Button, FormField, Input, ListSkeleton, Modal, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "./PartState";
import type { useExploitation } from "./useExploitation";

const STATUS_TONE = { normal: "success", attention: "warning", critique: "error", inconnu: "neutral" } as const;
const TABS = ["info", "stock", "price", "history"] as const;

/** Fiche détail produit (mockup emalioration/, panneau 2) — onglets
 * Informations générales / Stock & seuils / Prix & tarification /
 * Historique. `capacityLiters`/`currentVolumeLiters` restent en lecture
 * seule (calculés côté backend depuis les cuves actives, jamais un champ
 * modifiable ici — décision du commanditaire, point 19 de la mission). */
export function ProductDetailModal({
  organizationId,
  station,
  product,
  data,
  open,
  onOpenChange,
}: {
  organizationId: string;
  station: Station;
  product: StationFuelProductOverview;
  data: ReturnType<typeof useExploitation>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.operations.productModal");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("info");

  const [minThreshold, setMinThreshold] = useState(product.minThresholdLiters?.toString() ?? "");
  const [criticalThreshold, setCriticalThreshold] = useState(product.criticalThresholdLiters?.toString() ?? "");
  const [safetyStock, setSafetyStock] = useState(product.safetyStockLiters?.toString() ?? "");
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrices = useCallback(
    () => listPrices(organizationId, { stationId: station.id, fuelProductId: product.fuelProductId, limit: 20 }).then((p) => p.data),
    [organizationId, station.id, product.fuelProductId]
  );
  const pricesState = usePartData(["zylo-liquid", "station-detail", "product-prices", organizationId, station.id, product.fuelProductId], loadPrices);

  async function handleSaveThresholds() {
    setSavingThresholds(true);
    setError(null);
    try {
      await data.updateThresholds(product.id, {
        minThresholdLiters: minThreshold ? Number(minThreshold) : null,
        criticalThresholdLiters: criticalThreshold ? Number(criticalThreshold) : null,
        safetyStockLiters: safetyStock ? Number(safetyStock) : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSavingThresholds(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={product.fuelProductName} size="lg" closeLabel={tCommon("actions.close")}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex items-center gap-2">
          <Badge tone={product.active ? "success" : "neutral"}>{product.active ? t("active") : t("inactive")}</Badge>
          <Badge tone={STATUS_TONE[product.status]}>{t(`status.${product.status}`)}</Badge>
        </div>

        <div className="flex gap-1 border-b border-border-subtle">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`border-b-2 px-3 py-2 text-body-sm font-medium ${tab === key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"}`}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-body-sm">
            <div><dt className="text-text-muted">{t("name")}</dt><dd className="text-text">{product.fuelProductName}</dd></div>
            <div><dt className="text-text-muted">{t("code")}</dt><dd className="text-text">{product.fuelProductCode}</dd></div>
            <div><dt className="text-text-muted">{t("unit")}</dt><dd className="text-text">{t("litre")}</dd></div>
            <div><dt className="text-text-muted">{t("status_label")}</dt><dd className="text-text">{t(`status.${product.status}`)}</dd></div>
          </dl>
        )}

        {tab === "stock" && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-body-sm sm:grid-cols-4">
              <div><dt className="text-text-muted">{t("capacity")}</dt><dd className="tabular-nums text-text">{formatLiters(Math.round(product.capacityLiters))} L</dd></div>
              <div><dt className="text-text-muted">{t("currentStock")}</dt><dd className="tabular-nums text-text">{product.currentVolumeLiters !== null ? `${formatLiters(Math.round(product.currentVolumeLiters))} L` : "—"}</dd></div>
            </dl>
            <p className="text-caption text-text-muted">{t("capacityHint")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField label={t("minThreshold")}>{(field) => <Input {...field} type="number" value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)} />}</FormField>
              <FormField label={t("criticalThreshold")}>{(field) => <Input {...field} type="number" value={criticalThreshold} onChange={(e) => setCriticalThreshold(e.target.value)} />}</FormField>
              <FormField label={t("safetyStock")}>{(field) => <Input {...field} type="number" value={safetyStock} onChange={(e) => setSafetyStock(e.target.value)} />}</FormField>
            </div>
            <Button size="sm" className="self-start" onClick={handleSaveThresholds} loading={savingThresholds}>{tCommon("actions.save")}</Button>
          </div>
        )}

        {tab === "price" && (
          <div className="flex flex-col gap-3">
            <dl className="text-body-sm">
              <dt className="text-text-muted">{t("currentPrice")}</dt>
              <dd className="text-h4 font-semibold text-text">{product.currentPriceAmount !== null && product.currencyCode ? formatMoney(format, product.currentPriceAmount, product.currencyCode) : "—"}</dd>
            </dl>
            <PartStateBox state={pricesState}>
              {pricesState.status === "ready" && (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t("priceHistory.date")}</TableHeaderCell>
                      <TableHeaderCell>{t("priceHistory.amount")}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(pricesState.data as PriceHistoryEntry[]).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="tabular-nums text-text-muted">{format.dateTime(new Date(entry.effectiveFrom), { dateStyle: "short", timeStyle: "short" })}</TableCell>
                        <TableCell className="tabular-nums">{product.currencyCode ? formatMoney(format, entry.priceAmount, product.currencyCode) : entry.priceAmount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </PartStateBox>
          </div>
        )}

        {tab === "history" && <ProductHistoryList data={data} organizationId={organizationId} stationId={station.id} entityId={product.id} />}

        <div className="flex justify-end border-t border-border-subtle pt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{tCommon("actions.close")}</Button>
        </div>
      </div>
    </Modal>
  );
}

/** Migré vers React Query via `usePartData` (même convention que
 * `pricesState` ci-dessus) — ne se monte que lorsque l'onglet Historique est
 * sélectionné (`tab === "history" &&`, jamais un onglet Radix ici mais le
 * même principe de montage à la demande). */
function ProductHistoryList({
  data,
  organizationId,
  stationId,
  entityId,
}: {
  data: ReturnType<typeof useExploitation>;
  organizationId: string;
  stationId: string;
  entityId: string;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.operations.productModal");
  const format = useFormatter();
  const loadHistory = useCallback(() => data.listHistory().then((rows) => rows.filter((r) => r.entityId === entityId)), [data, entityId]);
  const historyState = usePartData(["zylo-liquid", "station-detail", "product-history", organizationId, stationId, entityId], loadHistory);

  if (historyState.status === "loading") return <ListSkeleton rows={3} />;
  if (historyState.status === "denied") return <p className="text-body-sm text-text-muted">{t("noHistory")}</p>;
  if (historyState.status === "error") return <Alert tone="error">{historyState.error}</Alert>;

  const entries = historyState.data;
  if (entries.length === 0) return <p className="text-body-sm text-text-muted">{t("noHistory")}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li key={entry.id} className="text-body-sm text-text">
          <span className="tabular-nums text-text-muted">{formatFreshness(entry.createdAt, format)}</span> — {entry.summary}
        </li>
      ))}
    </ul>
  );
}
