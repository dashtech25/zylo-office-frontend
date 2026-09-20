"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { createPump, updatePump, type Pump, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, FormField, Input, Modal, SearchableSelect } from "@/shared/ui";

export interface PumpFormModalProps {
  organizationId: string;
  stationId: string;
  tanks: Tank[];
  pump: Pump | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Création/édition d'une pompe en un seul composant — le champ Statut
 * n'apparaît qu'en édition (une pompe créée démarre toujours active côté
 * backend, inutile de le demander à la création). */
export function PumpFormModal({ organizationId, stationId, tanks, pump, open, onOpenChange, onSaved }: PumpFormModalProps) {
  const t = useTranslations("zyloLiquid.stationDetail.pumpsTab");
  const tCommon = useTranslations("common");

  const [name, setName] = useState(pump?.name ?? "");
  const [tankId, setTankId] = useState(pump?.tankId ?? "");
  const [active, setActive] = useState(pump?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Réinitialise l'état local à chaque (ré)ouverture pour éviter qu'une
  // saisie reste collée d'un pump édité au suivant (ou à la création).
  useEffect(() => {
    if (!open) return;
    setName(pump?.name ?? "");
    setTankId(pump?.tankId ?? "");
    setActive(pump?.active ?? true);
    setFormError(null);
  }, [pump, open]);

  function reset() {
    setName(pump?.name ?? "");
    setTankId(pump?.tankId ?? "");
    setActive(pump?.active ?? true);
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !tankId) {
      setFormError(t("form.required"));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (pump === null) {
        await createPump(organizationId, { stationId, tankId, name: name.trim() });
      } else {
        await updatePump(organizationId, pump.id, { tankId, name: name.trim(), active });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t(pump ? "editTitle" : "createTitle")}
      size="sm"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" type="submit" form="pump-form" loading={submitting}>
            {t("form.submit")}
          </Button>
        </>
      }
    >
      <form id="pump-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <FormField label={t("form.name")} required>
          {(field) => <Input {...field} value={name} onChange={(e) => setName(e.target.value)} />}
        </FormField>
        <FormField label={t("form.tank")} required>
          {() => (
            <SearchableSelect
              aria-label={t("form.tank")}
              value={tankId || undefined}
              onValueChange={setTankId}
              placeholder={t("form.selectTank")}
              options={tanks.map((tk) => ({ value: tk.id, label: tk.displayName }))}
            />
          )}
        </FormField>
        {pump !== null && (
          <FormField label={t("form.status")}>
            {() => (
              <SearchableSelect
                aria-label={t("form.status")}
                value={active ? "active" : "inactive"}
                onValueChange={(value) => setActive(value === "active")}
                options={[
                  { value: "active", label: t("form.statusActive") },
                  { value: "inactive", label: t("form.statusInactive") },
                ]}
              />
            )}
          </FormField>
        )}
      </form>
    </Modal>
  );
}
