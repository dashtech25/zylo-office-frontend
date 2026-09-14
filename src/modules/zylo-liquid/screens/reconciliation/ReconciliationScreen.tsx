"use client";

import { Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, PageHeader, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

import { useReconciliation } from "./useReconciliation";

const STATUS_TONE = { matched: "success", discrepancy: "error", pending: "neutral", insufficient_data: "warning" } as const;

/** Rapprochement ventes déclarées <-> stock télémétrique
 * (processus-double-sources-verite, Phase 6-8) — réutilise directement
 * `TankCashDailyAggregate` (déjà existant), aucun nouveau calcul
 * télémétrique. Calcul déclenché à la demande, jamais automatique. */
export default function ReconciliationScreen() {
  const t = useTranslations("zyloLiquid.reconciliationScreen");
  const tCommon = useTranslations("common");
  const { currentOrganization } = useOrganization();
  const data = useReconciliation(currentOrganization?.id ?? null);

  const [tankId, setTankId] = useState("");
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleReconcile() {
    if (!tankId || !day) {
      setFormError(t("form.required"));
      return;
    }
    setRunning(true);
    setFormError(null);
    try {
      await data.reconcile(tankId, day);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />
      <Alert tone="info">{t("banner")}</Alert>
      {formError && <Alert tone="error">{formError}</Alert>}
      {data.error && <Alert tone="error">{data.error}</Alert>}

      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("form.title")}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("form.tank")}>
            {() => <Select aria-label={t("form.tank")} value={tankId || undefined} onValueChange={setTankId} placeholder={t("form.selectTank")} options={data.tanks.map((tk) => ({ value: tk.id, label: tk.displayName }))} />}
          </FormField>
          <FormField label={t("form.day")}>{(field) => <Input {...field} type="date" value={day} onChange={(e) => setDay(e.target.value)} />}</FormField>
        </div>
        <Button className="mt-4" onClick={handleReconcile} loading={running}>
          <Scale className="size-4" aria-hidden />
          {t("form.submit")}
        </Button>
      </Card>

      {data.loading ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
              <TableHeaderCell>{t("table.day")}</TableHeaderCell>
              <TableHeaderCell>{t("table.status")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.discrepancy")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={4} />
            ))}
          </TableBody>
        </Table>
      ) : data.records.length === 0 ? (
        <EmptyState icon={Scale} title={t("empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
              <TableHeaderCell>{t("table.day")}</TableHeaderCell>
              <TableHeaderCell>{t("table.status")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.discrepancy")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.records.map((r) => {
              const [recordTankId, recordDay] = (r.counterpartId ?? "").split(":");
              const tank = data.tanks.find((tk) => tk.id === recordTankId);
              return (
                <TableRow key={r.id}>
                  <TableCell>{tank?.displayName ?? "—"}</TableCell>
                  <TableCell>{recordDay ?? "—"}</TableCell>
                  <TableCell>
                    <Badge tone={STATUS_TONE[r.status]}>{t(`status.${r.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.discrepancyValue !== null ? `${r.discrepancyValue.toFixed(2)} ${r.discrepancyUnit ?? ""}` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
