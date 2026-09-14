"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Alert, Badge, Button, Card, EmptyState } from "@/shared/ui";
import { Scale } from "lucide-react";

import { useTrucks } from "./useTrucks";

/** Onglet « Arrêts à réconcilier » (mission « tracking », étape 2 —
 * scénario 5, validé avec le commanditaire) — file d'arbitrage humain
 * pour les arrêts tombés dans le rayon de plusieurs lieux dont les
 * distances sont trop proches (écart < 20 %) pour trancher
 * automatiquement. Même esprit que Réconciliation de stock : une file
 * d'attente, jamais une devinette silencieuse. */
export function TruckStopReconciliationTab({ data }: { data: ReturnType<typeof useTrucks> }) {
  const t = useTranslations("zyloLiquid.trucks.reconciliation");
  const tCommon = useTranslations("common");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResolve(reconciliationId: string, locationId: string | null) {
    setResolvingId(reconciliationId);
    setError(null);
    try {
      await data.resolveReconciliation(reconciliationId, locationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setResolvingId(null);
    }
  }

  const pending = data.reconciliations.filter((r) => r.status === "pending");

  return (
    <div className="flex flex-col gap-4 pt-4">
      {error && <Alert tone="error">{error}</Alert>}

      {pending.length === 0 ? (
        <Card padding="none">
          <div className="p-5">
            <EmptyState icon={Scale} title={t("empty")} />
          </div>
        </Card>
      ) : (
        pending.map((reconciliation) => {
          const candidates = reconciliation.candidateLocationIds
            .map((id) => data.trackingLocations.find((l) => l.id === id))
            .filter((l): l is NonNullable<typeof l> => !!l);
          return (
            <Card key={reconciliation.id} padding="none">
              <div className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-2">
                  <Badge tone="warning">{t("ambiguous")}</Badge>
                  <span className="text-body-sm text-text-muted">{t("candidatesCount", { count: candidates.length })}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidates.map((location) => (
                    <Button
                      key={location.id}
                      variant="outline"
                      size="sm"
                      loading={resolvingId === reconciliation.id}
                      onClick={() => handleResolve(reconciliation.id, location.id)}
                    >
                      {t("chooseLocation", { name: location.name })}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    loading={resolvingId === reconciliation.id}
                    onClick={() => handleResolve(reconciliation.id, null)}
                  >
                    {t("chooseNone")}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
