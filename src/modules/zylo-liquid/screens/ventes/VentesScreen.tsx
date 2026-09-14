"use client";

import { Plus, Receipt } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, PageHeader, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

import { useVentes } from "./useVentes";

const PAYMENT_METHODS = ["cash", "card", "fleet", "credit"] as const;

/** Journal des ventes (processus-double-sources-verite, Phase 5 §5) —
 * qualifie une distribution déjà constatée (télémétrie ou déclaration),
 * jamais un fait nouveau indépendant. Une vente à crédit ouvre
 * automatiquement une créance côté serveur (voir écran Clients à crédit). */
export default function VentesScreen() {
  const t = useTranslations("zyloLiquid.ventesScreen");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useVentes(currentOrganization?.id ?? null);

  const [stationId, setStationId] = useState("");
  const [fuelProductId, setFuelProductId] = useState("");
  const [eventAt, setEventAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [quantityLiters, setQuantityLiters] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("cash");
  const [commercialAccountId, setCommercialAccountId] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreate() {
    if (!stationId || !fuelProductId || !quantityLiters || !priceAmount || !currencyId || (paymentMethod === "credit" && !commercialAccountId)) {
      setFormError(t("form.required"));
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await data.create({
        stationId,
        fuelProductId,
        eventAt: new Date(eventAt).toISOString(),
        quantityLiters: Number(quantityLiters),
        priceAmount: Number(priceAmount),
        currencyId,
        paymentMethod,
        commercialAccountId: paymentMethod === "credit" ? commercialAccountId : undefined,
      });
      setQuantityLiters("");
      setPriceAmount("");
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
          <FormField label={t("form.station")}>
            {() => <Select aria-label={t("form.station")} value={stationId || undefined} onValueChange={setStationId} placeholder={t("form.selectStation")} options={data.stations.map((s) => ({ value: s.id, label: s.name }))} />}
          </FormField>
          <FormField label={t("form.product")}>
            {() => <Select aria-label={t("form.product")} value={fuelProductId || undefined} onValueChange={setFuelProductId} placeholder={t("form.selectProduct")} options={data.fuelProducts.map((p) => ({ value: p.id, label: p.name }))} />}
          </FormField>
          <FormField label={t("form.eventAt")}>
            {(field) => <Input {...field} type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} />}
          </FormField>
          <FormField label={t("form.quantity")}>
            {(field) => <Input {...field} type="number" step="1" value={quantityLiters} onChange={(e) => setQuantityLiters(e.target.value)} />}
          </FormField>
          <FormField label={t("form.price")}>
            {(field) => <Input {...field} type="number" step="1" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />}
          </FormField>
          <FormField label={t("form.currency")}>
            {() => <Select aria-label={t("form.currency")} value={currencyId || undefined} onValueChange={setCurrencyId} placeholder="—" options={data.currencies.map((c) => ({ value: c.id, label: c.code }))} />}
          </FormField>
          <FormField label={t("form.paymentMethod")}>
            {() => (
              <Select
                aria-label={t("form.paymentMethod")}
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as (typeof PAYMENT_METHODS)[number])}
                options={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`paymentMethod.${m}`) }))}
              />
            )}
          </FormField>
          {paymentMethod === "credit" && (
            <FormField label={t("form.commercialAccount")}>
              {() => (
                <Select
                  aria-label={t("form.commercialAccount")}
                  value={commercialAccountId || undefined}
                  onValueChange={setCommercialAccountId}
                  placeholder={t("form.selectAccount")}
                  options={data.commercialAccounts.map((a) => ({ value: a.id, label: a.name }))}
                />
              )}
            </FormField>
          )}
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
              <TableHeaderCell>{t("table.station")}</TableHeaderCell>
              <TableHeaderCell>{t("table.product")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.quantity")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.amount")}</TableHeaderCell>
              <TableHeaderCell>{t("table.paymentMethod")}</TableHeaderCell>
              <TableHeaderCell>{t("table.date")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={6} />
            ))}
          </TableBody>
        </Table>
      ) : data.sales.length === 0 ? (
        <EmptyState icon={Receipt} title={t("empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.station")}</TableHeaderCell>
              <TableHeaderCell>{t("table.product")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.quantity")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.amount")}</TableHeaderCell>
              <TableHeaderCell>{t("table.paymentMethod")}</TableHeaderCell>
              <TableHeaderCell>{t("table.date")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.sales.map((s) => {
              const station = data.stations.find((st) => st.id === s.stationId);
              const product = data.fuelProducts.find((p) => p.id === s.fuelProductId);
              const currency = data.currencies.find((c) => c.id === s.currencyId);
              return (
                <TableRow key={s.id}>
                  <TableCell>{station?.name ?? "—"}</TableCell>
                  <TableCell>{product?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{s.quantityLiters} L</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {(s.quantityLiters * s.priceAmount).toFixed(2)} {currency?.code ?? ""}
                  </TableCell>
                  <TableCell>
                    <Badge tone={s.paymentMethod === "credit" ? "warning" : "neutral"}>{t(`paymentMethod.${s.paymentMethod}`)}</Badge>
                  </TableCell>
                  <TableCell>{format.dateTime(new Date(s.eventAt), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
