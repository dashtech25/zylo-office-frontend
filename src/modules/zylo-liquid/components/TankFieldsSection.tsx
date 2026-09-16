"use client";

import { Plus } from "lucide-react";
import { useRef } from "react";
import { useTranslations } from "next-intl";

import type { CalibrationPoint, FuelProduct } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, Checkbox, FormField, Input, Select } from "@/shared/ui";

export interface TankSensorRow {
  serial: string;
  measurementType: "product_level" | "water_level" | "temperature";
}

export interface TankFieldsState {
  tankNumber: string;
  fuelMode: "existing" | "new";
  fuelProductId: string;
  newProductName: string;
  newProductCode: string;
  capacityLiters: string;
  tankHeightMm: string;
  heightAlarmMm: string;
  heightAlertMm: string;
  lowAlarmMm: string;
  alertWaterMaxMm: string;
  sensors: TankSensorRow[];
  skipCalibration: boolean;
  calibrationPoints: CalibrationPoint[] | null;
  calibrationFileName: string | null;
}

export function createEmptyTankFieldsState(fuelProducts: FuelProduct[]): TankFieldsState {
  return {
    tankNumber: "",
    fuelMode: fuelProducts.length > 0 ? "existing" : "new",
    fuelProductId: fuelProducts[0]?.id ?? "",
    newProductName: "",
    newProductCode: "",
    capacityLiters: "",
    tankHeightMm: "",
    heightAlarmMm: "",
    heightAlertMm: "",
    lowAlarmMm: "",
    alertWaterMaxMm: "25",
    sensors: [{ serial: "", measurementType: "product_level" }],
    skipCalibration: false,
    calibrationPoints: null,
    calibrationFileName: null,
  };
}

export function isTankFieldsStateValid(state: TankFieldsState, existingTankNumbers: number[]): boolean {
  const tankNumberOk = !!state.tankNumber && Number(state.tankNumber) > 0 && !existingTankNumbers.includes(Number(state.tankNumber));
  const thresholdsOrderOk =
    !!state.heightAlarmMm &&
    !!state.heightAlertMm &&
    !!state.lowAlarmMm &&
    Number(state.heightAlarmMm) > Number(state.heightAlertMm) &&
    Number(state.heightAlertMm) > Number(state.lowAlarmMm);
  const fuelOk = state.fuelMode === "existing" ? !!state.fuelProductId : !!state.newProductName && !!state.newProductCode;
  return (
    tankNumberOk &&
    !!state.capacityLiters &&
    Number(state.capacityLiters) > 0 &&
    !!state.tankHeightMm &&
    Number(state.tankHeightMm) > 0 &&
    thresholdsOrderOk &&
    fuelOk &&
    (state.skipCalibration || (!!state.calibrationPoints && state.calibrationPoints.length > 0))
  );
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

/** Sélection du produit carburant (existant ou nouveau créé à la volée) —
 * extrait de `TankFieldsSection` (P0-1, audit module Stations 2026-09-16)
 * pour être réutilisé aussi par `EditTankModal`, qui permet de changer le
 * produit d'une cuve déjà créée sans dupliquer ce bloc. Contrôlé comme le
 * reste de `TankFieldsState` : le parent porte l'état, ce composant ne fait
 * que le lire/l'écrire via `set`. */
export function TankProductField({
  fuelMode,
  fuelProductId,
  newProductName,
  newProductCode,
  fuelProducts,
  onChange,
}: {
  fuelMode: TankFieldsState["fuelMode"];
  fuelProductId: string;
  newProductName: string;
  newProductCode: string;
  fuelProducts: FuelProduct[];
  onChange: (patch: Pick<TankFieldsState, "fuelMode" | "fuelProductId" | "newProductName" | "newProductCode">) => void;
}) {
  const t = useTranslations("zyloLiquid.addTank");

  function patch(next: Partial<Pick<TankFieldsState, "fuelMode" | "fuelProductId" | "newProductName" | "newProductCode">>) {
    onChange({ fuelMode, fuelProductId, newProductName, newProductCode, ...next });
  }

  return (
    <>
      <div className="flex gap-4 text-body-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={fuelMode === "existing"} onChange={() => patch({ fuelMode: "existing" })} disabled={fuelProducts.length === 0} />
          {t("existingProduct")}
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={fuelMode === "new"} onChange={() => patch({ fuelMode: "new" })} />
          {t("newProduct")}
        </label>
      </div>
      {fuelMode === "existing" ? (
        <FormField label={t("product")} required>
          {() => (
            <Select
              aria-label={t("product")}
              value={fuelProductId}
              onValueChange={(v) => patch({ fuelProductId: v })}
              options={fuelProducts.map((p) => ({ value: p.id, label: p.name }))}
              placeholder={t("selectProduct")}
            />
          )}
        </FormField>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("newProductName")} required>
            {(field) => <Input {...field} value={newProductName} onChange={(e) => patch({ newProductName: e.target.value })} required />}
          </FormField>
          <FormField label={t("newProductCode")} required>
            {(field) => <Input {...field} value={newProductCode} onChange={(e) => patch({ newProductCode: e.target.value })} maxLength={10} required />}
          </FormField>
        </div>
      )}
    </>
  );
}

