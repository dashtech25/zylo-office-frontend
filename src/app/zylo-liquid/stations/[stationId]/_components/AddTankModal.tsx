"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/core/api/client";
import {
  createTank,
  createTankSensorMapping,
  replaceTankCalibrationPoints,
  type CalibrationPoint,
  type FuelProduct,
} from "@/core/api/zyloLiquid";
import { Alert, Button, Checkbox, FormField, Input, Modal, Select } from "@/shared/ui";

export interface AddTankModalProps {
  organizationId: string;
  stationId: string;
  fuelProducts: FuelProduct[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

/** Parse un CSV "hauteur;volume" (séparateur point-virgule, cf. maquette
 * Page 3b) — jamais d'upload serveur : le fichier n'est qu'un raccourci de
 * saisie côté client pour PUT /tanks/{id}/calibration-points, qui attend
 * déjà exactement cette liste de paires. */
function parseCalibrationCsv(text: string): CalibrationPoint[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [heightMm, volumeLiters] = line.split(/[;,]/).map((v) => Number(v.trim()));
      return { heightMm, volumeLiters };
    })
    .filter((p) => Number.isFinite(p.heightMm) && Number.isFinite(p.volumeLiters));
}

export function AddTankModal({ organizationId, stationId, fuelProducts, open, onOpenChange, onCreated }: AddTankModalProps) {
  const t = useTranslations("zyloLiquid.addTank");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tankNumber, setTankNumber] = useState("");
  const [fuelMode, setFuelMode] = useState<"existing" | "new">(fuelProducts.length > 0 ? "existing" : "new");
  const [fuelProductId, setFuelProductId] = useState(fuelProducts[0]?.id ?? "");
  const [newProductName, setNewProductName] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [capacityLiters, setCapacityLiters] = useState("");
  const [tankHeightMm, setTankHeightMm] = useState("");
  const [heightAlarmMm, setHeightAlarmMm] = useState("");
  const [heightAlertMm, setHeightAlertMm] = useState("");
  const [lowAlarmMm, setLowAlarmMm] = useState("");
  const [alertWaterMaxMm, setAlertWaterMaxMm] = useState("25");
  const [sensorSerial, setSensorSerial] = useState("");
  const [skipCalibration, setSkipCalibration] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[] | null>(null);
  const [calibrationFileName, setCalibrationFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTankNumber("");
    setFuelMode(fuelProducts.length > 0 ? "existing" : "new");
    setFuelProductId(fuelProducts[0]?.id ?? "");
    setNewProductName("");
    setNewProductCode("");
    setCapacityLiters("");
    setTankHeightMm("");
    setHeightAlarmMm("");
    setHeightAlertMm("");
    setLowAlarmMm("");
    setAlertWaterMaxMm("25");
    setSensorSerial("");
    setSkipCalibration(false);
    setCalibrationPoints(null);
    setCalibrationFileName(null);
    setError(null);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCalibrationPoints(parseCalibrationCsv(text));
    setCalibrationFileName(file.name);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tank = await createTank(organizationId, {
        stationId,
        tankNumber: Number(tankNumber),
        displayName: `Cuve ${tankNumber}`,
        capacityLiters: Number(capacityLiters),
        tankHeightMm: Number(tankHeightMm),
        ...(fuelMode === "existing" ? { fuelProductId } : { newFuelProductName: newProductName, newFuelProductCode: newProductCode }),
        heightAlarmMm: Number(heightAlarmMm),
        heightAlertMm: Number(heightAlertMm),
        lowAlarmMm: Number(lowAlarmMm),
        alertWaterMaxMm: Number(alertWaterMaxMm),
      });

      if (sensorSerial.trim()) {
        await createTankSensorMapping(organizationId, { tankId: tank.id, hkSerialNumber: sensorSerial.trim(), measurementType: "product_level" });
      }

      if (!skipCalibration && calibrationPoints && calibrationPoints.length > 0) {
        await replaceTankCalibrationPoints(organizationId, tank.id, calibrationPoints);
      }

      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    tankNumber &&
    capacityLiters &&
    tankHeightMm &&
    heightAlarmMm &&
    heightAlertMm &&
    lowAlarmMm &&
    (fuelMode === "existing" ? fuelProductId : newProductName && newProductCode) &&
    (skipCalibration || (calibrationPoints && calibrationPoints.length > 0));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t("title")}
      size="lg"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" type="submit" form="add-tank-form" loading={submitting} disabled={!canSubmit}>
            {t("submit")}
          </Button>
        </>
      }
    >
      <form id="add-tank-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <Alert tone="error">{error}</Alert>}

        <section className="flex flex-col gap-3">
          <h4 className="text-body-md font-semibold text-text">{t("sections.basics")}</h4>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("tankNumber")} required>
              {(field) => <Input {...field} type="number" min={1} value={tankNumber} onChange={(e) => setTankNumber(e.target.value)} required />}
            </FormField>
            <FormField label={t("capacity")} required>
              {(field) => <Input {...field} type="number" min={1} value={capacityLiters} onChange={(e) => setCapacityLiters(e.target.value)} required />}
            </FormField>
          </div>
          <FormField label={t("tankHeight")} required hint={t("tankHeightHint")}>
            {(field) => <Input {...field} type="number" min={1} value={tankHeightMm} onChange={(e) => setTankHeightMm(e.target.value)} required />}
          </FormField>

          <div className="flex gap-4 text-body-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={fuelMode === "existing"} onChange={() => setFuelMode("existing")} disabled={fuelProducts.length === 0} />
              {t("existingProduct")}
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={fuelMode === "new"} onChange={() => setFuelMode("new")} />
              {t("newProduct")}
            </label>
          </div>
          {fuelMode === "existing" ? (
            <FormField label={t("product")} required>
              {() => (
                <Select
                  aria-label={t("product")}
                  value={fuelProductId}
                  onValueChange={setFuelProductId}
                  options={fuelProducts.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder={t("selectProduct")}
                />
              )}
            </FormField>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t("newProductName")} required>
                {(field) => <Input {...field} value={newProductName} onChange={(e) => setNewProductName(e.target.value)} required />}
              </FormField>
              <FormField label={t("newProductCode")} required>
                {(field) => <Input {...field} value={newProductCode} onChange={(e) => setNewProductCode(e.target.value)} maxLength={10} required />}
              </FormField>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-body-md font-semibold text-text">{t("sections.thresholds")}</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-body-md font-semibold text-text">{t("sections.sensor")}</h4>
          <FormField label={t("sensorSerial")} hint={t("sensorSerialHint")}>
            {(field) => <Input {...field} value={sensorSerial} onChange={(e) => setSensorSerial(e.target.value)} placeholder="SN-123456789" />}
          </FormField>
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-body-md font-semibold text-text">{t("sections.calibration")}</h4>
          <Checkbox
            label={t("skipCalibration")}
            checked={skipCalibration}
            onChange={(e) => setSkipCalibration(e.target.checked)}
          />
          {!skipCalibration && (
            <div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-card border border-dashed border-border bg-surface-muted px-4 py-6 text-center text-body-sm text-text-muted hover:border-primary"
              >
                {calibrationFileName ? t("fileSelected", { name: calibrationFileName, count: calibrationPoints?.length ?? 0 }) : t("dropCsv")}
              </button>
              <p className="mt-1 text-caption text-text-muted">{t("csvFormatHint")}</p>
            </div>
          )}
        </section>
      </form>
    </Modal>
  );
}
