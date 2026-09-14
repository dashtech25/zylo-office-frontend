"use client";

import { Plus, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, PageHeader, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

import { useShifts } from "./useShifts";

/** Prise/fin de poste et caisse déclarées (processus-double-sources-verite,
 * Phase 5-8) — par cuve, rapprochée avec l'agrégat de caisse télémétrique
 * déjà existant (écran Caisse), jamais un nouveau calcul. */
export default function ShiftsScreen() {
  const t = useTranslations("zyloLiquid.shiftsScreen");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useShifts(currentOrganization?.id ?? null);

  const [tankId, setTankId] = useState("");
  const [shiftStart, setShiftStart] = useState(() => new Date().toISOString().slice(0, 16));
  const [shiftEnd, setShiftEnd] = useState(() => new Date().toISOString().slice(0, 16));
  const [declaredCashAmount, setDeclaredCashAmount] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreate() {
    const tank = data.tanks.find((tk) => tk.id === tankId);
    if (!tank || !declaredCashAmount || !currencyId) {
      setFormError(t("form.required"));
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await data.create({
        stationId: tank.stationId,
        tankId,
        eventAt: new Date(shiftEnd).toISOString(),
        shiftStart: new Date(shiftStart).toISOString(),
        shiftEnd: new Date(shiftEnd).toISOString(),
        declaredCashAmount: Number(declaredCashAmount),
        currencyId,
      });
      setDeclaredCashAmount("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreating(false);
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
          <FormField label={t("form.shiftStart")}>
            {(field) => <Input {...field} type="datetime-local" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />}
          </FormField>
          <FormField label={t("form.shiftEnd")}>
            {(field) => <Input {...field} type="datetime-local" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} />}
          </FormField>
          <FormField label={t("form.cashAmount")}>
            {(field) => <Input {...field} type="number" step="1" value={declaredCashAmount} onChange={(e) => setDeclaredCashAmount(e.target.value)} />}
          </FormField>
          <FormField label={t("form.currency")}>
            {() => <Select aria-label={t("form.currency")} value={currencyId || undefined} onValueChange={setCurrencyId} placeholder="—" options={data.currencies.map((c) => ({ value: c.id, label: c.code }))} />}
          </FormField>
        </div>
        <Button className="mt-4" onClick={handleCreate} loading={creating}>
          <Plus className="size-4" aria-hidden />
          {t("form.submit")}
        </Button>
      </Card>

      {data.loading ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
              <TableHeaderCell>{t("table.period")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.cashAmount")}</TableHeaderCell>
              <TableHeaderCell>{t("table.status")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={4} />
            ))}
          </TableBody>
        </Table>
      ) : data.declarations.length === 0 ? (
        <EmptyState icon={Users} title={t("empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
              <TableHeaderCell>{t("table.period")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.cashAmount")}</TableHeaderCell>
              <TableHeaderCell>{t("table.status")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.declarations.map((d) => {
              const tank = data.tanks.find((tk) => tk.id === d.tankId);
              const currency = data.currencies.find((c) => c.id === d.currencyId);
              return (
                <TableRow key={d.id}>
                  <TableCell>{tank?.displayName ?? "—"}</TableCell>
                  <TableCell>
                    {format.dateTime(new Date(d.shiftStart), { hour: "2-digit", minute: "2-digit" })} – {format.dateTime(new Date(d.shiftEnd), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {d.declaredCashAmount} {currency?.code ?? ""}
                  </TableCell>
                  <TableCell>
                    <Badge tone={d.lifecycleStatus === "locked" ? "neutral" : "info"}>{t(`status.${d.lifecycleStatus}`)}</Badge>
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
