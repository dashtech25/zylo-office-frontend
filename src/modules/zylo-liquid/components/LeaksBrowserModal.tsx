"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft, Droplet } from "lucide-react";

import { LeakDetailContent } from "@/modules/zylo-liquid/screens/leaks/LeakDetailContent";
import { useLeakEventsList, type LeakEventRow } from "@/modules/zylo-liquid/screens/leaks/useLeakEventsList";
import { Badge, Button, EmptyState, Modal, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

/** Modale maître/détail des tests de fuite d'une station OU d'une cuve —
 * ouverte depuis `StationDetailScreen` et `TankDetailScreen`. Réutilise
 * `useLeakEventsList` (déjà utilisé par la page globale `/zylo-liquid/fuites`)
 * et `LeakDetailContent` (nouveau, aucune duplication avec une page de
 * détail existante puisqu'aucune n'existait). Remplace la redirection vers
 * `/zylo-liquid/fuites`. */
export function LeaksBrowserModal({
  organizationId,
  open,
  onOpenChange,
  title,
  stationId,
  tankId,
  initialLeakId,
}: {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  stationId?: string;
  tankId?: string;
  initialLeakId?: string | null;
}) {
  const t = useTranslations("zyloLiquid.leaks");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [selectedId, setSelectedId] = useState<string | null>(initialLeakId ?? null);
  const data = useLeakEventsList(organizationId, stationId, tankId);

  // La modale reste montée en permanence — sans cet effet, cliquer sur une
  // 2e fuite différente depuis la station/cuve ne changerait jamais la
  // sélection (`useState` ne se ré-initialise qu'au montage).
  useEffect(() => {
    if (open) setSelectedId(initialLeakId ?? null);
  }, [open, initialLeakId]);

  const selected: LeakEventRow | null = selectedId ? data.rows.find((row) => row.leak.id === selectedId) ?? null : null;

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedId(null);
    onOpenChange(next);
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} size="full" closeLabel={tCommon("actions.close")} title={selected ? formatDateTime(selected.leak.endTime) : title}>
      {selected ? (
        <Stack>
          <Button variant="link" size="inline" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="size-4" aria-hidden />
            {tCommon("actions.back")}
          </Button>
          <LeakDetailContent row={selected} />
        </Stack>
      ) : data.loading ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.date")}</TableHeaderCell>
              <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.rate")}</TableHeaderCell>
              <TableHeaderCell>{t("table.result")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={4} />
            ))}
          </TableBody>
        </Table>
      ) : data.rows.length === 0 ? (
        <EmptyState icon={Droplet} title={t("empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.date")}</TableHeaderCell>
              <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.rate")}</TableHeaderCell>
              <TableHeaderCell>{t("table.result")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.leak.id} clickable onClick={() => setSelectedId(row.leak.id)}>
                <TableCell className="font-mono tabular-nums">{formatDateTime(row.leak.endTime)}</TableCell>
                <TableCell>
                  {row.tank?.displayName ?? "—"} · {row.fuelProduct?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{row.leak.leakRateLph === null ? "—" : `${format.number(row.leak.leakRateLph, { maximumFractionDigits: 2 })} L/h`}</TableCell>
                <TableCell>
                  <Badge tone={row.leak.result === "anomaly" ? "error" : "success"} dot>
                    {t(`result.${row.leak.result}`)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Modal>
  );
}
