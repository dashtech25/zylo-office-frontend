"use client";

import { Camera, Check, Copy, Mail, UserX } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { uploadFile } from "@/core/api/storage";
import { formatFreshness } from "@/shared/lib/formatDateTime";
import { getRole, listRoles, type Role, type UserRoleAssignment } from "@/core/api/rbac";
import { listAuditLogs } from "@/core/api/audit";
import {
  changeStationStaffRole,
  deactivateStationStaff,
  resetStationStaffPassword,
  updateStationStaff,
  updateUserProfile,
  type StationStaff,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, FormField, Input, Modal, SearchableSelect } from "@/shared/ui";
import { PartStateBox, usePartData } from "../station-detail/PartState";
import { domainsGrantedByPermissions, STAFF_PERMISSION_DOMAINS } from "./staffPermissionDomains";

/** Mockup emalioration/personnel/modal detail personnel.png — fiche membre
 * complète : infos personnelles/poste, gestion des droits (rôle + résumé
 * des accès par domaine, calculé côté frontend depuis les permissions du
 * rôle — jamais un second endroit où stocker un doublon de la vérité RBAC),
 * réinitialisation de mot de passe, activité récente (journal d'audit
 * filtré par auteur), désactivation d'accès.
 *
 * Gestion des droits (2026-09-16) : le rôle est modifiable directement
 * depuis cette fiche — `changeStationStaffRole`/`resetStationStaffPassword`
 * contournent volontairement les endpoints RBAC génériques (réservés au
 * propriétaire d'organisation) en passant par des routes du module Zylo
 * Liquid scopées à la station (`STATION_STAFF_MANAGE`), avec la même
 * protection anti-escalade de privilèges qu'à la création d'un membre du
 * personnel — jamais une case à cocher décorative comme avant. */
