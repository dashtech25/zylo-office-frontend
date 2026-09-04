"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/core/api/client";
import { createTank, createTankSensorMapping, replaceTankCalibrationPoints, type FuelProduct } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, Modal } from "@/shared/ui";

import { createEmptyTankFieldsState, isTankFieldsStateValid, TankFieldsSection } from "@/modules/zylo-liquid/components/TankFieldsSection";

export interface AddTankModalProps {
  organizationId: string;
  stationId: string;
  fuelProducts: FuelProduct[];
  existingTankNumbers: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

/** Modal de création de cuve — les champs (sections numérotées, seuils,
 * capteurs répétables, calibration) vivent dans `TankFieldsSection`,
 * partagée avec le bloc "Cuves" de `CreateStationModal` pour ne pas
 * dupliquer cette saisie à deux endroits. */
export function AddTankModal({ organizationId, stationId, fuelProducts, existingTankNumbers, open, onOpenChange, onCreated }: AddTankModalProps) {
  const t = useTranslations("zyloLiquid.addTank");
  const tCommon = useTranslations("common");

  const [state, setState] = useState(() => createEmptyTankFieldsState(fuelProducts));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setState(createEmptyTankFieldsState(fuelProducts));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tank = await createTank(organizationId, {
        stationId,
        tankNumber: Number(state.tankNumber),
        displayName: `Cuve ${state.tankNumber}`,
        capacityLiters: Number(state.capacityLiters),
        tankHeightMm: Number(state.tankHeightMm),
        ...(state.fuelMode === "existing" ? { fuelProductId: state.fuelProductId } : { newFuelProductName: state.newProductName, newFuelProductCode: state.newProductCode }),
        heightAlarmMm: Number(state.heightAlarmMm),
        heightAlertMm: Number(state.heightAlertMm),
        lowAlarmMm: Number(state.lowAlarmMm),
        alertWaterMaxMm: Number(state.alertWaterMaxMm),
      });

      for (const sensor of state.sensors) {
        if (sensor.serial.trim()) {
          await createTankSensorMapping(organizationId, { tankId: tank.id, hkSerialNumber: sensor.serial.trim(), measurementType: sensor.measurementType });
        }
      }

      if (!state.skipCalibration && state.calibrationPoints && state.calibrationPoints.length > 0) {
        await replaceTankCalibrationPoints(organizationId, tank.id, state.calibrationPoints);
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

  const canSubmit = isTankFieldsStateValid(state, existingTankNumbers);

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
        <TankFieldsSection state={state} onChange={setState} fuelProducts={fuelProducts} existingTankNumbers={existingTankNumbers} />
      </form>
    </Modal>
  );
}