/** Champs de création/configuration d'une cuve — sections numérotées
 * (Point 13 de la spécification), réutilisées telles quelles par
 * `AddTankModal` (une cuve, sur une station existante) et par le bloc
 * "Cuves" de `CreateStationModal` (plusieurs cuves, saisies en même temps
 * que la station). Composant entièrement contrôlé : aucun état interne
 * autre que la référence de l'input file, pour que le parent porte la
 * liste de cuves (station) ou l'unique cuve (AddTankModal) sans dupliquer
 * la logique de saisie. */
export function TankFieldsSection({
  state,
  onChange,
  fuelProducts,
  existingTankNumbers,
}: {
  state: TankFieldsState;
  onChange: (next: TankFieldsState) => void;
  fuelProducts: FuelProduct[];
  existingTankNumbers: number[];
}) {
  const t = useTranslations("zyloLiquid.addTank");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof TankFieldsState>(key: K, value: TankFieldsState[K]) {
    onChange({ ...state, [key]: value });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    set("calibrationPoints", parseCalibrationCsv(text));
    set("calibrationFileName", file.name);
  }

  const tankNumberError = state.tankNumber
    ? Number(state.tankNumber) <= 0
      ? t("validation.tankNumberPositive")
      : existingTankNumbers.includes(Number(state.tankNumber))
        ? t("validation.tankNumberDuplicate")
        : null
    : null;

  const thresholdsOrderOk =
    !state.heightAlarmMm ||
    !state.heightAlertMm ||
    !state.lowAlarmMm ||
    (Number(state.heightAlarmMm) > Number(state.heightAlertMm) && Number(state.heightAlertMm) > Number(state.lowAlarmMm));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h4 className="text-body-md font-semibold text-text">{t("sections.basics")}</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("tankNumber")} required error={tankNumberError ?? undefined}>
            {(field) => <Input {...field} type="number" min={1} value={state.tankNumber} onChange={(e) => set("tankNumber", e.target.value)} required />}
          </FormField>
          <FormField label={t("capacity")} required>
            {(field) => <Input {...field} type="number" min={1} value={state.capacityLiters} onChange={(e) => set("capacityLiters", e.target.value)} required />}
          </FormField>
        </div>
        <FormField label={t("tankHeight")} required hint={t("tankHeightHint")}>
          {(field) => <Input {...field} type="number" min={1} value={state.tankHeightMm} onChange={(e) => set("tankHeightMm", e.target.value)} required />}
        </FormField>

        <TankProductField
          fuelMode={state.fuelMode}
          fuelProductId={state.fuelProductId}
          newProductName={state.newProductName}
          newProductCode={state.newProductCode}
          fuelProducts={fuelProducts}
          onChange={(patch) => onChange({ ...state, ...patch })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="text-body-md font-semibold text-text">{t("sections.thresholds")}</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label={t("thresholdHigh")} required>
            {(field) => <Input {...field} type="number" value={state.heightAlarmMm} onChange={(e) => set("heightAlarmMm", e.target.value)} required />}
          </FormField>
          <FormField label={t("thresholdPreAlarm")} required>
            {(field) => <Input {...field} type="number" value={state.heightAlertMm} onChange={(e) => set("heightAlertMm", e.target.value)} required />}
          </FormField>
          <FormField label={t("thresholdLow")} required>
            {(field) => <Input {...field} type="number" value={state.lowAlarmMm} onChange={(e) => set("lowAlarmMm", e.target.value)} required />}
          </FormField>
          <FormField label={t("thresholdWater")}>
            {(field) => <Input {...field} type="number" value={state.alertWaterMaxMm} onChange={(e) => set("alertWaterMaxMm", e.target.value)} />}
          </FormField>
        </div>
        <Alert tone={thresholdsOrderOk ? "info" : "error"}>{t("validation.thresholdOrder")}</Alert>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-body-md font-semibold text-text">{t("sections.sensor")}</h4>
          <Button type="button" variant="outline" size="sm" onClick={() => set("sensors", [...state.sensors, { serial: "", measurementType: "water_level" }])}>
            <Plus className="size-4" aria-hidden />
            {t("addAnotherSensor")}
          </Button>
        </div>
        {state.sensors.map((sensor, index) => (
          <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t("sensorSerial")} hint={index === 0 ? t("sensorSerialHint") : undefined}>
              {(field) => (
                <Input
                  {...field}
                  value={sensor.serial}
                  onChange={(e) => set("sensors", state.sensors.map((r, i) => (i === index ? { ...r, serial: e.target.value } : r)))}
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
                    set(
                      "sensors",
                      state.sensors.map((r, i) => (i === index ? { ...r, measurementType: v as TankSensorRow["measurementType"] } : r))
                    )
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
        <Checkbox label={t("skipCalibration")} checked={state.skipCalibration} onChange={(e) => set("skipCalibration", e.target.checked)} />
        {!state.skipCalibration && (
          <div>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-card border border-dashed border-border bg-surface-muted px-4 py-6 text-center text-body-sm text-text-muted hover:border-primary"
            >
              {state.calibrationFileName ? t("fileSelected", { name: state.calibrationFileName, count: state.calibrationPoints?.length ?? 0 }) : t("dropCsv")}
            </button>
            <p className="mt-1 text-caption text-text-muted">{t("csvFormatHint")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
