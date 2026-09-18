"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  createSale,
  listCommercialAccounts,
  listCurrencies,
  type CommercialAccount,
  type Currency,
  type Pump,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { Alert, Button, FormField, Input, Modal, Select } from "@/shared/ui";

const PAYMENT_METHODS = ["cash", "card", "fleet", "credit"] as const;

export interface SaleDeclarationModalProps {
  organizationId: string;
  stationId: string;
  pumps: Pump[];
  tanks: Tank[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Déclaration d'une vente pompe/shift — le flux opérationnel réel d'une
 * station (le pompiste relève l'index de la pompe en début et fin de shift,
 * remet la caisse au gérant, qui saisit les index ici). Le volume vendu se
 * déduit toujours de l'écart d'index, jamais saisi directement, pour éviter
 * un volume qui ne corresponde pas aux index déclarés. */
export function SaleDeclarationModal({ organizationId, stationId, pumps, tanks, open, onOpenChange, onSaved }: SaleDeclarationModalProps) {
  const t = useTranslations("zyloLiquid.stationDetail.sales");
  const tCommon = useTranslations("common");
  const tPaymentMethod = useTranslations("zyloLiquid.ventesScreen.paymentMethod");

  const [pumpId, setPumpId] = useState("");
  const [indexStart, setIndexStart] = useState("");
  const [indexEnd, setIndexEnd] = useState("");
  const [shiftEndDateTime, setShiftEndDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [priceAmount, setPriceAmount] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("cash");
  const [commercialAccountId, setCommercialAccountId] = useState("");

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [commercialAccounts, setCommercialAccounts] = useState<CommercialAccount[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Réinitialise l'état local à chaque (ré)ouverture pour éviter qu'une
  // saisie reste collée d'une déclaration à la suivante.
  useEffect(() => {
    if (!open) return;
    setPumpId("");
    setIndexStart("");
    setIndexEnd("");
    setShiftEndDateTime(new Date().toISOString().slice(0, 16));
    setPriceAmount("");
    setCurrencyId("");
    setPaymentMethod("cash");
    setCommercialAccountId("");
    setFormError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listCurrencies(organizationId, 100)
      .then((page) => setCurrencies(page.data))
      .catch(() => setCurrencies([]));
  }, [open, organizationId]);

  useEffect(() => {
    if (!open || paymentMethod !== "credit") return;
    listCommercialAccounts(organizationId, 100)
      .then((page) => setCommercialAccounts(page.data))
      .catch(() => setCommercialAccounts([]));
  }, [open, organizationId, paymentMethod]);

  function reset() {
    setPumpId("");
    setIndexStart("");
    setIndexEnd("");
    setShiftEndDateTime(new Date().toISOString().slice(0, 16));
    setPriceAmount("");
    setCurrencyId("");
    setPaymentMethod("cash");
    setCommercialAccountId("");
    setFormError(null);
  }

  const indexStartNum = Number(indexStart);
  const indexEndNum = Number(indexEnd);
  const hasValidIndexRange = indexStart !== "" && indexEnd !== "" && indexEndNum > indexStartNum;
  const volumeSold = hasValidIndexRange ? indexEndNum - indexStartNum : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!pumpId || !indexStart || !indexEnd || !shiftEndDateTime || !priceAmount || !currencyId || (paymentMethod === "credit" && !commercialAccountId)) {
      setFormError(t("form.required"));
      return;
    }
    if (indexEndNum <= indexStartNum) {
      setFormError(t("form.indexOrderError"));
      return;
    }

    const pump = pumps.find((p) => p.id === pumpId);
    const fuelProductId = pump ? tanks.find((tk) => tk.id === pump.tankId)?.fuelProductId : undefined;
    if (!fuelProductId) {
      setFormError(t("form.required"));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createSale(organizationId, {
        stationId,
        pumpId,
        fuelProductId,
        quantityLiters: indexEndNum - indexStartNum,
        priceAmount: Number(priceAmount),
        currencyId,
        paymentMethod,
        eventAt: new Date(shiftEndDateTime).toISOString(),
        commercialAccountId: paymentMethod === "credit" ? commercialAccountId : undefined,
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t("declareTitle")}
      size="md"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" type="submit" form="sale-declaration-form" loading={submitting}>
            {t("form.submit")}
          </Button>
        </>
      }
    >
      <form id="sale-declaration-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <FormField label={t("form.pump")} required>
          {() => (
            <Select
              aria-label={t("form.pump")}
              value={pumpId || undefined}
              onValueChange={setPumpId}
              placeholder={t("form.selectPump")}
              options={pumps.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name }))}
            />
          )}
        </FormField>
        <FormField label={t("form.indexStart")} required>
          {(field) => <Input {...field} type="number" value={indexStart} onChange={(e) => setIndexStart(e.target.value)} />}
        </FormField>
        <FormField label={t("form.indexEnd")} required>
          {(field) => <Input {...field} type="number" value={indexEnd} onChange={(e) => setIndexEnd(e.target.value)} />}
        </FormField>
        {volumeSold !== null && (
          <p className="text-sm text-text-muted">
            {t("form.volumeSold")}: <span className="font-mono tabular-nums text-text">{formatLiters(volumeSold)} L</span>
          </p>
        )}
        <FormField label={t("form.shiftEnd")} required>
          {(field) => <Input {...field} type="datetime-local" value={shiftEndDateTime} onChange={(e) => setShiftEndDateTime(e.target.value)} />}
        </FormField>
        <FormField label={t("form.price")} required>
          {(field) => <Input {...field} type="number" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />}
        </FormField>
        <FormField label={t("form.currency")} required>
          {() => (
            <Select
              aria-label={t("form.currency")}
              value={currencyId || undefined}
              onValueChange={setCurrencyId}
              placeholder="—"
              options={currencies.map((c) => ({ value: c.id, label: c.code }))}
            />
          )}
        </FormField>
        <FormField label={t("form.paymentMethod")} required>
          {() => (
            <Select
              aria-label={t("form.paymentMethod")}
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as (typeof PAYMENT_METHODS)[number])}
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: tPaymentMethod(m) }))}
            />
          )}
        </FormField>
        {paymentMethod === "credit" && (
          <FormField label={t("form.commercialAccount")} required>
            {() => (
              <Select
                aria-label={t("form.commercialAccount")}
                value={commercialAccountId || undefined}
                onValueChange={setCommercialAccountId}
                placeholder={t("form.selectAccount")}
                options={commercialAccounts.map((a) => ({ value: a.id, label: a.name }))}
              />
            )}
          </FormField>
        )}
      </form>
    </Modal>
  );
}
