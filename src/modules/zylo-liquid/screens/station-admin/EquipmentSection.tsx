"use client";

import { Plus, Wrench } from "lucide-react";
import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { createEquipment, listEquipment, type Equipment } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatFreshness } from "@/shared/lib/formatDateTime";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, Modal, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

const EQUIPMENT_TYPES = ["pompe", "sonde", "console", "dtu", "electrique", "securite", "autre"] as const;
const EQUIPMENT_STATUS_TONE = { in_service: "success", out_of_order: "error", out_of_service: "neutral" } as const;

/** Domaine « Équipements & IoT » du Centre administratif — table complète
 * `Equipment` de la station (pas seulement les pompes, contrairement à
 * `PumpsTab.tsx` qui reste la vue réseau-standard filtrée). Réutilise
 * `listEquipment`/`createEquipment` déjà exploités par l'écran Maintenance
 * réseau, ici scopés à la station. */
export function EquipmentSection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.maintenanceScreen.equipment");
  const format = useFormatter();
  const tCommon = useTranslations("common");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(
    () => listEquipment(organizationId, { stationId, limit: 100 }).then((p) => p.data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organizationId, stationId, reloadKey]
  );
  const state = usePartData(["zylo-liquid", "station-admin", "equipment", organizationId, stationId, reloadKey], load);

  const [type, setType] = useState<(typeof EQUIPMENT_TYPES)[number]>("autre");
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  async function handleCreate() {
    if (!name) {
      setError(t("form.required"));
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createEquipment(organizationId, { stationId, type, name, manufacturer: manufacturer || undefined, model: model || undefined, serialNumber: serialNumber || undefined });
      setName("");
      setManufacturer("");
      setModel("");
      setSerialNumber("");
      setReloadKey((k) => k + 1);
      setAddModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreating(false);
    }
  }

  function closeAddModal() {
    setAddModalOpen(false);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <Modal
        open={addModalOpen}
        onOpenChange={(next) => {
          if (!next) closeAddModal();
        }}
        title={t("form.title")}
        size="md"
        closeLabel={tCommon("actions.close")}
        footer={
          <>
            <Button variant="outline" size="sm" type="button" onClick={closeAddModal}>{tCommon("actions.cancel")}</Button>
            <Button size="sm" type="submit" form="add-equipment-form" loading={creating}>
              <Plus className="size-4" aria-hidden />
              {t("form.submit")}
            </Button>
          </>
        }
      >
        <form id="add-equipment-form" onSubmit={(e) => { e.preventDefault(); void handleCreate(); }} className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t("form.type")}>
              {() => <Select aria-label={t("form.type")} value={type} onValueChange={(v) => setType(v as (typeof EQUIPMENT_TYPES)[number])} options={EQUIPMENT_TYPES.map((v) => ({ value: v, label: t(`type.${v}`) }))} />}
            </FormField>
            <FormField label={t("form.name")}>{(field) => <Input {...field} value={name} onChange={(e) => setName(e.target.value)} />}</FormField>
            <FormField label={t("form.manufacturer")}>{(field) => <Input {...field} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />}</FormField>
            <FormField label={t("form.model")}>{(field) => <Input {...field} value={model} onChange={(e) => setModel(e.target.value)} />}</FormField>
            <FormField label={t("form.serialNumber")}>{(field) => <Input {...field} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />}</FormField>
          </div>
        </form>
      </Modal>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddModalOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {t("form.submit")}
        </Button>
      </div>

      <Card padding="none">
        <PartStateBox state={state}>
          {state.status === "ready" &&
            (state.data.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={Wrench} title={t("empty")} />
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("table.type")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.name")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.lastMaintenance")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.data.map((eq: Equipment) => (
                    <TableRow key={eq.id}>
                      <TableCell>{t(`type.${eq.type}`)}</TableCell>
                      <TableCell className="font-medium">{eq.name}</TableCell>
                      <TableCell>
                        <Badge tone={EQUIPMENT_STATUS_TONE[eq.status]}>{t(`status.${eq.status}`)}</Badge>
                      </TableCell>
                      <TableCell>{eq.lastMaintenanceAt ? formatFreshness(eq.lastMaintenanceAt, format) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}
        </PartStateBox>
      </Card>
    </div>
  );
}
