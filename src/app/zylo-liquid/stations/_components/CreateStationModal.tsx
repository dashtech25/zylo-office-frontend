"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/core/api/client";
import { createStation, listCities, updateStation, type City, type Station } from "@/core/api/zyloLiquid";
import { Alert, Button, FormField, Input, Modal, Select } from "@/shared/ui";

export interface CreateStationModalProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  /** Présent = mode édition (PATCH), absent = mode création (POST). Le code
   * n'est jamais modifiable une fois la station créée (absent de
   * UpdateStationRequest côté backend) — champ masqué en édition. */
  station?: Station;
}

export function CreateStationModal({ organizationId, open, onOpenChange, onCreated, station }: CreateStationModalProps) {
  const t = useTranslations("zyloLiquid.stations");
  const tDetail = useTranslations("zyloLiquid.stationDetail");
  const tCommon = useTranslations("common");
  const isEdit = station !== undefined;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [cityId, setCityId] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && station) {
      setName(station.name);
      setCode(station.code);
      setCityId(station.cityId ?? "");
      setAddress(station.address ?? "");
      setPhone(station.phone ?? "");
      setEmail(station.email ?? "");
    }
  }, [open, station]);

  useEffect(() => {
    if (!open) return;
    listCities(organizationId, { limit: 100 })
      .then((page) => setCities(page.data))
      .catch(() => setCities([]));
  }, [open, organizationId]);

  function reset() {
    setName("");
    setCode("");
    setCityId("");
    setAddress("");
    setPhone("");
    setEmail("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && station) {
        await updateStation(organizationId, station.id, {
          name,
          cityId: cityId || undefined,
          address: address || undefined,
          phone: phone || undefined,
          email: email || undefined,
        });
      } else {
        await createStation(organizationId, {
          name,
          code,
          cityId: cityId || undefined,
          address: address || undefined,
          phone: phone || undefined,
          email: email || undefined,
        });
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

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={isEdit ? tDetail("editModal.title") : t("createModal.title")}
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" type="submit" form="create-station-form" loading={submitting}>
            {isEdit ? tCommon("actions.save") : t("createModal.submit")}
          </Button>
        </>
      }
    >
      <form id="create-station-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <FormField label={t("createModal.name")} required>
          {(field) => <Input {...field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />}
        </FormField>
        {!isEdit && (
          <FormField label={t("createModal.code")} required hint={t("createModal.codeHint")}>
            {(field) => <Input {...field} value={code} onChange={(e) => setCode(e.target.value)} required maxLength={20} />}
          </FormField>
        )}
        <FormField label={t("createModal.city")}>
          {(field) => (
            <Select
              {...field}
              value={cityId}
              onValueChange={setCityId}
              options={[{ value: "", label: t("createModal.citySelectPlaceholder") }, ...cities.map((c) => ({ value: c.id, label: `${c.name} (${c.regionName}, ${c.countryName})` }))]}
            />
          )}
        </FormField>
        <FormField label={t("createModal.address")}>
          {(field) => <Input {...field} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />}
        </FormField>
        <FormField label={t("createModal.phone")}>
          {(field) => <Input {...field} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />}
        </FormField>
        <FormField label={t("createModal.email")}>
          {(field) => <Input {...field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />}
        </FormField>
      </form>
    </Modal>
  );
}
