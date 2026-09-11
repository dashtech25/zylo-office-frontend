"use client";

import { Camera, Check, Mail, UserX } from "lucide-react";
import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { getRole, type UserRoleAssignment } from "@/core/api/rbac";
import { listAuditLogs } from "@/core/api/audit";
import { deactivateStationStaff, updateStationStaff, type StationStaff } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, FormField, Input, Modal } from "@/shared/ui";
import { PartStateBox, usePartData } from "../station-detail/PartState";
import { domainsGrantedByPermissions, STAFF_PERMISSION_DOMAINS } from "./staffPermissionDomains";

/** Mockup emalioration/personnel/modal detail personnel.png — fiche membre
 * complète : infos personnelles/poste, résumé des accès par domaine
 * (calculé côté frontend depuis les permissions du rôle, jamais un second
 * endroit où stocker un doublon de la vérité RBAC), activité récente
 * (journal d'audit filtré par auteur), désactivation d'accès. */
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
  const load = useCallback(async () => {
    const [role, activityPage] = await Promise.all([
      roleAssignment ? getRole(organizationId, roleAssignment.id) : Promise.resolve(null),
      listAuditLogs(organizationId, { actorUserId: staff.userId, limit: 10 }),
    ]);
    return { role, activity: activityPage.data };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, staff.userId, roleAssignment?.id, reloadKey]);
  const state = usePartData(
    ["zylo-liquid", "station-admin", "staff-member-detail", organizationId, staff.userId, roleAssignment?.id, reloadKey],
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
    <Modal open={open} onOpenChange={onOpenChange} title={t("title")} size="lg" closeLabel={tCommon("actions.close")}>
      <div className="flex flex-col gap-5">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-surface-muted">
            {staff.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={staff.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <Camera className="size-6 text-text-muted" aria-hidden />
            )}
          </div>
          <div>
            <h3 className="text-h4 font-semibold text-text">{staff.fullName}</h3>
            {roleAssignment && <Badge tone="primary" className="mt-1">{roleAssignment.name}</Badge>}
            <p className="mt-1 flex items-center gap-1.5 text-body-sm text-text-muted">
              <span className={staff.status === "active" ? "size-1.5 rounded-full bg-success" : "size-1.5 rounded-full bg-text-muted"} />
              {t(`status.${staff.status}`)}
              <Mail className="ml-2 size-3.5" aria-hidden />
              {staff.email}
            </p>
          </div>
        </div>

        {editing ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t("firstName")}>{(field) => <Input {...field} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}</FormField>
            <FormField label={t("lastName")}>{(field) => <Input {...field} value={lastName} onChange={(e) => setLastName(e.target.value)} />}</FormField>
            <FormField label={t("phone")}>{(field) => <Input {...field} value={phone} onChange={(e) => setPhone(e.target.value)} />}</FormField>
            <FormField label={t("employeeNumber")}>{(field) => <Input {...field} value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />}</FormField>
            <FormField label={t("contractType")}>{(field) => <Input {...field} value={contractType} onChange={(e) => setContractType(e.target.value)} />}</FormField>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-body-sm font-semibold text-text">{t("personalInfoTitle")}</h4>
              <dl className="flex flex-col gap-1.5 text-body-sm">
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("firstName")}</dt><dd className="text-text">{staff.firstName ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("lastName")}</dt><dd className="text-text">{staff.lastName ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("phone")}</dt><dd className="text-text">{staff.phone ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("assignedAt")}</dt><dd className="text-text">{format.dateTime(new Date(staff.assignedAt), { day: "2-digit", month: "2-digit", year: "numeric" })}</dd></div>
              </dl>
            </div>
            <div>
              <h4 className="mb-2 text-body-sm font-semibold text-text">{t("jobInfoTitle")}</h4>
              <dl className="flex flex-col gap-1.5 text-body-sm">
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t("role")}</dt><dd className="text-text">{roleAssignment?.name ?? "—"}</dd></div>
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
              <div>
                <h4 className="mb-2 text-body-sm font-semibold text-text">{t("accessTitle")}</h4>
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
              </div>

              <div>
                <h4 className="mb-2 text-body-sm font-semibold text-text">{t("activityTitle")}</h4>
                {state.data.activity.length === 0 ? (
                  <p className="text-body-sm text-text-muted">{t("noActivity")}</p>
                ) : (
                  <ul className="flex flex-col gap-2 border-l border-border-subtle pl-3">
                    {state.data.activity.map((entry) => (
                      <li key={entry.id} className="text-body-sm text-text">
                        <span className="tabular-nums text-text-muted">{format.dateTime(new Date(entry.createdAt), { day: "2-digit", month: "2-digit", year: "numeric" })}</span> — {entry.summary}
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