export function StaffMemberDetailModal({
  organizationId,
  staff,
  roleAssignment,
  stationName,
  open,
  onOpenChange,
  onChanged,
}: {
  organizationId: string;
  staff: StationStaff;
  roleAssignment: UserRoleAssignment | undefined;
  stationName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.personnel.detailModal");
  const tDomains = useTranslations("zyloLiquid.stationAdmin.personnel.domains");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const [reloadKey, setReloadKey] = useState(0);
  // Id du rôle actuellement affiché — initialisé depuis la prop, mais mis à
  // jour localement après un changement réussi (la prop `roleAssignment` du
  // parent peut rester périmée tant que la fiche reste ouverte).
  const [displayedRoleId, setDisplayedRoleId] = useState(roleAssignment?.id ?? null);

  const load = useCallback(async () => {
    const [role, roles, activityPage] = await Promise.all([
      displayedRoleId ? getRole(organizationId, displayedRoleId) : Promise.resolve(null),
      listRoles(organizationId),
      listAuditLogs(organizationId, { actorUserId: staff.userId, limit: 10 }),
    ]);
    return { role, roles, activity: activityPage.data };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, staff.userId, displayedRoleId, reloadKey]);
  const state = usePartData(
    ["zylo-liquid", "station-admin", "staff-member-detail", organizationId, staff.userId, displayedRoleId, reloadKey],
    load
  );

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(staff.firstName ?? "");
  const [lastName, setLastName] = useState(staff.lastName ?? "");
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [employeeNumber, setEmployeeNumber] = useState(staff.employeeNumber ?? "");
  const [contractType, setContractType] = useState(staff.contractType ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Changement de rôle.
  const [roleEditing, setRoleEditing] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);

  // Réinitialisation de mot de passe — confirmation à deux temps, puis
  // affichage du mot de passe temporaire une seule fois (même UI que la
  // création d'un membre du personnel, `AddStaffMemberModal`).
  const [resetConfirming, setResetConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Changement de photo — même mécanisme d'upload que `AddStaffMemberModal`
  // (service de stockage générique, jamais réinventé), mais applicable à un
  // membre déjà créé via `updateUserProfile` (PATCH /users/{id}).
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handlePhotoSelected(file: File) {
    setUploadingPhoto(true);
    setError(null);
    try {
      const uploaded = await uploadFile(organizationId, file);
      await updateUserProfile(organizationId, staff.userId, { photoStorageReference: uploaded.storageReference });
      setPhotoPreviewUrl(URL.createObjectURL(file));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateStationStaff(organizationId, staff.userId, { firstName, lastName, phone: phone || undefined, employeeNumber: employeeNumber || undefined, contractType: contractType || undefined });
      setEditing(false);
      onChanged();
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeRole() {
    if (!pendingRoleId) return;
    setRoleSaving(true);
    setError(null);
    try {
      await changeStationStaffRole(organizationId, staff.userId, pendingRoleId);
      setDisplayedRoleId(pendingRoleId);
      setRoleEditing(false);
      onChanged();
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setRoleSaving(false);
    }
  }

  async function handleResetPassword() {
    setResetting(true);
    setError(null);
    try {
      const result = await resetStationStaffPassword(organizationId, staff.userId);
      setNewPassword(result.temporaryPassword);
      setResetConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setResetting(false);
    }
  }

  function handleCopyPassword() {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleDeactivate() {
    setDeactivating(true);
    setError(null);
    try {
      await deactivateStationStaff(organizationId, staff.userId);
      onChanged();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("title")} size="xl" closeLabel={tCommon("actions.close")}>
      <div className="flex flex-col gap-6">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex items-center gap-5 rounded-card border border-border-subtle bg-surface-muted/40 p-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-surface-muted">
              {photoPreviewUrl || staff.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreviewUrl ?? staff.photoUrl ?? undefined} alt="" className="size-full object-cover" />
              ) : (
                <Camera className="size-8 text-text-muted" aria-hidden />
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handlePhotoSelected(f);
              }}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="text-caption font-medium text-primary hover:underline"
            >
              {uploadingPhoto ? tCommon("states.loading") : t("changePhoto")}
            </button>
          </div>
          <div>
            <h3 className="text-h3 font-semibold text-text">{staff.fullName}</h3>
            {state.status === "ready" && state.data.role && <Badge tone="primary" className="mt-1.5">{state.data.role.name}</Badge>}
            <p className="mt-2 flex items-center gap-1.5 text-body-md text-text-muted">
              <span className={staff.status === "active" ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-text-muted"} />
              {t(`status.${staff.status}`)}
              <Mail className="ml-2 size-4" aria-hidden />
              {staff.email}
            </p>
          </div>
        </div>

        {editing ? (
          <div className="grid grid-cols-1 gap-4 rounded-card border border-border-subtle p-4 sm:grid-cols-2">
            <FormField label={t("firstName")}>{(field) => <Input {...field} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}</FormField>
            <FormField label={t("lastName")}>{(field) => <Input {...field} value={lastName} onChange={(e) => setLastName(e.target.value)} />}</FormField>
            <FormField label={t("phone")}>{(field) => <Input {...field} value={phone} onChange={(e) => setPhone(e.target.value)} />}</FormField>
            <FormField label={t("employeeNumber")}>{(field) => <Input {...field} value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />}</FormField>
            <FormField label={t("contractType")}>{(field) => <Input {...field} value={contractType} onChange={(e) => setContractType(e.target.value)} />}</FormField>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-border-subtle p-4">
              <h4 className="mb-3 text-body-md font-semibold text-text">{t("personalInfoTitle")}</h4>
              <dl className="flex flex-col gap-2.5 text-body-sm">
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("firstName")}</dt><dd className="text-text">{staff.firstName ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("lastName")}</dt><dd className="text-text">{staff.lastName ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("phone")}</dt><dd className="text-text">{staff.phone ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("assignedAt")}</dt><dd className="text-text">{format.dateTime(new Date(staff.assignedAt), { day: "2-digit", month: "2-digit", year: "numeric" })}</dd></div>
              </dl>
            </div>
            <div className="rounded-card border border-border-subtle p-4">
              <h4 className="mb-3 text-body-md font-semibold text-text">{t("jobInfoTitle")}</h4>
              <dl className="flex flex-col gap-2.5 text-body-sm">
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("employeeNumber")}</dt><dd className="text-text">{staff.employeeNumber ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("assignedStation")}</dt><dd className="text-text">{stationName ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("contractType")}</dt><dd className="text-text">{staff.contractType ?? "—"}</dd></div>
              </dl>
            </div>
          </div>
        )}

        <PartStateBox state={state}>
          {state.status === "ready" && (
            <>
              <div className="rounded-card border border-border-subtle p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-body-md font-semibold text-text">{t("accessTitle")}</h4>
                  {!roleEditing && (
                    <button
                      type="button"
                      className="text-caption font-medium text-primary hover:underline"
                      onClick={() => { setPendingRoleId(displayedRoleId ?? ""); setRoleEditing(true); }}
                    >
                      {t("changeRole")}
                    </button>
                  )}
                </div>

                {roleEditing ? (
                  <div className="flex flex-col gap-2 rounded-card border border-border-subtle p-3">
                    <FormField label={t("role")}>
                      {() => (
                        <SearchableSelect
                          aria-label={t("role")}
                          value={pendingRoleId || undefined}
                          onValueChange={setPendingRoleId}
                          placeholder={t("selectRole")}
                          options={state.data.roles.map((r: Role) => ({ value: r.id, label: r.name }))}
                        />
                      )}
                    </FormField>
                    <Alert tone="warning">{t("changeRoleWarning")}</Alert>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setRoleEditing(false)}>{tCommon("actions.cancel")}</Button>
                      <Button size="sm" loading={roleSaving} disabled={!pendingRoleId || pendingRoleId === displayedRoleId} onClick={handleChangeRole}>
                        {t("confirmChangeRole")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(() => {
                      const granted = state.data.role ? domainsGrantedByPermissions(state.data.role.permissionCodes) : new Set<string>();
                      return STAFF_PERMISSION_DOMAINS.map((domain) => (
                        <div key={domain} className="flex items-center gap-1.5 rounded-card border border-border-subtle px-2.5 py-1.5">
                          {granted.has(domain) ? <Check className="size-3.5 shrink-0 text-success" aria-hidden /> : <span className="size-3.5 shrink-0" />}
                          <span className="text-caption text-text">{tDomains(domain)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <div className="rounded-card border border-border-subtle p-4">
                <h4 className="mb-3 text-body-md font-semibold text-text">{t("securityTitle")}</h4>
                {newPassword ? (
                  <div className="flex flex-col gap-2">
                    <Alert tone="warning">{t("passwordWarning")}</Alert>
                    <div className="flex items-center justify-between gap-3 rounded-card border border-border-subtle bg-surface-muted px-4 py-3">
                      <code className="text-body-md font-semibold tabular-nums text-text">{newPassword}</code>
                      <button type="button" onClick={handleCopyPassword} className="flex items-center gap-1.5 text-caption font-medium text-primary hover:underline">
                        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                        {copied ? tCommon("actions.copied") : tCommon("actions.copy")}
                      </button>
                    </div>
                  </div>
                ) : resetConfirming ? (
                  <div className="flex flex-col gap-2 rounded-card border border-border-subtle p-3">
                    <Alert tone="warning">{t("resetPasswordWarning")}</Alert>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setResetConfirming(false)}>{tCommon("actions.cancel")}</Button>
                      <Button size="sm" loading={resetting} onClick={handleResetPassword}>{t("confirmResetPassword")}</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setResetConfirming(true)}>{t("resetPassword")}</Button>
                )}
              </div>

              <div className="rounded-card border border-border-subtle p-4">
                <h4 className="mb-3 text-body-md font-semibold text-text">{t("activityTitle")}</h4>
                {state.data.activity.length === 0 ? (
                  <p className="text-body-sm text-text-muted">{t("noActivity")}</p>
                ) : (
                  <ul className="flex flex-col gap-2 border-l border-border-subtle pl-3">
                    {state.data.activity.map((entry) => (
                      <li key={entry.id} className="text-body-sm text-text">
                        <span className="tabular-nums text-text-muted">{formatFreshness(entry.createdAt, format)}</span> — {entry.summary}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </PartStateBox>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-4">
          <Button variant="outline" size="sm" loading={deactivating} disabled={staff.status !== "active"} onClick={handleDeactivate}>
            <UserX className="size-4" aria-hidden />
            {t("deactivate")}
          </Button>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>{tCommon("actions.cancel")}</Button>
                <Button size="sm" loading={saving} onClick={handleSave}>{tCommon("actions.save")}</Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{tCommon("actions.close")}</Button>
                <Button size="sm" onClick={() => setEditing(true)}>{tCommon("actions.edit")}</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
