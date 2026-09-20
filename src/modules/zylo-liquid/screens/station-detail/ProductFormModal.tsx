"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Alert, Button, FormField, Input, Modal, SearchableSelect } from "@/shared/ui";

import type { useExploitation } from "./useExploitation";

/** Formulaire d'ajout d'un produit à la station (mockup emalioration/,
 * panneau 5) — sélectionne un produit du référentiel réseau (jamais une
 * création de produit à la volée ici, `FuelProduct` reste géré au niveau
 * réseau) et fixe ses seuils de réassort pour cette station. La capacité
 * reste calculée depuis les cuves (lecture seule, jamais un champ ici —
 * décision explicite de ne jamais dupliquer une donnée déjà calculée,
 * point 19 de la mission). */
export function ProductFormModal({
  data,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof useExploitation>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.operations.productForm");
  const tCommon = useTranslations("common");

  const availableProducts = data.networkFuelProducts.filter((fp) => !data.products.some((p) => p.fuelProductId === fp.id));

  const [fuelProductId, setFuelProductId] = useState("");
  const [minThreshold, setMinThreshold] = useState("");
  const [criticalThreshold, setCriticalThreshold] = useState("");
  const [safetyStock, setSafetyStock] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFuelProductId("");
    setMinThreshold("");
    setCriticalThreshold("");
    setSafetyStock("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fuelProductId) {
      setError(t("required"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await data.linkProduct(fuelProductId, {
        minThresholdLiters: minThreshold ? Number(minThreshold) : undefined,
        criticalThresholdLiters: criticalThreshold ? Number(criticalThreshold) : undefined,
        safetyStockLiters: safetyStock ? Number(safetyStock) : undefined,
      });
      reset();
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
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t("title")}
      size="md"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>{tCommon("actions.cancel")}</Button>
          <Button size="sm" type="submit" form="product-form" loading={submitting}>{tCommon("actions.save")}</Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <FormField label={t("product")}>
          {() => (
            <SearchableSelect
              aria-label={t("product")}
              value={fuelProductId || undefined}
              onValueChange={setFuelProductId}
              placeholder={t("selectProduct")}
              options={availableProducts.map((fp) => ({ value: fp.id, label: fp.name }))}
            />
          )}
        </FormField>
        <p className="text-caption text-text-muted">{t("capacityHint")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("minThreshold")}>{(field) => <Input {...field} type="number" value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)} />}</FormField>
          <FormField label={t("criticalThreshold")}>{(field) => <Input {...field} type="number" value={criticalThreshold} onChange={(e) => setCriticalThreshold(e.target.value)} />}</FormField>
          <FormField label={t("safetyStock")}>{(field) => <Input {...field} type="number" value={safetyStock} onChange={(e) => setSafetyStock(e.target.value)} />}</FormField>
        </div>
      </form>
    </Modal>
  );
}
