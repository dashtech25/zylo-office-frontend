"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { StationPicker } from "@/modules/zylo-liquid/components/StationPicker";
import { createPriceHistory, type City, type Currency, type FuelProduct, type PriceHistoryEntry, type Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, FormField, Input, Modal, Select } from "@/shared/ui";

export interface BulkPriceModalProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stations: Station[];
  cities: City[];
  fuelProducts: FuelProduct[];
  prices: PriceHistoryEntry[];
  resolveStationCurrency: (station: Station) => Currency | null;
  initialStationIds?: string[];
  onDone: () => void;
}

/** Configuration de prix en masse (page_configuration.md §19) : sélection de
 * plusieurs stations, un produit, un prix — appliqué en une action au lieu
 * d'un formulaire par station. N'introduit aucun nouvel endpoint : chaque
 * station sélectionnée déclenche un appel `createPriceHistory` normal (la
 * ligne d'historique existante reste la source de vérité, jamais un "prix
 * réseau" fictif). Une sélection multi-devises est bloquée explicitement
 * plutôt que de convertir ou de sommer silencieusement (§25). */
export function BulkPriceModal({ organizationId, open, onOpenChange, stations, cities, fuelProducts, prices, resolveStationCurrency, initialStationIds, onDone }: BulkPriceModalProps) {
  const t = useTranslations("zyloLiquid.configuration.prices.bulk");
  const tCommon = useTranslations("common");

  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialStationIds ?? []));
  const [fuelProductId, setFuelProductId] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 16));
  const [reason, setReason] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStations = stations.filter((s) => selected.has(s.id));

  const currenciesInSelection = useMemo(() => {
    const codes = new Set<string>();
    for (const s of selectedStations) {
      const c = resolveStationCurrency(s);
      if (c) codes.add(c.code);
    }
    return [...codes];
  }, [selectedStations, resolveStationCurrency]);

  const stationsWithoutCurrency = selectedStations.filter((s) => resolveStationCurrency(s) === null);
  const mixedCurrencies = currenciesInSelection.length > 1;

  const existingPriceByStation = useMemo(() => {
    const map = new Map<string, PriceHistoryEntry>();
    if (!fuelProductId) return map;
    for (const p of prices) {
      if (p.fuelProductId !== fuelProductId || p.isFuture || p.stationId === null) continue;
      const current = map.get(p.stationId);
      if (!current || p.effectiveFrom > current.effectiveFrom) map.set(p.stationId, p);
    }
    return map;
  }, [prices, fuelProductId]);

  const stationsWithExisting = selectedStations.filter((s) => existingPriceByStation.has(s.id));
  const stationsWithoutExisting = selectedStations.filter((s) => !existingPriceByStation.has(s.id));

  function toggleStation(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canSubmit = selectedStations.length > 0 && fuelProductId && priceAmount && !mixedCurrencies && stationsWithoutCurrency.length === 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const targets = overwrite ? selectedStations : stationsWithoutExisting;
      for (const station of targets) {
        const currency = resolveStationCurrency(station);
        await createPriceHistory(organizationId, {
          stationId: station.id,
          fuelProductId,
          priceAmount: Number(priceAmount),
          costAmount: costAmount ? Number(costAmount) : undefined,
          currencyId: currency?.id,
          effectiveFrom: new Date(effectiveFrom).toISOString(),
          changeReason: reason.trim() || undefined,
        });
      }
      onDone();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      size="lg"
      closeLabel={tCommon("actions.close")}
      preventOutsideClose
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
            {t("apply")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}

        <FormField label={t("stations", { count: selected.size })}>
          {() => <StationPicker mode="multiple" stations={stations} cities={cities} selected={selected} onToggle={toggleStation} />}
        </FormField>

        {mixedCurrencies && <Alert tone="error">{t("mixedCurrencies")}</Alert>}
        {!mixedCurrencies && stationsWithoutCurrency.length > 0 && (
          <Alert tone="error">{t("noCurrency", { count: stationsWithoutCurrency.length, names: stationsWithoutCurrency.map((s) => s.name).join(", ") })}</Alert>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("product")}>
            {() => <Select aria-label={t("product")} value={fuelProductId || undefined} onValueChange={setFuelProductId} placeholder={t("selectProduct")} options={fuelProducts.map((p) => ({ value: p.id, label: p.name }))} />}
          </FormField>
          <FormField label={t("currency")}>
            {() => <Input value={currenciesInSelection[0] ?? "—"} disabled />}
          </FormField>
          <FormField label={t("effectiveFrom")}>
            {(field) => <Input {...field} type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />}
          </FormField>
          <FormField label={t("sellPrice")} required>
            {(field) => <Input {...field} type="number" step="1" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />}
          </FormField>
          <FormField label={t("costPrice")}>
            {(field) => <Input {...field} type="number" step="1" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} />}
          </FormField>
          <FormField label={t("reason")}>
            {(field) => <Input {...field} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </FormField>
        </div>

        {fuelProductId && selectedStations.length > 0 && (
          <div className="rounded-card border border-border-subtle bg-surface-muted p-3 text-body-sm">
            <p className="font-semibold text-text">{t("preview")}</p>
            <p className="mt-1 text-text-muted">{t("previewNew", { count: stationsWithoutExisting.length })}</p>
            {stationsWithExisting.length > 0 && (
              <>
                <p className="mt-1 text-text-muted">{t("previewExisting", { count: stationsWithExisting.length })}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-body-sm">
                    <input type="radio" name="overwrite" checked={!overwrite} onChange={() => setOverwrite(false)} />
                    {t("skipExisting")}
                  </label>
                  <label className="flex items-center gap-2 text-body-sm">
                    <input type="radio" name="overwrite" checked={overwrite} onChange={() => setOverwrite(true)} />
                    {t("overwriteExisting")}
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {stationsWithExisting.map((s) => (
                    <Badge key={s.id} tone="warning">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
