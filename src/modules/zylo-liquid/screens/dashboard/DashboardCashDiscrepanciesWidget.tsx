"use client";

import Link from "next/link";
import { Scale } from "lucide-react";
import { useFormatter } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { listReconciliationRecords, type Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Card } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

const MAX_VISIBLE = 5;

// Nomenclature métier : ce widget est intitulé "Écarts de caisse" (nom
// validé avec l'utilisateur) mais ne porte PAS sur des écarts de
// caisse/argent liquide au sens strict. `/zylo-liquid/caisse-ecarts`
// (CaisseEcartsScreen) est en réalité la vue "tous les écarts de
// rapprochement, toutes sources confondues" (livraison déclarée, jaugeage
// manuel, contrôle qualité/eau, ventes vs stock). Ce widget-ci n'affiche que
// les écarts DeliveryDeclaration / ManualGaugingDeclaration /
// QualityCheckDeclaration — jamais TankStockDay ("écarts de stock"), pour
// ne pas dupliquer le widget dédié construit en parallèle qui couvre déjà
// ce sous-type.
const SUBJECT_TYPE_LABELS: Record<string, string> = {
  DeliveryDeclaration: "Livraison déclarée",
  ManualGaugingDeclaration: "Jaugeage manuel",
  QualityCheckDeclaration: "Contrôle qualité/eau",
};

const EXCLUDED_SUBJECT_TYPE = "TankStockDay";

async function fetchCashDiscrepancies(organizationId: string) {
  const page = await listReconciliationRecords(organizationId, { limit: 100 });
  return page.data.filter((r) => r.status === "discrepancy" && r.subjectType !== EXCLUDED_SUBJECT_TYPE);
}

/** Widget « Écarts de caisse » du tableau de bord — réutilise
 * `/reconciliation-records` (même endpoint que CaisseEcartsScreen), filtré
 * côté client sur les types autres que TankStockDay (voir commentaire de
 * nommage ci-dessus). Aucune donnée `stations`/`tanks` supplémentaire n'est
 * requise : ces enregistrements n'ont pas de lien direct vers une station
 * (`subjectId` pointe vers une déclaration, pas une station), donc la prop
 * `stations` est reçue pour rester cohérente avec les autres widgets du
 * dashboard mais n'est pas utilisée pour résoudre un nom de station ici. */
export function DashboardCashDiscrepanciesWidget({
  organizationId,
  stations,
}: {
  organizationId: string;
  stations: Station[];
}) {
  const format = useFormatter();
  // Reçue pour cohérence de signature avec les autres widgets du dashboard ;
  // volontairement non utilisée ici (voir commentaire de tête de fichier).
  void stations;

  const query = useQuery({
    queryKey: ["zylo-liquid", "cash-discrepancies", organizationId],
    queryFn: () => fetchCashDiscrepancies(organizationId),
    enabled: !!organizationId,
  });

  const records = query.data ?? [];

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-h3 font-semibold text-text">Écarts de caisse</h3>
        <span className="text-body-sm font-medium text-text-muted">{records.length}</span>
      </div>
      {records.length === 0 ? (
        <p className="text-body-sm text-text-muted">Aucun écart détecté</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {records.slice(0, MAX_VISIBLE).map((record) => (
            <li key={record.id}>
              <Link
                href="/zylo-liquid/caisse-ecarts"
                className={cn("flex w-full items-start gap-2 rounded-card px-1 py-2 text-left transition-colors hover:bg-surface-muted")}
              >
                <Scale className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-text">{SUBJECT_TYPE_LABELS[record.subjectType] ?? record.subjectType}</p>
                  <p className="truncate text-caption text-text-muted">
                    {record.discrepancyValue !== null ? `${record.discrepancyValue.toFixed(2)} ${record.discrepancyUnit ?? ""}` : "—"}
                  </p>
                </div>
                <span className="shrink-0 text-caption text-text-muted">
                  {format.dateTime(new Date(record.evaluatedAt), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
