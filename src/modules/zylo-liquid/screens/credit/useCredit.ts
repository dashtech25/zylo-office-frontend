"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createCommercialAccount,
  createPayment,
  listCommercialAccounts,
  listCurrencies,
  listReceivables,
  type CommercialAccount,
  type CreateCommercialAccountInput,
  type CreatePaymentInput,
  type Currency,
  type Receivable,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Comptes clients à crédit (processus-double-sources-verite, Phase 5 §5) —
 * nom délibérément distinct d'`Organization` (le tenant, jamais le même
 * concept). Le dépassement de limite est bloqué côté serveur à la vente
 * (Phase 6/7), pas ici : cet écran ne fait qu'afficher l'état résultant. */
export function useCredit(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<CommercialAccount[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [accountsPage, currenciesPage] = await Promise.all([listCommercialAccounts(organizationId), listCurrencies(organizationId, 100)]);
      setAccounts(accountsPage.data);
      setCurrencies(currenciesPage.data);
      const receivablesLists = await Promise.all(accountsPage.data.map((a) => listReceivables(organizationId, { commercialAccountId: a.id })));
      setReceivables(receivablesLists.flatMap((p) => p.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createAccount(data: CreateCommercialAccountInput) {
    if (!organizationId) return;
    await createCommercialAccount(organizationId, data);
    await load();
  }

  async function pay(data: CreatePaymentInput) {
    if (!organizationId) return;
    await createPayment(organizationId, data);
    await load();
  }

  return { loading, error, accounts, receivables, currencies, createAccount, pay, reload: load };
}
