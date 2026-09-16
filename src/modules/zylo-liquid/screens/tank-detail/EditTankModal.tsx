"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { TankProductField, type TankFieldsState } from "@/modules/zylo-liquid/components/TankFieldsSection";
import { listFuelProducts, updateTank, type FuelProduct, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, FormField, Input, Modal } from "@/shared/ui";

export interface EditTankModalProps {
  organizationId: string;
  tank: Tank;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

type ProductState = Pick<TankFieldsState, "fuelMode" | "fuelProductId" | "newProductName" | "newProductCode">;

/** Modification d'une cuve existante — seuils (comportement d'origine,
 * ex-`EditThresholdsModal`) + produit carburant (P0-1, audit module
 * Stations 2026-09-16 : il était jusqu'ici impossible de changer le produit
 * d'une cuve après sa création). Même contrat de champs que
 * `TankFieldsSection`/`AddTankModal` pour les seuils, et réutilise le même
 * sous-composant `TankProductField` pour le produit — jamais deux
 * implémentations du même sélecteur. */
export function EditTankModal({ organizationId, tank, open, onOpenChange, onUpdated }: EditTankModalProps) {
  const t = useTranslations("zyloLiquid.addTank");
  const tCommon = useTranslations("common");
  const [heightAlarmMm, setHeightAlarmMm] = useState(String(tank.heightAlarmMm));
  const [heightAlertMm, setHeightAlertMm] = useState(String(tank.heightAlertMm));
  const [lowAlarmMm, setLowAlarmMm] = useState(String(tank.lowAlarmMm));
  const [alertWaterMaxMm, setAlertWaterMaxMm] = useState(String(tank.alertWaterMaxMm));
  const [product, setProduct] = useState<ProductState>({ fuelMode: "existing", fuelProductId: tank.fuelProductId, newProductName: "", newProductCode: "" });
  const [fuelProducts, setFuelProducts] = useState<FuelProduct[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setHeightAlarmMm(String(tank.heightAlarmMm));
    setHeightAlertMm(String(tank.heightAlertMm));
    setLowAlarmMm(String(tank.lowAlarmMm));
    setAlertWaterMaxMm(String(tank.alertWaterMaxMm));
    setProduct({ fuelMode: "existing", fuelProductId: tank.fuelProductId, newProductName: "", newProductCode: "" });
    setError(null);
    listFuelProducts(organizationId).then((page) => setFuelProducts(page.data));
  }, [open, tank, organizationId]);

  const thresholdsOrderOk = Number(heightAlarmMm) > Number(heightAlertMm) && Number(heightAlertMm) > Number(lowAlarmMm);
  const productOk = product.fuelMode === "existing" ? !!product.fuelProductId : !!product.newProductName && !!product.newProductCode;
  const canSubmit = heightAlarmMm && heightAlertMm && lowAlarmMm && thresholdsOrderOk && productOk;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Le produit n'est envoyé que s'il a réellement changé — évite de
      // déclencher `productSince` côté backend à chaque simple modification
      // de seuils (voir `update_tank`, service.py).
      const productChanged = product.fuelMode === "existing" ? product.fuelProductId !== tank.fuelProductId : true;
      await updateTank(organizationId, tank.id, {
        heightAlarmMm: Number(heightAlarmMm),
        heightAlertMm: Number(heightAlertMm),
        lowAlarmMm: Number(lowAlarmMm),
        alertWaterMaxMm: Number(alertWaterMaxMm),
        ...(productChanged
          ? product.fuelMode === "existing"
            ? { fuelProductId: product.fuelProductId }
            : { newFuelProductName: product.newProductName, newFuelProductCode: product.newProductCode }
          : {}),
      });
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("editTankTitle")}
      size="md"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" type="submit" form="edit-tank-form" loading={submitting} disabled={!canSubmit}>
            {tCommon("actions.save")}
          </Button>
        </>
      }
    >
      <form id="edit-tank-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}

        <h4 className="text-body-md font-semibold text-text">{t("sections.basics")}</h4>
        <TankProductField
          fuelMode={product.fuelMode}
          fuelProductId={product.fuelProductId}
          newProductName={product.newProductName}
          newProductCode={product.newProductCode}
          fuelProducts={fuelProducts}
          onChange={setProduct}
        />

        <h4 className="mt-2 text-body-md font-semibold text-text">{t("sections.thresholds")}</h4>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t("thresholdHigh")} required>
            {(field) => <Input {...field} type="number" value={heightAlarmMm} onChange={(e) => setHeightAlarmMm(e.target.value)} required />}
          </FormField>
          <FormField label={t("thresholdPreAlarm")} required>
            {(field) => <Input {...field} type="number" value={heightAlertMm} onChange={(e) => setHeightAlertMm(e.target.value)} required />}
          </FormField>
          <FormField label={t("thresholdLow")} required>
            {(field) => <Input {...field} type="number" value={lowAlarmMm} onChange={(e) => setLowAlarmMm(e.target.value)} required />}
          </FormField>
          <FormField label={t("thresholdWater")}>
            {(field) => <Input {...field} type="number" value={alertWaterMaxMm} onChange={(e) => setAlertWaterMaxMm(e.target.value)} />}
          </FormField>
        </div>
        {!thresholdsOrderOk && <p className="text-caption text-error">{t("validation.thresholdOrder")}</p>}
      </form>
    </Modal>
  );
}
