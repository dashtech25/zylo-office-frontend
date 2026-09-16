"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FileText, Ship } from "lucide-react";

import { Badge } from "@/shared/ui/Badge";
import { Card, CardContent } from "@/shared/ui/Card";
import { CardSectionHeader } from "@/shared/ui/CardSectionHeader";
import { EmptyState } from "@/shared/ui/EmptyState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Stack } from "@/shared/ui/Stack";
import { Tabs } from "@/shared/ui/Tabs";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui/Table";

import { MOCK_DOCUMENTS, MOCK_VESSELS, type MockDocument } from "@/modules/zylo-tanker/mock/fleetMock";

/** Module 16 "Gestion documentaire" de SMART TANKER — écran frontend-only,
 * aucune donnée réelle branchée (voir mock/fleetMock.ts). Reproduit le
 * patron screens/<nom>/<Nom>Screen.tsx de zylo-liquid : composition pure à
 * partir de shared/ui, aucune logique métier dans src/app. Couvre Plans,
 * Manuels, Certificats et leur historique de mise à jour, avec un suivi des
 * échéances de certificats (le signal le plus utile de cet écran pour un
 * gestionnaire de flotte). */

const EXPIRY_WARNING_WINDOW_DAYS = 60;

type CategoryFilter = "all" | MockDocument["category"];

const CATEGORY_LABEL: Record<MockDocument["category"], string> = {
  plan: "Plan",
  manuel: "Manuel",
  certificat: "Certificat",
};

const CATEGORY_TONE: Record<MockDocument["category"], "info" | "secondary" | "primary"> = {
  plan: "info",
  manuel: "secondary",
  certificat: "primary",
};

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "plan", label: "Plans" },
  { value: "manuel", label: "Manuels" },
  { value: "certificat", label: "Certificats" },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Calcule le nombre de jours restants avant expiration (négatif si déjà
 * expiré) — comparaison uniquement sur les dates, sans heure, pour éviter
 * les décalages de fuseau. */
function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ExpiryCell({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) {
    return <span className="text-text-muted">—</span>;
  }

  const days = daysUntil(expiresAt);

  if (days < 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="tabular-nums text-text">{formatDate(expiresAt)}</span>
        <Badge tone="error" dot>
          <AlertTriangle className="size-3" aria-hidden />
          Expiré
        </Badge>
      </div>
    );
  }

  if (days <= EXPIRY_WARNING_WINDOW_DAYS) {
    return (
      <div className="flex items-center gap-2">
        <span className="tabular-nums text-text">{formatDate(expiresAt)}</span>
        <Badge tone="warning" dot>
          <AlertTriangle className="size-3" aria-hidden />
          Expire dans {days} j
        </Badge>
      </div>
    );
  }

  return <span className="tabular-nums text-text">{formatDate(expiresAt)}</span>;
}

function DocumentsTable({ documents }: { documents: MockDocument[] }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Aucun document"
        description="Aucun document n'est disponible pour ce navire et cette catégorie."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Titre</TableHeaderCell>
          <TableHeaderCell>Catégorie</TableHeaderCell>
          <TableHeaderCell>Dernière mise à jour</TableHeaderCell>
          <TableHeaderCell>Expiration</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="font-medium text-text">{doc.title}</TableCell>
            <TableCell>
              <Badge tone={CATEGORY_TONE[doc.category]}>{CATEGORY_LABEL[doc.category]}</Badge>
            </TableCell>
            <TableCell className="tabular-nums">{formatDate(doc.updatedAt)}</TableCell>
            <TableCell>
              <ExpiryCell expiresAt={doc.expiresAt} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function VesselDocuments({ vesselId }: { vesselId: string }) {
  const [category, setCategory] = useState<CategoryFilter>("all");

  const documents = useMemo(
    () =>
      MOCK_DOCUMENTS.filter((doc) => doc.vesselId === vesselId).filter(
        (doc) => category === "all" || doc.category === category
      ),
    [vesselId, category]
  );

  return (
    <Stack gap="md">
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setCategory(filter.value)}
            className={
              "rounded-button px-3 py-1.5 text-body-sm font-medium transition-colors " +
              (category === filter.value
                ? "bg-primary text-white"
                : "bg-surface-muted text-text-muted hover:text-text")
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      <DocumentsTable documents={documents} />
    </Stack>
  );
}

export default function DocumentsScreen() {
  return (
    <Stack gap="lg">
      <PageHeader
        eyebrow="SMART TANKER"
        title="Gestion documentaire"
        description="Plans, manuels et certificats par navire, avec suivi des échéances de renouvellement."
      />

      <Card>
        <CardSectionHeader icon={FileText} title="Documents" />
        <CardContent>
          <Tabs
            variant="pills"
            defaultValue={MOCK_VESSELS[0]?.id}
            items={MOCK_VESSELS.map((vessel) => ({
              value: vessel.id,
              label: (
                <span className="flex items-center gap-1.5">
                  <Ship className="size-3.5" aria-hidden />
                  {vessel.name}
                </span>
              ),
              content: <VesselDocuments vesselId={vessel.id} />,
            }))}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
