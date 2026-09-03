"use client";

import { Plus } from "lucide-react";
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
  existingTankNumbers: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface SensorRow {
  serial: string;
  measurementType: "product_level" | "water_level" | "temperature";
}

/** Parse un CSV "hauteur;volume" (séparateur point-virgule) — jamais
 * d'upload serveur : raccourci de saisie côté client pour
 * PUT /tanks/{id}/calibration-points. */
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

/** Modal de création de cuve. Reprend la structure demandée par le
 * commanditaire (sections numérotées, validations en temps réel, capteurs
 * répétables), avec une réserve documentée : le "type de mesure" de la
 * spécification (Hauteur/Volume/Hauteur+Volume) ne correspond à aucune
 * valeur réelle du modèle — `TankSensorMapping.measurementType` ne connaît
 * que product_level/water_level/temperature (endpoint 4, déjà en
 * production). Plutôt que d'inventer un enum qui casserait la création
 * réelle du mapping, le sélecteur "type de mesure" propose ces 3 valeurs
 * réelles — chaque ligne de capteur associe donc un numéro de série à l'un
 * de ces 3 canaux physiques, ce qui correspond au même besoin (plusieurs
 * capteurs sur une même cuve) avec des données qui existent vraiment. */
export function AddTankModal({ organizationId, stationId, fuelProducts, existingTankNumbers, open, onOpenChange, onCreated }: AddTankModalProps) {
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
  const [sensors, setSensors] = useState<SensorRow[]>([{ serial: "", measurementType: "product_level" }]);
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
    setSensors([{ serial: "", measurementType: "product_level" }]);
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

  const tankNumberError = tankNumber
    ? Number(tankNumber) <= 0
      ? t("validation.tankNumberPositive")
      : existingTankNumbers.includes(Number(tankNumber))
        ? t("validation.tankNumberDuplicate")
        : null
    : null;

  const thresholdsOrderOk =
    !heightAlarmMm || !heightAlertMm || !lowAlarmMm || (Number(heightAlarmMm) > Number(heightAlertMm) && Number(heightAlertMm) > Number(lowAlarmMm));

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

      for (const sensor of sensors) {
        if (sensor.serial.trim()) {
          await createTankSensorMapping(organizationId, { tankId: tank.id, hkSerialNumber: sensor.serial.trim(), measurementType: sensor.measurementType });
        }
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
    !tankNumberError &&
    capacityLiters &&
    Number(capacityLiters) > 0 &&
    tankHeightMm &&
    Number(tankHeightMm) > 0 &&
    heightAlarmMm &&
    heightAlertMm &&
    lowAlarmMm &&
    thresholdsOrderOk &&
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
      preventOutsideClose
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
            <FormField label={t("tankNumber")} required error={tankNumberError ?? undefined}>
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
          <Alert tone={thresholdsOrderOk ? "info" : "error"}>{t("validation.thresholdOrder")}</Alert>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-body-md font-semibold text-text">{t("sections.sensor")}</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSensors((rows) => [...rows, { serial: "", measurementType: "water_level" }])}
            >
              <Plus className="size-4" aria-hidden />
              {t("addAnotherSensor")}
            </Button>
          </div>
          {sensors.map((sensor, index) => (
            <div key={index} className="grid grid-cols-2 gap-3">
              <FormField label={t("sensorSerial")} hint={index === 0 ? t("sensorSerialHint") : undefined}>
                {(field) => (
                  <Input
                    {...field}
                    value={sensor.serial}
                    onChange={(e) => setSensors((rows) => rows.map((r, i) => (i === index ? { ...r, serial: e.target.value } : r)))}
                    placeholder="SN-123456789"
                  />
                )}
              </FormField>
              <FormField label={t("measurementType")}>
                {() => (
                  <Select
                    aria-label={t("measurementType")}
                    value={sensor.measurementType}
                    onValueChange={(v) =>
                      setSensors((rows) => rows.map((r, i) => (i === index ? { ...r, measurementType: v as SensorRow["measurementType"] } : r)))
                    }
                    options={[
                      { value: "product_level", label: t("measurementTypes.productLevel") },
                      { value: "water_level", label: t("measurementTypes.waterLevel") },
                      { value: "temperature", label: t("measurementTypes.temperature") },
                    ]}
                  />
                )}
              </FormField>
            </div>
          ))}
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
