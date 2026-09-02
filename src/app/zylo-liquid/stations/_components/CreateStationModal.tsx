"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/core/api/client";
import { createStation } from "@/core/api/zyloLiquid";
import { Alert, Button, FormField, Input, Modal } from "@/shared/ui";

export interface CreateStationModalProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateStationModal({ organizationId, open, onOpenChange, onCreated }: CreateStationModalProps) {
  const t = useTranslations("zyloLiquid.stations");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setCode("");
    setAddress("");
    setPhone("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createStation(organizationId, {
        name,
        code,
        address: address || undefined,
        phone: phone || undefined,
      });
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
      title={t("createModal.title")}
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" type="submit" form="create-station-form" loading={submitting}>
            {t("createModal.submit")}
          </Button>
        </>
      }
    >
      <form id="create-station-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <FormField label={t("createModal.name")} required>
          {(field) => <Input {...field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />}
        </FormField>
        <FormField label={t("createModal.code")} required hint={t("createModal.codeHint")}>
          {(field) => <Input {...field} value={code} onChange={(e) => setCode(e.target.value)} required maxLength={20} />}
        </FormField>
        <FormField label={t("createModal.address")}>
          {(field) => <Input {...field} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />}
        </FormField>
        <FormField label={t("createModal.phone")}>
          {(field) => <Input {...field} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />}
        </FormField>
      </form>
    </Modal>
  );
}
