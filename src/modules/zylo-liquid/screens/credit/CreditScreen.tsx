"use client";

import { CreditCard, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, PageHeader, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { CardSkeleton } from "@/shared/ui/Skeleton";

import { useCredit } from "./useCredit";

/** Comptes clients à crédit (processus-double-sources-verite, Phase 5 §5) —
 * chaque créance vient d'une vente à crédit (écran Journal des ventes) ; un
 * paiement ici réduit la créance visée sans jamais la réécrire. */
export default function CreditScreen() {
  const t = useTranslations("zyloLiquid.creditScreen");
  const tCommon = useTranslations("common");
  const { currentOrganization } = useOrganization();
  const data = useCredit(currentOrganization?.id ?? null);

  const [name, setName] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [payingReceivableId, setPayingReceivableId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  async function handleCreateAccount() {
    if (!name.trim() || !currencyId || !creditLimit) {
      setFormError(t("form.required"));
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await data.createAccount({ name: name.trim(), currencyId, creditLimit: Number(creditLimit) });
      setName("");
      setCreditLimit("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreating(false);
    }
  }

  async function handlePay(receivable: (typeof data.receivables)[number]) {
    if (!payAmount) return;
    setPaySaving(true);
    setFormError(null);
    try {
      await data.pay({ receivableId: receivable.id, paidAt: new Date().toISOString(), amount: Number(payAmount), currencyId: receivable.currencyId });
      setPayingReceivableId(null);
      setPayAmount("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setPaySaving(false);
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
          <FormField label={t("form.name")}>{(field) => <Input {...field} value={name} onChange={(e) => setName(e.target.value)} />}</FormField>
          <FormField label={t("form.currency")}>
            {() => <Select aria-label={t("form.currency")} value={currencyId || undefined} onValueChange={setCurrencyId} placeholder="—" options={data.currencies.map((c) => ({ value: c.id, label: c.code }))} />}
          </FormField>
          <FormField label={t("form.creditLimit")}>
            {(field) => <Input {...field} type="number" step="1" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />}
          </FormField>
        </div>
        <Button className="mt-4" onClick={handleCreateAccount} loading={creating}>
          <Plus className="size-4" aria-hidden />
          {t("form.submit")}
        </Button>
      </Card>

      {data.loading ? (
        <div className="flex flex-col gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : data.accounts.length === 0 ? (
        <EmptyState icon={CreditCard} title={t("empty")} />
      ) : (
        <div className="flex flex-col gap-4">
          {data.accounts.map((account) => {
            const currency = data.currencies.find((c) => c.id === account.currencyId);
            const accountReceivables = data.receivables.filter((r) => r.commercialAccountId === account.id);
            const outstanding = accountReceivables.filter((r) => r.status !== "settled").reduce((sum, r) => sum + r.amount, 0);
            return (
              <Card key={account.id} padding="none">
                <div className="flex items-center justify-between p-5 pb-3">
                  <div>
                    <h3 className="text-h4 font-semibold text-text">{account.name}</h3>
                    <p className="text-body-sm text-text-muted">
                      {t("account.outstanding")}: {outstanding} / {account.creditLimit} {currency?.code ?? ""}
                    </p>
                  </div>
                  <Badge tone={account.active ? "success" : "neutral"}>{account.active ? t("account.active") : t("account.inactive")}</Badge>
                </div>
                {accountReceivables.length === 0 ? (
                  <p className="px-5 pb-5 text-body-sm text-text-muted">{t("account.noReceivable")}</p>
                ) : (
                  <div className="px-5 pb-5">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell className="text-right">{t("table.amount")}</TableHeaderCell>
                          <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                          <TableHeaderCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {accountReceivables.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-right font-mono tabular-nums">
                              {r.amount} {currency?.code ?? ""}
                            </TableCell>
                            <TableCell>
                              <Badge tone={r.status === "settled" ? "success" : r.status === "partially_settled" ? "warning" : "neutral"}>{t(`receivableStatus.${r.status}`)}</Badge>
                            </TableCell>
                            <TableCell>
                              {r.status !== "settled" &&
                                (payingReceivableId === r.id ? (
                                  <div className="flex items-center gap-1">
                                    <Input type="number" step="1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-24" />
                                    <Button size="sm" variant="primary" loading={paySaving} onClick={() => handlePay(r)}>
                                      {tCommon("actions.save")}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setPayingReceivableId(null)}>
                                      {tCommon("actions.cancel")}
                                    </Button>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="link" onClick={() => setPayingReceivableId(r.id)}>
                                    {t("table.pay")}
                                  </Button>
                                ))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Stack>
  );
}
