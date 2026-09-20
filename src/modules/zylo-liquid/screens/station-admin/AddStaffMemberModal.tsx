"use client";

import { Camera, Check, Copy } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/core/api/client";
import { listRoles, type Role } from "@/core/api/rbac";
import { uploadFile } from "@/core/api/storage";
import { createStationStaff, type CreateStationStaffResult } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, FormField, Input, Modal, SearchableSelect } from "@/shared/ui";
import { usePartData } from "../station-detail/PartState";

/** Mockup emalioration/personnel/formulaire d'ajout de personnel.png —
 * création d'un compte réel (jamais juste une affectation de rôle à un
 * membre déjà existant) : la photo passe par le vrai service de stockage
 * Zylo Office, le mot de passe est généré côté serveur et affiché UNE SEULE
 * FOIS dans un écran de confirmation avant fermeture (aucune infrastructure
 * d'invitation par email — décision validée avec le commanditaire). */
export function AddStaffMemberModal({
  organizationId,
  stationId,
  open,
  onOpenChange,
  onCreated,
}: {
  organizationId: string;
  stationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.personnel.addModal");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRoles = useCallback(() => listRoles(organizationId), [organizationId]);
  const rolesState = usePartData(["zylo-liquid", "station-admin", "add-staff-roles", organizationId], loadRoles);

  const [photoStorageReference, setPhotoStorageReference] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateStationStaffResult | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setPhotoStorageReference(null);
    setPhotoPreviewUrl(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRoleId("");
    setEmployeeNumber("");
    setError(null);
    setResult(null);
    setCopied(false);
  }

  async function handlePhotoSelected(file: File) {
    setUploadingPhoto(true);
    setError(null);
    try {
      const uploaded = await uploadFile(organizationId, file);
      setPhotoStorageReference(uploaded.storageReference);
      setPhotoPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      setError(t("required"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createStationStaff(organizationId, {
        stationId, firstName, lastName, email,
        phone: phone || undefined,
        photoStorageReference: photoStorageReference || undefined,
        roleId: roleId || undefined,
        employeeNumber: employeeNumber || undefined,
      });
      setResult(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyPassword() {
    if (!result) return;
    navigator.clipboard.writeText(result.temporaryPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleClose() {
    const wasCreated = result !== null;
    reset();
    onOpenChange(false);
    if (wasCreated) onCreated();
  }

  const roles: Role[] = rolesState.status === "ready" ? rolesState.data : [];

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
      title={result ? t("successTitle") : t("title")}
      size="md"
      closeLabel={tCommon("actions.close")}
      preventOutsideClose
      footer={
        result ? (
          <Button size="sm" onClick={handleClose}>{tCommon("actions.close")}</Button>
        ) : (
          <>
            <Button variant="outline" size="sm" type="button" onClick={handleClose}>{tCommon("actions.cancel")}</Button>
            <Button size="sm" type="submit" form="add-staff-form" loading={submitting}>{t("submit")}</Button>
          </>
        )
      }
    >
      {result ? (
        <div className="flex flex-col gap-4">
          <Alert tone="warning">{t("passwordWarning")}</Alert>
          <div className="flex items-center justify-between gap-3 rounded-card border border-border-subtle bg-surface-muted px-4 py-3">
            <code className="text-body-md font-semibold tabular-nums text-text">{result.temporaryPassword}</code>
            <button type="button" onClick={handleCopyPassword} className="flex items-center gap-1.5 text-caption font-medium text-primary hover:underline">
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? tCommon("actions.copied") : tCommon("actions.copy")}
            </button>
          </div>
          <p className="text-body-sm text-text-muted">{t("successDescription", { name: result.staff.fullName, email: result.staff.email })}</p>
        </div>
      ) : (
        <form id="add-staff-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}

          <div>
            <p className="mb-2 text-body-sm font-medium text-text">{t("photo")}</p>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-dashed border-border bg-surface-muted"
              >
                {photoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreviewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Camera className="size-6 text-text-muted" aria-hidden />
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelected(f); }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-caption font-medium text-primary hover:underline">
                {uploadingPhoto ? tCommon("states.loading") : t("importPhoto")}
              </button>
            </div>
          </div>

          <p className="text-body-sm font-medium text-text">{t("personalInfoTitle")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t("firstName")}>{(field) => <Input {...field} required value={firstName} onChange={(e) => setFirstName(e.target.value)} />}</FormField>
            <FormField label={t("lastName")}>{(field) => <Input {...field} required value={lastName} onChange={(e) => setLastName(e.target.value)} />}</FormField>
            <FormField label={t("email")}>{(field) => <Input {...field} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</FormField>
            <FormField label={t("phone")}>{(field) => <Input {...field} value={phone} onChange={(e) => setPhone(e.target.value)} />}</FormField>
          </div>

          <p className="text-body-sm font-medium text-text">{t("jobInfoTitle")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t("role")}>
              {() => <SearchableSelect aria-label={t("role")} value={roleId || undefined} onValueChange={setRoleId} placeholder={t("selectRole")} options={roles.map((r) => ({ value: r.id, label: r.name }))} />}
            </FormField>
            <FormField label={t("employeeNumber")}>{(field) => <Input {...field} value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />}</FormField>
          </div>
        </form>
      )}
    </Modal>
  );
}
