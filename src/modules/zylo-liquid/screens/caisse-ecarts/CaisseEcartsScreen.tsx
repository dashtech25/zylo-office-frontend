"use client";

import { Scale } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert, EmptyState, PageHeader, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useCaisseEcarts } from "./useCaisseEcarts";

const SUBJECT_TYPE_LABELS: Record<string, string> = {
  DeliveryDeclaration: "Livraison déclarée",
  ManualGaugingDeclaration: "Jaugeage manuel",
  QualityCheckDeclaration: "Contrôle qualité/eau",
  TankStockDay: "Ventes vs stock",
};

/** Écarts détectés par le mécanisme de rapprochement
 * (processus-double-sources-verite, Phase 6-8), tous types confondus —
 * vue de lecture seule, jamais un nouveau calcul : chaque ligne vient d'un
 * rapprochement déjà déclenché ailleurs (Approvisionnement, Réconciliation
 * de stock...). */
export default function CaisseEcartsScreen() {
  const t = useTranslations("zyloLiquid.caisseEcartsScreen");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useCaisseEcarts(currentOrganization?.id ?? null);

  return (
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />
      <Alert tone="info">{t("banner")}</Alert>
      {data.error && <Alert tone="error">{data.error}</Alert>}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : data.records.length === 0 ? (
        <EmptyState icon={Scale} title={t("empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.type")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.discrepancy")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.tolerance")}</TableHeaderCell>
              <TableHeaderCell>{t("table.evaluatedAt")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{SUBJECT_TYPE_LABELS[r.subjectType] ?? r.subjectType}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{r.discrepancyValue !== null ? `${r.discrepancyValue.toFixed(2)} ${r.discrepancyUnit ?? ""}` : "—"}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{r.toleranceApplied !== null ? r.toleranceApplied.toFixed(2) : "—"}</TableCell>
                <TableCell>{format.dateTime(new Date(r.evaluatedAt), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
