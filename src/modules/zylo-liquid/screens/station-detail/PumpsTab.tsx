"use client";

import { Fuel } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";

import { listEquipment } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, Card, CardSectionHeader, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "./PartState";

const EQUIPMENT_STATUS_TONE = { in_service: "success", out_of_order: "error", out_of_service: "neutral" } as const;

/** Onglet « Pompes » (prototype) réalisé avec le modèle réel : Zylo Liquid
 * n'a pas d'entité « pompe » dédiée — les pompes sont des fiches
 * d'équipement de maintenance de type « pompe » (vocabulaire réel des
 * données, comme les sondes). Seul ce type est affiché, filtré sur la
 * valeur réelle, jamais sur une inférence de nom. Les pistolets et index
 * totalisateurs du prototype ne sont pas modélisés : l'écart est dit dans la
 * note, aucune valeur n'est inventée pour les combler. */
export function PumpsTab({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationDetail.pumpsTab");
  const tEq = useTranslations("zyloLiquid.maintenanceScreen.equipment");
  const format = useFormatter();

  const load = useCallback(async () => {
    const page = await listEquipment(organizationId, { stationId, limit: 100 });
    return page.data.filter((eq) => eq.type === "pompe");
  }, [organizationId, stationId]);
  const state = usePartData(["zylo-liquid", "station-detail", "pumps", organizationId, stationId], load);

  function formatDate(iso: string | null): string {
    return iso
      ? format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric" })
      : "—";
  }

  return (
    <PartStateBox state={state}>
      {(() => {
        const pumps = state.status === "ready" ? state.data : [];
        return (
          <Card>
            <CardSectionHeader title={t("title")} />
            <p className="-mt-3 mb-1 text-body-sm text-text-muted">{t("note")}</p>
            {pumps.length === 0 ? (
              <EmptyState icon={Fuel} title={tEq("empty")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{tEq("table.name")}</TableHeaderCell>
                    <TableHeaderCell>{t("columns.manufacturerModel")}</TableHeaderCell>
                    <TableHeaderCell>{t("columns.serialNumber")}</TableHeaderCell>
                    <TableHeaderCell>{t("columns.installedAt")}</TableHeaderCell>
                    <TableHeaderCell>{tEq("table.lastMaintenance")}</TableHeaderCell>
                    <TableHeaderCell>{tEq("table.status")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pumps.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-medium">{eq.name}</TableCell>
                      <TableCell>{[eq.manufacturer, eq.model].filter(Boolean).join(" · ") || "—"}</TableCell>
                      <TableCell className="tabular-nums text-text-muted">{eq.serialNumber ?? "—"}</TableCell>
                      <TableCell>{formatDate(eq.installedAt)}</TableCell>
                      <TableCell>{formatDate(eq.lastMaintenanceAt)}</TableCell>
                      <TableCell>
                        <Badge tone={EQUIPMENT_STATUS_TONE[eq.status]}>{tEq(`status.${eq.status}`)}</Badge>
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
