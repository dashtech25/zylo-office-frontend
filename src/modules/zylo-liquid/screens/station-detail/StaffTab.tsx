"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { listMembers } from "@/core/api/rbac";
import { Badge, Card, CardSectionHeader, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "./PartState";

/** Onglet « Personnel » (prototype) réalisé avec l'affectation RBAC réelle :
 * les membres listés sont ceux dont une affectation de rôle porte sur cette
 * station (`resourceType = station`, `resourceId = station`). Le nom
 * affiché d'un rôle est son `name` réel en base — jamais traduit ni
 * inventé. Les rôles de portée organisation (ex. Propriétaire) ne sont pas
 * des affectations de station et n'apparaissent donc pas ici. */
export function StaffTab({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationDetail.staffTab");

  const load = useCallback(async () => {
    const members = await listMembers(organizationId);
    return members
      .map((m) => ({ member: m, stationRoles: m.roles.filter((r) => r.resourceType === "station" && r.resourceId === stationId) }))
      .filter((entry) => entry.stationRoles.length > 0);
  }, [organizationId, stationId]);
  const state = usePartData(["zylo-liquid", "station-detail", "staff", organizationId, stationId], load);

  return (
    <PartStateBox state={state}>
      {(() => {
        const entries = state.status === "ready" ? state.data : [];
        return (
          <Card>
            <CardSectionHeader title={t("title")} />
            <p className="-mt-3 mb-1 text-body-sm text-text-muted">{t("note")}</p>
            {entries.length === 0 ? (
              <EmptyState icon={Users} title={t("empty")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("columns.member")}</TableHeaderCell>
                    <TableHeaderCell>{t("columns.roles")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map(({ member, stationRoles }) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <p className="font-medium text-text">{member.fullName}</p>
                        <p className="text-caption text-text-muted">{member.email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {stationRoles.map((role) => (
                            <Badge key={role.assignmentId} tone="neutral">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        );
      })()}
    </PartStateBox>
  );
}
