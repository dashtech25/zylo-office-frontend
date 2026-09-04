"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { updateTank, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, FormField, Input, Modal } from "@/shared/ui";

export interface EditThresholdsModalProps {
  organizationId: string;
  tank: Tank;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

/** Modification des seuils d'une cuve existante — même contrat que la
 * section seuils d'`AddTankModal` (mêmes clés de traduction, même ordre
 * logique requis), mais via `PATCH /zylo-liquid/tanks/:id` puisque la cuve
 * existe déjà. */
export function EditThresholdsModal({ organizationId, tank, open, onOpenChange, onUpdated }: EditThresholdsModalProps) {
  const t = useTranslations("zyloLiquid.addTank");
  const tCommon = useTranslations("common");
  const [heightAlarmMm, setHeightAlarmMm] = useState(String(tank.heightAlarmMm));
  const [heightAlertMm, setHeightAlertMm] = useState(String(tank.heightAlertMm));
  const [lowAlarmMm, setLowAlarmMm] = useState(String(tank.lowAlarmMm));
  const [alertWaterMaxMm, setAlertWaterMaxMm] = useState(String(tank.alertWaterMaxMm));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setHeightAlarmMm(String(tank.heightAlarmMm));
      setHeightAlertMm(String(tank.heightAlertMm));
      setLowAlarmMm(String(tank.lowAlarmMm));
      setAlertWaterMaxMm(String(tank.alertWaterMaxMm));
      setError(null);
    }
  }, [open, tank]);

  const thresholdsOrderOk = Number(heightAlarmMm) > Number(heightAlertMm) && Number(heightAlertMm) > Number(lowAlarmMm);
  const canSubmit = heightAlarmMm && heightAlertMm && lowAlarmMm && thresholdsOrderOk;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateTank(organizationId, tank.id, {
        heightAlarmMm: Number(heightAlarmMm),
        heightAlertMm: Number(heightAlertMm),
        lowAlarmMm: Number(lowAlarmMm),
        alertWaterMaxMm: Number(alertWaterMaxMm),
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
      title={t("sections.thresholds")}
      size="md"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" type="submit" form="edit-thresholds-form" loading={submitting} disabled={!canSubmit}>
            {tCommon("actions.save")}
          </Button>
        </>
      }
    >
      <form id="edit-thresholds-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
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
