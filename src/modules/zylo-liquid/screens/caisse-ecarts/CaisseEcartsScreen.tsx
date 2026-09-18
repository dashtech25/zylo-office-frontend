"use client";

import { Scale } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { cn } from "@/shared/lib/cn";
import { Alert, Badge, Card, CardSectionHeader, EmptyState, Input, PageHeader, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

import { useCashPeriod, type CashQuickPeriod } from "../caisse/useCashData";
import { useCaisseEcartsStock, useOtherDiscrepancies } from "./useCaisseEcarts";

const QUICK_PERIODS: CashQuickPeriod[] = ["today", "yesterday", "7d", "30d", "custom"];

const SUBJECT_TYPE_LABELS: Record<string, string> = {
  DeliveryDeclaration: "Livraison déclarée",
  ManualGaugingDeclaration: "Jaugeage manuel",
  QualityCheckDeclaration: "Contrôle qualité/eau",
};

const STATUS_TONE = { matched: "success", discrepancy: "warning", insufficient_data: "neutral" } as const;

/** Écran « Écarts de caisse » — la rangée « Ventes déclarées vs stock » est
 * désormais active (déclenche le rapprochement pour la période choisie, par
 * défaut aujourd'hui, au lieu de se contenter d'afficher ce qui existait
 * déjà) : c'est la comparaison centrale demandée par le commanditaire
 * (2026-09-18). Les 3 autres types d'écarts (livraisons, jaugeage,
 * qualité) restent en vue passive, inchangée, non prioritaire pour
 * l'instant. */
export default function CaisseEcartsScreen() {
  const t = useTranslations("zyloLiquid.caisseEcartsScreen");
  const tCaisse = useTranslations("zyloLiquid.caisse");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const period = useCashPeriod();
  const stock = useCaisseEcartsStock(currentOrganization?.id ?? null, period.fromDate, period.toDate);
  const other = useOtherDiscrepancies(currentOrganization?.id ?? null);

  return (
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />

      <Card>
        <CardSectionHeader title={t("stock.title")} />
        <p className="-mt-3 mb-3 text-body-sm text-text-muted">{t("stock.subtitle")}</p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-pill border border-border-subtle p-1">
            {QUICK_PERIODS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => period.setQuickPeriod(value)}
                className={cn(
                  "rounded-pill px-3 py-1.5 text-body-sm font-medium transition-colors",
                  period.quickPeriod === value ? "bg-primary-muted text-primary" : "text-text-muted hover:bg-surface-muted"
                )}
              >
                {tCaisse(`periods.${value}`)}
              </button>
            ))}
          </div>
          {period.quickPeriod === "custom" && (
            <div className="flex items-center gap-2">
              <Input type="datetime-local" aria-label={tCaisse("customFrom")} value={period.customFrom} onChange={(e) => period.setCustomFrom(e.target.value)} />
              <span className="text-text-muted">→</span>
              <Input type="datetime-local" aria-label={tCaisse("customTo")} value={period.customTo} onChange={(e) => period.setCustomTo(e.target.value)} />
            </div>
          )}
        </div>

        {stock.error && <Alert tone="error">{stock.error}</Alert>}

        {stock.loading ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("stock.columns.station")}</TableHeaderCell>
                <TableHeaderCell>{t("stock.columns.tank")}</TableHeaderCell>
                <TableHeaderCell>{t("stock.columns.day")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("stock.columns.declared")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("stock.columns.detected")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("stock.columns.gap")}</TableHeaderCell>
                <TableHeaderCell>{t("stock.columns.status")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={7} />
              ))}
            </TableBody>
          </Table>
        ) : stock.rows.length === 0 ? (
          <EmptyState icon={Scale} title={t("stock.empty")} />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("stock.columns.station")}</TableHeaderCell>
                <TableHeaderCell>{t("stock.columns.tank")}</TableHeaderCell>
                <TableHeaderCell>{t("stock.columns.day")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("stock.columns.declared")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("stock.columns.detected")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("stock.columns.gap")}</TableHeaderCell>
                <TableHeaderCell>{t("stock.columns.status")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stock.rows.map((row) => (
                <TableRow key={`${row.tankId}-${row.day}`}>
                  <TableCell>{row.stationName}</TableCell>
                  <TableCell>
                    {row.tankDisplayName}
                    <span className="ml-1 text-caption text-text-muted">({row.fuelProductName})</span>
                  </TableCell>
                  <TableCell>{format.dateTime(new Date(`${row.day}T00:00:00`), { day: "2-digit", month: "2-digit", year: "numeric" })}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatLiters(row.declaredVolumeLiters)} L</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.detectedVolumeLiters !== null ? `${formatLiters(row.detectedVolumeLiters)} L` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.discrepancyValueLiters !== null ? `${formatLiters(row.discrepancyValueLiters)} L` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge tone={STATUS_TONE[row.status]} size="sm" dot>
                      {t(`stock.status.${row.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardSectionHeader title={t("other.title")} />
        <p className="-mt-3 mb-3 text-body-sm text-text-muted">{t("other.subtitle")}</p>
        {other.error && <Alert tone="error">{other.error}</Alert>}
        {other.loading ? (
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
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={4} />
              ))}
            </TableBody>
          </Table>
        ) : other.records.length === 0 ? (
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
              {other.records.map((r) => (
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
      </Card>
    </Stack>
  );
}
