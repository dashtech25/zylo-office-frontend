"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Fuel, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { listPumps, listTanks, type Pump } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, Button, Card, CardSectionHeader, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "./PartState";
import { PumpFormModal } from "./PumpFormModal";

const PUMP_STATUS_TONE = { active: "success", inactive: "neutral" } as const;

/** Onglet « Pompes » — Zylo Liquid a désormais une véritable entité Pompe
 * (`listPumps`/`createPump`/`updatePump`, backend dédié) : ce tableau liste
 * les pompes réelles de la station, plus les fiches d'équipement de
 * maintenance de type « pompe » affichées auparavant faute d'entité dédiée.
 * Les cuves de la station sont chargées en parallèle uniquement pour
 * résoudre le nom de la cuve affectée à chaque pompe et pour alimenter le
 * sélecteur de cuve du formulaire (`PumpFormModal`). */
export function PumpsTab({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationDetail.pumpsTab");
  const queryClient = useQueryClient();

  const queryKey = ["zylo-liquid", "station-detail", "pumps", organizationId, stationId] as const;

  const load = useCallback(async () => {
    const [pumpsPage, tanksPage] = await Promise.all([
      listPumps(organizationId, { stationId, limit: 100 }),
      listTanks(organizationId, 100, stationId),
    ]);
    return { pumps: pumpsPage.data, tanks: tanksPage.data };
  }, [organizationId, stationId]);
  const state = usePartData(queryKey, load);

  const [modalPump, setModalPump] = useState<Pump | null | undefined>(undefined);

  function handleSaved() {
    setModalPump(undefined);
    void queryClient.invalidateQueries({ queryKey });
  }

  const pumps = state.status === "ready" ? state.data.pumps : [];
  const tanks = state.status === "ready" ? state.data.tanks : [];

  function tankLabel(tankId: string): string {
    const tank = tanks.find((tk) => tk.id === tankId);
    return tank ? tank.displayName : "—";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModalPump(null)}>
          <Plus className="size-4" aria-hidden />
          {t("addPump")}
        </Button>
      </div>

      <PartStateBox state={state}>
        <Card>
          <CardSectionHeader title={t("title")} />
          {pumps.length === 0 ? (
            <EmptyState icon={Fuel} title={t("empty")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("columns.name")}</TableHeaderCell>
                  <TableHeaderCell>{t("columns.tank")}</TableHeaderCell>
                  <TableHeaderCell>{t("columns.status")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pumps.map((pump) => (
                  <TableRow key={pump.id} clickable onClick={() => setModalPump(pump)}>
                    <TableCell className="font-medium">{pump.name}</TableCell>
                    <TableCell>{tankLabel(pump.tankId)}</TableCell>
                    <TableCell>
                      <Badge tone={PUMP_STATUS_TONE[pump.active ? "active" : "inactive"]}>
                        {t(pump.active ? "status.active" : "status.inactive")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </PartStateBox>

      <PumpFormModal
        organizationId={organizationId}
        stationId={stationId}
        tanks={tanks}
        pump={modalPump ?? null}
        open={modalPump !== undefined}
        onOpenChange={(open) => { if (!open) setModalPump(undefined); }}
        onSaved={handleSaved}
      />
    </div>
  );
}
