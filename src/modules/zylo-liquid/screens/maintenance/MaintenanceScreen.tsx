"use client";

import { Plus, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import type { Intervention, InterventionPriority, InterventionType } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, PageHeader, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Tabs, Textarea } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useMaintenance } from "./useMaintenance";

const EQUIPMENT_TYPES = ["pompe", "sonde", "console", "dtu", "electrique", "securite", "autre"] as const;
const PRIORITIES: InterventionPriority[] = ["critical", "high", "medium", "low"];
const TYPES: InterventionType[] = ["preventive", "corrective"];

const EQUIPMENT_STATUS_TONE = { in_service: "success", out_of_order: "error", out_of_service: "neutral" } as const;
const INTERVENTION_STATUS_TONE = { planned: "neutral", in_progress: "warning", closed: "success" } as const;
const PRIORITY_TONE = { critical: "error", high: "warning", medium: "info", low: "neutral" } as const;

/** Maintenance (Bloc 6 de la mission « vente-maintenant-reglementation ») —
 * hiérarchie Station -> Équipement -> Intervention, deux vues (liste
 * d'équipements / liste d'interventions), pas de kanban dans cette première
 * implémentation (décidé en Phase 4 §2.2 du plan de mission, à ajouter
 * plus tard si confirmé utile — la liste filtrée par statut suffit ici). */
