"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCommercialAccount,
  createPayment,
  listCommercialAccounts,
  listCurrencies,
  listReceivables,
  type CreateCommercialAccountInput,
  type CreatePaymentInput,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

async function fetchCreditData(organizationId: string) {
  const [accountsPage, currenciesPage] = await Promise.all([listCommercialAccounts(organizationId), listCurrencies(organizationId, 100)]);
  const receivablesLists = await Promise.all(accountsPage.data.map((a) => listReceivables(organizationId, { commercialAccountId: a.id })));
  return {
    accounts: accountsPage.data,
    currencies: currenciesPage.data,
    receivables: receivablesLists.flatMap((p) => p.data),
  };
}

/** Comptes clients à crédit (processus-double-sources-verite, Phase 5 §5) —
 * nom délibérément distinct d'`Organization` (le tenant, jamais le même
 * concept). Le dépassement de limite est bloqué côté serveur à la vente
 * (Phase 6/7), pas ici : cet écran ne fait qu'afficher l'état résultant. */
export function useCredit(organizationId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["zylo-liquid", "credit", organizationId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchCreditData(organizationId as string),
    enabled: !!organizationId,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  async function createAccount(data: CreateCommercialAccountInput) {
    if (!organizationId) return;
    await createCommercialAccount(organizationId, data);
    await invalidate();
  }

  async function pay(data: CreatePaymentInput) {
    if (!organizationId) return;
    await createPayment(organizationId, data);
    await invalidate();
  }

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    accounts: query.data?.accounts ?? [],
    receivables: query.data?.receivables ?? [],
    currencies: query.data?.currencies ?? [],
    createAccount,
    pay,
    reload: invalidate,
  };
}
