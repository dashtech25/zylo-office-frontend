"use client";

import { Plus, Wrench } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import {
  assignIntervention,
  closeIntervention,
  createIntervention,
  listEquipment,
  listInterventions,
  listTechnicians,
  type Equipment,
  type Intervention,
  type InterventionPriority,
  type InterventionType,
  type Technician,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, Modal, SearchableSelect, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Textarea } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

const PRIORITIES: InterventionPriority[] = ["critical", "high", "medium", "low"];
const TYPES: InterventionType[] = ["preventive", "corrective"];
const INTERVENTION_STATUS_TONE = { planned: "neutral", in_progress: "warning", closed: "success" } as const;
const PRIORITY_TONE = { critical: "error", high: "warning", medium: "info", low: "neutral" } as const;

/** Domaine « Maintenance » du Centre administratif — équipements et
 * interventions de la station, réutilise le même modèle que l'écran
 * Maintenance réseau (`MaintenanceScreen.tsx`) mais scopé à cette station. */
export function MaintenanceSection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.maintenanceScreen");
  const tCommon = useTranslations("common");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const [equipmentPage, interventionsPage, techniciansPage] = await Promise.all([
      listEquipment(organizationId, { stationId, limit: 100 }),
      listInterventions(organizationId, { stationId, limit: 100 }),
      listTechnicians(organizationId, { limit: 100 }),
    ]);
    return { equipment: equipmentPage.data, interventions: interventionsPage.data, technicians: techniciansPage.data };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, stationId, reloadKey]);
  const state = usePartData(["zylo-liquid", "station-admin", "maintenance", organizationId, stationId, reloadKey], load);

  const [equipmentId, setEquipmentId] = useState("");
  const [priority, setPriority] = useState<InterventionPriority>("medium");
  const [type, setType] = useState<InterventionType>("corrective");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeDiagnosis, setCloseDiagnosis] = useState("");
  const [closeAction, setCloseAction] = useState("");
  const [closeCost, setCloseCost] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);

  async function handleCreate() {
    if (!equipmentId || !description) {
      setError(t("interventions.form.required"));
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createIntervention(organizationId, { equipmentId, stationId, priority, type, description });
      setDescription("");
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

  async function handleAssign(interventionId: string, technicianId: string) {
    await assignIntervention(organizationId, interventionId, technicianId);
    setReloadKey((k) => k + 1);
  }

  async function handleClose(interventionId: string) {
    await closeIntervention(organizationId, interventionId, { diagnosis: closeDiagnosis || undefined, actionTaken: closeAction || undefined, cost: closeCost ? Number(closeCost) : undefined });
    setClosingId(null);
    setCloseDiagnosis("");
    setCloseAction("");
    setCloseCost("");
    setReloadKey((k) => k + 1);
  }

  return (
    <PartStateBox state={state}>
      {state.status === "ready" && (() => {
        const { equipment, interventions, technicians }: { equipment: Equipment[]; interventions: Intervention[]; technicians: Technician[] } = state.data;
        return (
          <Stack>
            <Modal
              open={addModalOpen}
              onOpenChange={(next) => {
                if (!next) closeAddModal();
              }}
              title={t("interventions.form.title")}
              size="md"
              closeLabel={tCommon("actions.close")}
              footer={
                <>
                  <Button variant="outline" size="sm" type="button" onClick={closeAddModal}>{tCommon("actions.cancel")}</Button>
                  <Button size="sm" type="submit" form="add-intervention-form" loading={creating}>
                    <Plus className="size-4" aria-hidden />
                    {t("interventions.form.submit")}
                  </Button>
                </>
              }
            >
              <form id="add-intervention-form" onSubmit={(e) => { e.preventDefault(); void handleCreate(); }} className="flex flex-col gap-4">
                {error && <Alert tone="error">{error}</Alert>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label={t("interventions.form.equipment")}>
                    {() => <SearchableSelect aria-label={t("interventions.form.equipment")} value={equipmentId || undefined} onValueChange={setEquipmentId} placeholder={t("interventions.form.selectEquipment")} options={equipment.map((e) => ({ value: e.id, label: e.name }))} />}
                  </FormField>
                  <FormField label={t("interventions.form.priority")}>
                    {() => <SearchableSelect aria-label={t("interventions.form.priority")} value={priority} onValueChange={(v) => setPriority(v as InterventionPriority)} options={PRIORITIES.map((p) => ({ value: p, label: t(`interventions.priority.${p}`) }))} />}
                  </FormField>
                  <FormField label={t("interventions.form.type")}>
                    {() => <SearchableSelect aria-label={t("interventions.form.type")} value={type} onValueChange={(v) => setType(v as InterventionType)} options={TYPES.map((ty) => ({ value: ty, label: t(`interventions.type.${ty}`) }))} />}
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label={t("interventions.form.description")}>{(field) => <Textarea {...field} value={description} onChange={(e) => setDescription(e.target.value)} />}</FormField>
                  </div>
                </div>
              </form>
            </Modal>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAddModalOpen(true)}>
                <Plus className="size-4" aria-hidden />
                {t("interventions.form.submit")}
              </Button>
            </div>

            {interventions.length === 0 ? (
              <EmptyState icon={Wrench} title={t("interventions.empty")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("interventions.table.priority")}</TableHeaderCell>
                    <TableHeaderCell>{t("interventions.table.equipment")}</TableHeaderCell>
                    <TableHeaderCell>{t("interventions.table.type")}</TableHeaderCell>
                    <TableHeaderCell>{t("interventions.table.status")}</TableHeaderCell>
                    <TableHeaderCell>{t("interventions.table.technician")}</TableHeaderCell>
                    <TableHeaderCell>{t("interventions.table.actions")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {interventions.map((iv) => {
                    const eq = equipment.find((e) => e.id === iv.equipmentId);
                    const technician = technicians.find((tec) => tec.id === iv.technicianId);
                    return (
                      <TableRow key={iv.id}>
                        <TableCell><Badge tone={PRIORITY_TONE[iv.priority]}>{t(`interventions.priority.${iv.priority}`)}</Badge></TableCell>
                        <TableCell>{eq?.name ?? "—"}</TableCell>
                        <TableCell>{t(`interventions.type.${iv.type}`)}</TableCell>
                        <TableCell><Badge tone={INTERVENTION_STATUS_TONE[iv.status]}>{t(`interventions.status.${iv.status}`)}</Badge></TableCell>
                        <TableCell>{technician?.name ?? "—"}</TableCell>
                        <TableCell>
                          {iv.status !== "closed" && !iv.technicianId && (
                            <SearchableSelect aria-label={t("interventions.selectTechnician")} placeholder={t("interventions.assign")} options={technicians.map((tec) => ({ value: tec.id, label: tec.name }))} onValueChange={(technicianId) => handleAssign(iv.id, technicianId)} />
                          )}
                          {iv.status !== "closed" && iv.technicianId && closingId !== iv.id && (
                            <Button variant="outline" size="sm" onClick={() => setClosingId(iv.id)}>{t("interventions.close")}</Button>
                          )}
                          {closingId === iv.id && (
                            <Stack className="mt-2 w-64">
                              <Input placeholder={t("interventions.closeForm.diagnosis")} value={closeDiagnosis} onChange={(e) => setCloseDiagnosis(e.target.value)} />
                              <Input placeholder={t("interventions.closeForm.actionTaken")} value={closeAction} onChange={(e) => setCloseAction(e.target.value)} />
                              <Input placeholder={t("interventions.closeForm.cost")} type="number" value={closeCost} onChange={(e) => setCloseCost(e.target.value)} />
                              <Button size="sm" onClick={() => handleClose(iv.id)}>{t("interventions.closeForm.submit")}</Button>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Stack>
        );
      })()}
    </PartStateBox>
  );
}
