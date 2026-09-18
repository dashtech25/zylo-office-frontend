"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { listCommercialAccounts, listCurrencies, listReceivables, type CommercialAccount } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Card } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

const MAX_VISIBLE = 5;

interface CreditOutstandingEntry {
  account: CommercialAccount;
  currencyCode: string;
  outstanding: number;
}

async function fetchCreditOutstanding(organizationId: string): Promise<CreditOutstandingEntry[]> {
  const [accountsPage, currenciesPage] = await Promise.all([listCommercialAccounts(organizationId, 100), listCurrencies(organizationId, 100)]);
  const activeAccounts = accountsPage.data.filter((a) => a.active);

  const receivablesLists = await Promise.all(activeAccounts.map((a) => listReceivables(organizationId, { commercialAccountId: a.id })));

  const entries = activeAccounts.map((account, index) => {
    const accountReceivables = receivablesLists[index].data;
    const outstanding = accountReceivables.filter((r) => r.status !== "settled").reduce((sum, r) => sum + r.amount, 0);
    const currencyCode = currenciesPage.data.find((c) => c.id === account.currencyId)?.code ?? "";
    return { account, currencyCode, outstanding };
  });

  return entries.filter((e) => e.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);
}

/** Widget « Encours clients à crédit » du tableau de bord — reproduit
 * exactement la formule d'encours de CreditScreen.tsx (`amount` sommé pour
 * toute créance non "settled", sans champ "restant"), triée par encours
 * décroissant (dette la plus élevée en premier, choix explicite de
 * l'utilisateur). Ne réutilise pas `useCredit` (scopé à l'écran Crédit
 * complet) : fetch dédié, restreint aux comptes actifs. */
export function DashboardCreditOutstandingWidget({ organizationId }: { organizationId: string }) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "credit-outstanding", organizationId],
    queryFn: () => fetchCreditOutstanding(organizationId),
    enabled: !!organizationId,
  });

  const entries = query.data ?? [];

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-h3 font-semibold text-text">Encours clients à crédit</h3>
        <span className="text-body-sm font-medium text-text-muted">{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-body-sm text-text-muted">Aucun encours en cours</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {entries.slice(0, MAX_VISIBLE).map(({ account, currencyCode, outstanding }) => (
            <li key={account.id}>
              <Link
                href="/zylo-liquid/credit"
                className={cn("flex w-full items-start gap-2 rounded-card px-1 py-2 text-left transition-colors hover:bg-surface-muted")}
              >
                <Wallet className={cn("mt-0.5 size-4 shrink-0", outstanding >= account.creditLimit ? "text-warning" : "text-text-muted")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-text">{account.name}</p>
                  <p className="truncate text-caption text-text-muted">
                    {outstanding.toFixed(0)} / {account.creditLimit} {currencyCode}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
