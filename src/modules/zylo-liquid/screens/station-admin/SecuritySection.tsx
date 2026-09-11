"use client";

import { Plus, Shield } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import {
  createSecurityEquipment,
  listSecurityEquipment,
  updateSecurityEquipment,
  type SecurityEquipmentCategory,
  type SecurityEquipmentConformityStatus,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, CardSectionHeader, EmptyState, FormField, Input, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

const CATEGORIES: SecurityEquipmentCategory[] = ["extincteur", "systeme_incendie", "arret_urgence", "point_evacuation", "zone_atex", "autre"];
const CONFORMITY_STATUSES: SecurityEquipmentConformityStatus[] = ["conforme", "non_conforme", "a_controler"];
const CONFORMITY_TONE = { conforme: "success", non_conforme: "error", a_controler: "warning" } as const;

/** Domaine « Sécurité » du Centre administratif — équipements de sécurité
 * incendie / zones ATEX (mêmes champs que le tableau déjà validé par le
 * prototype, `pageStation` onglet `conformite`), backend construit pour
 * cette mission (`SecurityEquipment`, absent avant ce lot). */
export function SecuritySection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationAdmin.security");
  const tCommon = useTranslations("common");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(
    () => listSecurityEquipment(organizationId, { stationId, limit: 100 }).then((p) => p.data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organizationId, stationId, reloadKey]
  );
  const state = usePartData(["zylo-liquid", "station-admin", "security", organizationId, stationId, reloadKey], load);

  const [category, setCategory] = useState<SecurityEquipmentCategory>("extincteur");
  const [label, setLabel] = useState("");
  const [lastControlAt, setLastControlAt] = useState("");
  const [nextControlDueAt, setNextControlDueAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!label) {
      setError(t("form.required"));
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createSecurityEquipment(organizationId, { stationId, category, label, lastControlAt: lastControlAt || undefined, nextControlDueAt: nextControlDueAt || undefined });
      setLabel("");
      setLastControlAt("");
      setNextControlDueAt("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateStatus(id: string, conformityStatus: SecurityEquipmentConformityStatus) {
    await updateSecurityEquipment(organizationId, id, { conformityStatus });
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        <CardSectionHeader title={t("form.title")} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <FormField label={t("form.category")}>
            {() => <Select aria-label={t("form.category")} value={category} onValueChange={(v) => setCategory(v as SecurityEquipmentCategory)} options={CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) }))} />}
          </FormField>
          <FormField label={t("form.label")}>{(field) => <Input {...field} value={label} onChange={(e) => setLabel(e.target.value)} />}</FormField>
          <FormField label={t("form.lastControlAt")}>{(field) => <Input {...field} type="date" value={lastControlAt} onChange={(e) => setLastControlAt(e.target.value)} />}</FormField>
          <FormField label={t("form.nextControlDueAt")}>{(field) => <Input {...field} type="date" value={nextControlDueAt} onChange={(e) => setNextControlDueAt(e.target.value)} />}</FormField>
        </div>
        <Button className="mt-4" size="sm" onClick={handleCreate} loading={creating}>
          <Plus className="size-4" aria-hidden />
          {t("form.submit")}
        </Button>
      </Card>

      <Card padding="none">
        <PartStateBox state={state}>
          {state.status === "ready" &&
            (state.data.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={Shield} title={t("empty")} />
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("table.category")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.label")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.lastControlAt")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.nextControlDueAt")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.conformityStatus")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.data.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell>{t(`category.${eq.category}`)}</TableCell>
                      <TableCell className="font-medium">{eq.label}</TableCell>
                      <TableCell>{eq.lastControlAt ?? "—"}</TableCell>
                      <TableCell>{eq.nextControlDueAt ?? "—"}</TableCell>
                      <TableCell>
                        <Select
                          aria-label={t("table.conformityStatus")}
                          value={eq.conformityStatus}
                          onValueChange={(v) => handleUpdateStatus(eq.id, v as SecurityEquipmentConformityStatus)}
                          options={CONFORMITY_STATUSES.map((s) => ({ value: s, label: t(`conformityStatus.${s}`) }))}
                        />
                        <Badge tone={CONFORMITY_TONE[eq.conformityStatus]} className="ml-2">{t(`conformityStatus.${eq.conformityStatus}`)}</Badge>
                      </TableCell>
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
