"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { CreateSupplierInput, Supplier, StationSupplier, SupplierCategory, UpdateStationSupplierInput } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, FormField, Input, Modal, Select, Tabs, Textarea } from "@/shared/ui";

const CATEGORIES: SupplierCategory[] = ["carburant", "equipement", "maintenance", "securite", "service", "autre"];

/** Création ou édition d'un fournisseur + de son rattachement à la station
 * (maquette Fournisseurs) — un seul formulaire à onglets couvrant à la
 * fois `Supplier` (référentiel réseau) et `StationSupplier` (contrat,
 * périmètre d'intervention propres à cette station), comme le fait la
 * maquette avec ses 3 onglets Informations générales/Contrat/Services &
 * Équipements. */
export function SupplierFormModal({
  open,
  onOpenChange,
  supplier,
  link,
  onCreate,
  onUpdateSupplier,
  onUpdateLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Présent = édition, absent = création. */
  supplier?: Supplier | null;
  link?: StationSupplier | null;
  onCreate: (
    supplierData: { name: string; type?: string; category?: SupplierCategory; contactName?: string; contactRole?: string; contactPhone?: string; contactEmail?: string; website?: string; address?: string },
    linkData: { notes?: string; contractReference?: string; contractType?: string; contractStartDate?: string; contractEndDate?: string; equipmentTags?: string }
  ) => Promise<unknown>;
  onUpdateSupplier: (supplierId: string, data: Partial<CreateSupplierInput> & { active?: boolean }) => Promise<void>;
  onUpdateLink: (linkId: string, data: UpdateStationSupplierInput) => Promise<void>;
}) {
  const t = useTranslations("zyloLiquid.stationDetail.suppliersTab.form");
  const tCommon = useTranslations("common");
  const isEdit = !!supplier && !!link;

  const [tab, setTab] = useState("general");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState<SupplierCategory | "">("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");

  const [contractReference, setContractReference] = useState("");
  const [contractType, setContractType] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [equipmentTags, setEquipmentTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const EQUIPMENT_OPTIONS = ["Cuves", "Pompes", "Distributeurs", "AdBlue", "Compresseurs", "Éclairage"];

  useEffect(() => {
    if (!open) return;
    setTab("general");
    setError(null);
    setName(supplier?.name ?? "");
    setType(supplier?.type ?? "");
    setCategory((supplier?.category as SupplierCategory) ?? "");
    setContactName(supplier?.contactName ?? "");
    setContactRole(supplier?.contactRole ?? "");
    setContactPhone(supplier?.contactPhone ?? "");
    setContactEmail(supplier?.contactEmail ?? "");
    setWebsite(supplier?.website ?? "");
    setAddress(supplier?.address ?? "");
    setContractReference(link?.contractReference ?? "");
    setContractType(link?.contractType ?? "");
    setContractStartDate(link?.contractStartDate ?? "");
    setContractEndDate(link?.contractEndDate ?? "");
    setEquipmentTags(link?.equipmentTags ? link.equipmentTags.split(",").map((s) => s.trim()).filter(Boolean) : []);
    setNotes(link?.notes ?? "");
  }, [open, supplier, link]);

  function toggleEquipment(tag: string) {
    setEquipmentTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supplierData = {
        name: name.trim(),
        type: type || undefined,
        category: (category as SupplierCategory) || undefined,
        contactName: contactName || undefined,
        contactRole: contactRole || undefined,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        website: website || undefined,
        address: address || undefined,
      };
      const linkData = {
        notes: notes || undefined,
        contractReference: contractReference || undefined,
        contractType: contractType || undefined,
        contractStartDate: contractStartDate || undefined,
        contractEndDate: contractEndDate || undefined,
        equipmentTags: equipmentTags.length > 0 ? equipmentTags.join(",") : undefined,
      };
      if (isEdit && supplier && link) {
        await onUpdateSupplier(supplier.id, supplierData);
        await onUpdateLink(link.id, linkData);
      } else {
        await onCreate(supplierData, linkData);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSaving(false);
    }
  }

  const generalTab = (
    <div className="flex flex-col gap-3 py-3">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label={t("name")} required>{(f) => <Input {...f} value={name} onChange={(e) => setName(e.target.value)} />}</FormField>
        <FormField label={t("type")}>{(f) => <Input {...f} value={type} onChange={(e) => setType(e.target.value)} placeholder={t("typePlaceholder")} />}</FormField>
        <FormField label={t("categoryLabel")}>
          {() => <Select aria-label={t("categoryLabel")} value={category || undefined} onValueChange={(v) => setCategory(v as SupplierCategory)} placeholder={t("selectCategory")} options={CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) }))} />}
        </FormField>
        <FormField label={t("status")}>
          {() => (
            <Select
              aria-label={t("status")}
              value={supplier ? String(supplier.active) : "true"}
              onValueChange={(v) => isEdit && supplier && onUpdateSupplier(supplier.id, { active: v === "true" })}
              options={[
                { value: "true", label: t("active") },
                { value: "false", label: t("inactive") },
              ]}
            />
          )}
        </FormField>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label={t("contactName")}>{(f) => <Input {...f} value={contactName} onChange={(e) => setContactName(e.target.value)} />}</FormField>
        <FormField label={t("contactRole")}>{(f) => <Input {...f} value={contactRole} onChange={(e) => setContactRole(e.target.value)} />}</FormField>
        <FormField label={t("contactPhone")}>{(f) => <Input {...f} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />}</FormField>
        <FormField label={t("contactEmail")}>{(f) => <Input {...f} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />}</FormField>
        <FormField label={t("website")}>{(f) => <Input {...f} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.fournisseur.cm" />}</FormField>
      </div>
      <FormField label={t("address")}>{(f) => <Textarea {...f} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />}</FormField>
    </div>
  );

  const contractTab = (
    <div className="flex flex-col gap-3 py-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label={t("contractReference")}>{(f) => <Input {...f} value={contractReference} onChange={(e) => setContractReference(e.target.value)} />}</FormField>
        <FormField label={t("contractType")}>{(f) => <Input {...f} value={contractType} onChange={(e) => setContractType(e.target.value)} placeholder={t("contractTypePlaceholder")} />}</FormField>
        <FormField label={t("contractStartDate")}>{(f) => <Input {...f} type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.target.value)} />}</FormField>
        <FormField label={t("contractEndDate")}>{(f) => <Input {...f} type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} />}</FormField>
      </div>
      <FormField label={t("notes")}>{(f) => <Textarea {...f} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />}</FormField>
    </div>
  );

  const equipmentTab = (
    <div className="py-3">
      <p className="mb-2 text-body-sm text-text-muted">{t("equipmentHint")}</p>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggleEquipment(opt)}
            className={`rounded-pill border px-3 py-1.5 text-body-sm transition-colors ${equipmentTags.includes(opt) ? "border-primary bg-primary-muted text-primary" : "border-border-subtle text-text-muted hover:bg-surface-muted"}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("editTitle") : t("createTitle")}
      closeLabel={tCommon("actions.close")}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" loading={saving} onClick={handleSubmit}>
            {tCommon("actions.save")}
          </Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "general", label: t("tabs.general"), content: generalTab },
          { value: "contract", label: t("tabs.contract"), content: contractTab },
          { value: "equipment", label: t("tabs.equipment"), content: equipmentTab },
        ]}
      />
    </Modal>
  );
}
