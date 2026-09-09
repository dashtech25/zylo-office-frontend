"use client";

import { Plus, Trash2, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { listMembers, unassignRole, type UserRoleAssignment } from "@/core/api/rbac";
import { listStationStaff, type StationStaff } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, Button, Card, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";
import { AddStaffMemberModal } from "./AddStaffMemberModal";
import { StaffMemberDetailModal } from "./StaffMemberDetailModal";

/** Domaine « Personnel » du Centre administratif (mockup emalioration/
 * personnel/page de personnel vue par defaut.png) — table des membres
 * affectés à cette station, création d'un compte réel via `+ Nouveau`
 * (mot de passe temporaire, jamais une simple affectation de rôle à un
 * membre déjà existant), fiche détail au clic sur une ligne. */
export function PersonnelSection({ organizationId, stationId, stationName }: { organizationId: string; stationId: string; stationName: string }) {
  const t = useTranslations("zyloLiquid.stationAdmin.personnel");
  const [reloadKey, setReloadKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<{ staff: StationStaff; roleAssignment: UserRoleAssignment | undefined } | null>(null);

  const load = useCallback(async () => {
    const [staff, members] = await Promise.all([listStationStaff(organizationId, stationId), listMembers(organizationId)]);
    const rolesByUser = new Map(members.map((m) => [m.userId, m.roles.filter((r) => r.resourceType === "station" && r.resourceId === stationId)]));
    return { staff, rolesByUser };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, stationId, reloadKey]);
  const state = usePartData(load);

  async function handleUnassign(assignmentId: string) {
    await unassignRole(organizationId, assignmentId);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h4 font-semibold text-text">{t("pageTitle")}</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {t("newButton")}
        </Button>
      </div>

      <Card padding="none">
        <div className="border-b border-border-subtle px-5 py-4">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">{t("cardTitle")}</p>
        </div>
        <PartStateBox state={state}>
          {state.status === "ready" &&
            (state.data.staff.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={Users} title={t("empty")} />
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("table.member")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.roles")}</TableHeaderCell>
                    <TableHeaderCell></TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.data.staff.map((member) => {
                    const roles = state.data.rolesByUser.get(member.userId) ?? [];
                    return (
                      <TableRow key={member.id} className="cursor-pointer" onClick={() => setSelected({ staff: member, roleAssignment: roles[0] })}>
                        <TableCell>
                          <p className="font-medium text-text">{member.fullName}</p>
                          <p className="text-caption text-text-muted">{member.email}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {roles.map((role) => (
                              <Badge key={role.assignmentId} tone="neutral">{role.name}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {roles.map((role) => (
                              <button
                                key={role.assignmentId}
                                type="button"
                                aria-label={t("table.unassign", { role: role.name })}
                                onClick={(e) => { e.stopPropagation(); handleUnassign(role.assignmentId); }}
                              >
                                <Trash2 className="size-3.5 text-text-muted hover:text-error" aria-hidden />
                              </button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ))}
        </PartStateBox>
      </Card>

      <AddStaffMemberModal
        organizationId={organizationId}
        stationId={stationId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => setReloadKey((k) => k + 1)}
      />

      {selected && (
        <StaffMemberDetailModal
          organizationId={organizationId}
          staff={selected.staff}
          roleAssignment={selected.roleAssignment}
          stationName={stationName}
          open={selected !== null}
          onOpenChange={(open) => { if (!open) setSelected(null); }}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
