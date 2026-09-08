"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { getStationFinancial, updateStationFinancial, type StationFinancial } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, Card, CardSectionHeader, FormField, Input, Textarea } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

/** Domaine « Finances » du Centre administratif — sous-ressource dédiée
 * (jamais fusionnée dans `Station`/le formulaire Identité), gardée par
 * `STATION_FINANCIAL_READ`/`MANAGE` côté backend. `PartStateBox` affiche
 * automatiquement « non visible pour votre rôle » si l'utilisateur n'a pas
 * la permission — jamais une valeur masquée à moitié. */
export function FinancialSection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(
    () => getStationFinancial(organizationId, stationId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organizationId, stationId, reloadKey]
  );
  const state = usePartData(load);

  return (
    <PartStateBox state={state}>
      {state.status === "ready" && <FinancialForm organizationId={organizationId} stationId={stationId} financial={state.data} onSaved={() => setReloadKey((k) => k + 1)} />}
    </PartStateBox>
  );
}

function FinancialForm({
  organizationId,
  stationId,
  financial,
  onSaved,
}: {
  organizationId: string;
  stationId: string;
  financial: StationFinancial;
  onSaved: () => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.financial");
  const tCommon = useTranslations("common");

  const [taxId, setTaxId] = useState(financial.taxId ?? "");
  const [billingAddress, setBillingAddress] = useState(financial.billingAddress ?? "");
  const [costCenterCode, setCostCenterCode] = useState(financial.costCenterCode ?? "");
  const [bankAccountInfo, setBankAccountInfo] = useState(financial.bankAccountInfo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateStationFinancial(organizationId, stationId, {
        taxId: taxId || null,
        billingAddress: billingAddress || null,
        costCenterCode: costCenterCode || null,
        bankAccountInfo: bankAccountInfo || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardSectionHeader title={t("title")} action={<Button size="sm" loading={saving} onClick={handleSave}>{tCommon("actions.save")}</Button>} />
      {error && <Alert tone="error">{error}</Alert>}
      <p className="-mt-2 mb-3 text-body-sm text-text-muted">{t("hint")}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label={t("taxId")}>{(field) => <Input {...field} value={taxId} onChange={(e) => setTaxId(e.target.value)} maxLength={50} />}</FormField>
        <FormField label={t("costCenterCode")}>{(field) => <Input {...field} value={costCenterCode} onChange={(e) => setCostCenterCode(e.target.value)} maxLength={50} />}</FormField>
        <div className="sm:col-span-2">
          <FormField label={t("billingAddress")}>{(field) => <Textarea {...field} value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />}</FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label={t("bankAccountInfo")} hint={t("bankAccountInfoHint")}>
            {(field) => <Textarea {...field} value={bankAccountInfo} onChange={(e) => setBankAccountInfo(e.target.value)} />}
          </FormField>
        </div>
      </div>
    </Card>
  );
}