export default function MaintenanceScreen() {
  const t = useTranslations("zyloLiquid.maintenanceScreen");
  const tCommon = useTranslations("common");
  const { currentOrganization } = useOrganization();
  const data = useMaintenance(currentOrganization?.id ?? null);

  // Formulaire équipement
  const [eqStationId, setEqStationId] = useState("");
  const [eqType, setEqType] = useState<(typeof EQUIPMENT_TYPES)[number]>("pompe");
  const [eqName, setEqName] = useState("");
  const [eqManufacturer, setEqManufacturer] = useState("");
  const [eqModel, setEqModel] = useState("");
  const [eqSerial, setEqSerial] = useState("");
  const [eqCreating, setEqCreating] = useState(false);
  const [eqError, setEqError] = useState<string | null>(null);

  // Formulaire intervention
  const [ivEquipmentId, setIvEquipmentId] = useState("");
  const [ivPriority, setIvPriority] = useState<InterventionPriority>("medium");
  const [ivType, setIvType] = useState<InterventionType>("corrective");
  const [ivDescription, setIvDescription] = useState("");
  const [ivCreating, setIvCreating] = useState(false);
  const [ivError, setIvError] = useState<string | null>(null);

  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeDiagnosis, setCloseDiagnosis] = useState("");
  const [closeAction, setCloseAction] = useState("");
  const [closeCost, setCloseCost] = useState("");

  async function handleCreateEquipment() {
    if (!eqStationId || !eqType || !eqName) {
      setEqError(t("equipment.form.required"));
      return;
    }
    setEqCreating(true);
    setEqError(null);
    try {
      await data.addEquipment({ stationId: eqStationId, type: eqType, name: eqName, manufacturer: eqManufacturer || undefined, model: eqModel || undefined, serialNumber: eqSerial || undefined });
      setEqName("");
      setEqManufacturer("");
      setEqModel("");
      setEqSerial("");
    } catch (err) {
      setEqError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setEqCreating(false);
    }
  }

  async function handleCreateIntervention() {
    const equipment = data.equipment.find((e) => e.id === ivEquipmentId);
    if (!equipment || !ivPriority || !ivType || !ivDescription) {
      setIvError(t("interventions.form.required"));
      return;
    }
    setIvCreating(true);
    setIvError(null);
    try {
      await data.reportIntervention({ equipmentId: equipment.id, stationId: equipment.stationId, priority: ivPriority, type: ivType, description: ivDescription });
      setIvDescription("");
    } catch (err) {
      setIvError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setIvCreating(false);
    }
  }

  async function handleClose(intervention: Intervention) {
    await data.close(intervention.id, { diagnosis: closeDiagnosis || undefined, actionTaken: closeAction || undefined, cost: closeCost ? Number(closeCost) : undefined });
    setClosingId(null);
    setCloseDiagnosis("");
    setCloseAction("");
    setCloseCost("");
  }

  const equipmentTab = (
    <Stack>
      {eqError && <Alert tone="error">{eqError}</Alert>}
      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("equipment.form.title")}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("equipment.form.station")}>
            {() => <Select aria-label={t("equipment.form.station")} value={eqStationId || undefined} onValueChange={setEqStationId} placeholder={t("equipment.form.selectStation")} options={data.stations.map((s) => ({ value: s.id, label: s.name }))} />}
          </FormField>
          <FormField label={t("equipment.form.type")}>
            {() => <Select aria-label={t("equipment.form.type")} value={eqType} onValueChange={(v) => setEqType(v as (typeof EQUIPMENT_TYPES)[number])} options={EQUIPMENT_TYPES.map((v) => ({ value: v, label: v }))} />}
          </FormField>
          <FormField label={t("equipment.form.name")}>
            {(field) => <Input {...field} value={eqName} onChange={(e) => setEqName(e.target.value)} />}
          </FormField>
          <FormField label={t("equipment.form.manufacturer")}>
            {(field) => <Input {...field} value={eqManufacturer} onChange={(e) => setEqManufacturer(e.target.value)} />}
          </FormField>
          <FormField label={t("equipment.form.model")}>
            {(field) => <Input {...field} value={eqModel} onChange={(e) => setEqModel(e.target.value)} />}
          </FormField>
          <FormField label={t("equipment.form.serialNumber")}>
            {(field) => <Input {...field} value={eqSerial} onChange={(e) => setEqSerial(e.target.value)} />}
          </FormField>
        </div>
        <Button className="mt-4" onClick={handleCreateEquipment} loading={eqCreating}>
          <Plus className="size-4" aria-hidden />
          {t("equipment.form.submit")}
        </Button>
      </Card>

      {data.equipment.length === 0 ? (
        <EmptyState icon={Wrench} title={t("equipment.empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("equipment.table.type")}</TableHeaderCell>
              <TableHeaderCell>{t("equipment.table.name")}</TableHeaderCell>
              <TableHeaderCell>{t("equipment.table.station")}</TableHeaderCell>
              <TableHeaderCell>{t("equipment.table.status")}</TableHeaderCell>
              <TableHeaderCell>{t("equipment.table.lastMaintenance")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.equipment.map((eq) => {
              const station = data.stations.find((s) => s.id === eq.stationId);
              return (
                <TableRow key={eq.id}>
                  <TableCell>{eq.type}</TableCell>
                  <TableCell>{eq.name}</TableCell>
                  <TableCell>{station?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge tone={EQUIPMENT_STATUS_TONE[eq.status]}>{t(`equipment.status.${eq.status}`)}</Badge>
                  </TableCell>
                  <TableCell>{eq.lastMaintenanceAt ?? "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Stack>
  );

  const interventionsTab = (
    <Stack>
      {ivError && <Alert tone="error">{ivError}</Alert>}
      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("interventions.form.title")}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("interventions.form.equipment")}>
            {() => <Select aria-label={t("interventions.form.equipment")} value={ivEquipmentId || undefined} onValueChange={setIvEquipmentId} placeholder={t("interventions.form.selectEquipment")} options={data.equipment.map((e) => ({ value: e.id, label: e.name }))} />}
          </FormField>
          <FormField label={t("interventions.form.priority")}>
            {() => <Select aria-label={t("interventions.form.priority")} value={ivPriority} onValueChange={(v) => setIvPriority(v as InterventionPriority)} options={PRIORITIES.map((p) => ({ value: p, label: t(`interventions.priority.${p}`) }))} />}
          </FormField>
          <FormField label={t("interventions.form.type")}>
            {() => <Select aria-label={t("interventions.form.type")} value={ivType} onValueChange={(v) => setIvType(v as InterventionType)} options={TYPES.map((ty) => ({ value: ty, label: t(`interventions.type.${ty}`) }))} />}
          </FormField>
          <div className="sm:col-span-3">
            <FormField label={t("interventions.form.description")}>
              {(field) => <Textarea {...field} value={ivDescription} onChange={(e) => setIvDescription(e.target.value)} />}
            </FormField>
          </div>
        </div>
        <Button className="mt-4" onClick={handleCreateIntervention} loading={ivCreating}>
          <Plus className="size-4" aria-hidden />
          {t("interventions.form.submit")}
        </Button>
      </Card>

      {data.interventions.length === 0 ? (
        <EmptyState icon={Wrench} title={t("interventions.empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("interventions.table.priority")}</TableHeaderCell>
              <TableHeaderCell>{t("interventions.table.equipment")}</TableHeaderCell>
              <TableHeaderCell>{t("interventions.table.station")}</TableHeaderCell>
              <TableHeaderCell>{t("interventions.table.type")}</TableHeaderCell>
              <TableHeaderCell>{t("interventions.table.status")}</TableHeaderCell>
              <TableHeaderCell>{t("interventions.table.technician")}</TableHeaderCell>
              <TableHeaderCell>{t("interventions.table.actions")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.interventions.map((iv) => {
              const equipment = data.equipment.find((e) => e.id === iv.equipmentId);
              const station = data.stations.find((s) => s.id === iv.stationId);
              const technician = data.technicians.find((tec) => tec.id === iv.technicianId);
              return (
                <TableRow key={iv.id}>
                  <TableCell>
                    <Badge tone={PRIORITY_TONE[iv.priority]}>{t(`interventions.priority.${iv.priority}`)}</Badge>
                  </TableCell>
                  <TableCell>{equipment?.name ?? "—"}</TableCell>
                  <TableCell>{station?.name ?? "—"}</TableCell>
                  <TableCell>{t(`interventions.type.${iv.type}`)}</TableCell>
                  <TableCell>
                    <Badge tone={INTERVENTION_STATUS_TONE[iv.status]}>{t(`interventions.status.${iv.status}`)}</Badge>
                  </TableCell>
                  <TableCell>{technician?.name ?? "—"}</TableCell>
                  <TableCell>
                    {iv.status !== "closed" && !iv.technicianId && (
                      <Select
                        aria-label={t("interventions.selectTechnician")}
                        placeholder={t("interventions.assign")}
                        options={data.technicians.map((tec) => ({ value: tec.id, label: tec.name }))}
                        onValueChange={(technicianId) => data.assign(iv.id, technicianId)}
                      />
                    )}
                    {iv.status !== "closed" && iv.technicianId && closingId !== iv.id && (
                      <Button variant="secondary" onClick={() => setClosingId(iv.id)}>
                        {t("interventions.close")}
                      </Button>
                    )}
                    {closingId === iv.id && (
                      <Stack className="mt-2 w-64">
                        <Input placeholder={t("interventions.closeForm.diagnosis")} value={closeDiagnosis} onChange={(e) => setCloseDiagnosis(e.target.value)} />
                        <Input placeholder={t("interventions.closeForm.actionTaken")} value={closeAction} onChange={(e) => setCloseAction(e.target.value)} />
                        <Input placeholder={t("interventions.closeForm.cost")} type="number" value={closeCost} onChange={(e) => setCloseCost(e.target.value)} />
                        <Button onClick={() => handleClose(iv)}>{t("interventions.closeForm.submit")}</Button>
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

  return (
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />
      {data.error && <Alert tone="error">{data.error}</Alert>}
      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : (
        <Tabs
          items={[
            { value: "equipment", label: t("tabs.equipment"), content: equipmentTab },
            { value: "interventions", label: t("tabs.interventions"), content: interventionsTab },
          ]}
        />
      )}
    </Stack>
  );
}
