"use client";

import { Banknote, Droplet, AlertTriangle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import type { CurrencyCashBlock } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { Alert, Card, Input, Kpi, PageHeader, Stack } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";
import { cn } from "@/shared/lib/cn";

import { DailySummaryCard } from "./DailySummaryCard";
import { NetworkCashModal } from "./NetworkCashModal";
import { useCashPeriod, useNetworkCash, type CashQuickPeriod } from "./useCashData";

const QUICK_PERIODS: CashQuickPeriod[] = ["today", "yesterday", "7d", "30d", "custom"];

/** Caisse du jour (page_caisse.md, validé avant implémentation) : le
 * propriétaire du réseau part d'un chiffre global par devise et descend
 * réseau -> station -> produit -> cuve -> mesures (NetworkCashModal ->
 * StationCashModal -> TankCashModal). Rien n'est jamais présenté comme une
 * comptabilité officielle (page_caisse.md §33) : chaque montant non
 * calculable affiche sa raison plutôt qu'un zéro silencieux. */
export default function CaisseScreen() {
  const t = useTranslations("zyloLiquid.caisse");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();

  const period = useCashPeriod();
  const { data, loading, error } = useNetworkCash(currentOrganization?.id ?? null, period.fromDate, period.toDate, period.mode);

  const yesterdayRange = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    const yesterdayMidnight = new Date(todayMidnight);
    yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
    return { from: yesterdayMidnight.toISOString(), to: todayMidnight.toISOString() };
  }, []);
  const showComparison = period.quickPeriod === "today";
  const comparison = useNetworkCash(
    showComparison ? currentOrganization?.id ?? null : null,
    yesterdayRange.from,
    yesterdayRange.to
  );

  // Moyenne des 7 derniers jours PLEINS (hors aujourd'hui, encore partiel) —
  // page_caisse.md §L "comparaison temporelle", validé après le socle P0.
  const last7DaysRange = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(todayMidnight);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return { from: sevenDaysAgo.toISOString(), to: todayMidnight.toISOString() };
  }, []);
  const last7Days = useNetworkCash(showComparison ? currentOrganization?.id ?? null : null, last7DaysRange.from, last7DaysRange.to);

  const [openBlock, setOpenBlock] = useState<CurrencyCashBlock | null>(null);

  return (
    <Stack gap="lg">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
                  {t(`periods.${value}`)}
                </button>
              ))}
            </div>
            {period.quickPeriod === "today" && (
              <label className="flex items-center gap-1.5 text-caption text-text-muted">
                <input type="checkbox" checked={period.isOperationalDay} onChange={(e) => period.setIsOperationalDay(e.target.checked)} />
                {t("operationalDayToggle")}
              </label>
            )}
            {period.quickPeriod === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  aria-label={t("customFrom")}
                  value={period.customFrom}
                  onChange={(e) => period.setCustomFrom(e.target.value)}
                />
                <span className="text-text-muted">→</span>
                <Input
                  type="datetime-local"
                  aria-label={t("customTo")}
                  value={period.customTo}
                  onChange={(e) => period.setCustomTo(e.target.value)}
                />
              </div>
            )}
          </div>
        }
      />

      <Alert tone="info">{t("banner")}</Alert>
      {showComparison && <DailySummaryCard data={data} comparisonData={comparison.data} weeklyAverageData={last7Days.data} />}
      {error && <Alert tone="error">{error}</Alert>}

      {data && data.incompletePricingStationCount > 0 && (
        <Card className="border-l-4 border-l-warning">
          <div className="flex items-center gap-2 text-body-sm text-text">
            <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
            {t("incompletePricingBanner", { count: data.incompletePricingStationCount })}
          </div>
        </Card>
      )}

      {loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : data && data.currencyBlocks.length === 0 ? (
        <Alert tone="warning">{t("noData")}</Alert>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.currencyBlocks.map((block) => {
            const comparisonBlock = comparison.data?.currencyBlocks.find((b) => b.currencyCode === block.currencyCode);
            const trend =
              showComparison && comparisonBlock && comparisonBlock.monetaryValue > 0
                ? {
                    direction: (block.monetaryValue >= comparisonBlock.monetaryValue ? "up" : "down") as "up" | "down",
                    value: `${(((block.monetaryValue - comparisonBlock.monetaryValue) / comparisonBlock.monetaryValue) * 100).toFixed(1)}%`,
                  }
                : undefined;
            const last7Block = last7Days.data?.currencyBlocks.find((b) => b.currencyCode === block.currencyCode);
            const dailyAverage7d = last7Block && last7Block.monetaryValue > 0 ? last7Block.monetaryValue / 7 : null;
            return (
              <Kpi
                key={block.currencyCode}
                icon={Banknote}
                label={t("currencyCardTitle", { currency: block.currencyCode })}
                value={formatMoney(format, block.monetaryValue, block.currencyCode)}
                trend={trend}
                sub={
                  <span className="flex flex-col gap-0.5">
                    <span>{t("currencyCardSub", { volume: formatLiters(block.volumeSoldLiters), stations: block.stationCount })}</span>
                    {dailyAverage7d !== null && (
                      <span>
                        {t("vsWeeklyAverage", {
                          sign: block.monetaryValue >= dailyAverage7d ? "+" : "",
                          pct: (((block.monetaryValue - dailyAverage7d) / dailyAverage7d) * 100).toFixed(1),
                        })}
                      </span>
                    )}
                  </span>
                }
                tone="primary"
                onClick={() => setOpenBlock(block)}
              />
            );
          })}
          {data && (
            <Kpi
              icon={Droplet}
              label={t("stationsCoverage")}
              value={`${data.stationsWithDataCount} / ${data.stationsTotalCount}`}
              sub={t("productsCount", { count: data.productCount })}
              tone="neutral"
            />
          )}
        </div>
      )}

      {data?.lastMeasurementAt && (
        <p className="text-caption text-text-muted">
          {t("lastUpdate", { time: format.dateTime(new Date(data.lastMeasurementAt), { hour: "2-digit", minute: "2-digit" }) })}
        </p>
      )}

      <NetworkCashModal
        open={openBlock !== null}
        onOpenChange={(next) => !next && setOpenBlock(null)}
        organizationId={currentOrganization?.id ?? ""}
        block={openBlock}
        fromDate={period.fromDate}
        toDate={period.toDate}
        mode={period.mode}
      />
    </Stack>
  );
}
