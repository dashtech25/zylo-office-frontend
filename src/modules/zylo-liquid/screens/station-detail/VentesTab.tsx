"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Fragment, useCallback, useRef, useState } from "react";
import { Download, FileSpreadsheet, Plus, Receipt, Upload } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { exportTable } from "@/core/api/exportTable";
import { parseXlsxFile } from "@/core/api/importTable";
import {
  bulkImportSales,
  listCommercialAccounts,
  listCurrencies,
  listPumps,
  listSales,
  listTanks,
  type BulkImportSaleRow,
  type PaymentMethod,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { cn } from "@/shared/lib/cn";
import {
  Alert,
  Button,
  Card,
  CardSectionHeader,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
} from "@/shared/ui";
import { KpiSkeleton, Skeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";

import { CashConfidenceBadge } from "../caisse/CashConfidenceBadge";
import { CashReasonNote } from "../caisse/CashReasonNote";
import { TankCashModal } from "../caisse/TankCashModal";
import { useCashPeriod, useStationCash, type CashQuickPeriod } from "../caisse/useCashData";
import { PartStateBox, usePartData } from "./PartState";
import { SaleDeclarationModal } from "./SaleDeclarationModal";

const QUICK_PERIODS: CashQuickPeriod[] = ["today", "yesterday", "7d", "30d", "custom"];

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "fleet", "credit", "orange_money", "mtn_momo", "bank_transfer", "cheque", "other"];

// Ordre et libellés du fichier XLSX d'import/export — contrat figé partagé
// entre le modèle téléchargeable et l'import (même tableau des deux côtés,
// jamais deux définitions divergentes), mêmes idiomes que IMPORT_HEADERS
// dans ShopWorkspace.tsx. Les index (jamais le volume) reflètent le geste
// de saisie réel du gérant, exactement comme SaleDeclarationModal.
const IMPORT_HEADERS = ["Pompe", "Index début (L)", "Index fin (L)", "Date/heure fin de shift", "Prix unitaire", "Devise (code)", "Moyen de paiement", "Compte client (nom, si crédit)"] as const;

// Asymétrie volontaire avec IMPORT_HEADERS : une vente déjà déclarée
// (`Sale`) ne conserve pas ses index de pompe d'origine, seulement le
// volume résultant (`quantityLiters`) — l'export utilise donc une colonne
// "Volume (L)" à la place des deux colonnes "Index début/fin".
const EXPORT_HEADERS = ["Pompe", "Volume (L)", "Date/heure fin de shift", "Prix unitaire", "Devise (code)", "Moyen de paiement", "Compte client (nom, si crédit)"] as const;

/** Onglet "Ventes" au niveau station (P1-1 §4.5 de refonte-configuration /
 * P1-5 de l'audit module Stations 2026-09-16) : les ventes n'étaient
 * visibles qu'au niveau réseau jusqu'ici. Deux sources cohabitent désormais :
 * les ventes déclarées (`Sale`, source de vérité principale — section du
 * haut) et la "baisse en cuve" (agrégation télémétrie déjà exposée côté
 * backend via `getStationCashDetail`, réutilisée telle quelle, jamais un
 * deuxième calcul — section du bas, un recoupement). La déclaration humaine
 * est désormais implémentée ici via `SaleDeclarationModal` ; seule la
 * source "Pompe" (calcul dérivé de la télémétrie de pompe) reste hors
 * périmètre. */
export function VentesTab({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.caisse");
  const tPayment = useTranslations("zyloLiquid.ventesScreen.paymentMethod");
  const tStation = useTranslations("zyloLiquid.stationDetail.sales");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const period = useCashPeriod();
  const { data, loading, error } = useStationCash(organizationId, stationId, period.fromDate, period.toDate, period.mode);
  const [openTankId, setOpenTankId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const salesQueryKey = ["zylo-liquid", "station-detail", "ventes-declarations", organizationId, stationId] as const;

  const loadSalesPart = useCallback(async () => {
    const [pumpsPage, tanksPage, salesPage, currenciesPage, accountsPage] = await Promise.all([
      listPumps(organizationId, { stationId, limit: 100 }),
      listTanks(organizationId, 100, stationId),
      listSales(organizationId, { stationId, limit: 100 }),
      listCurrencies(organizationId, 100),
      listCommercialAccounts(organizationId, 100),
    ]);
    return { pumps: pumpsPage.data, tanks: tanksPage.data, sales: salesPage.data, currencies: currenciesPage.data, commercialAccounts: accountsPage.data };
  }, [organizationId, stationId]);
  const salesState = usePartData(salesQueryKey, loadSalesPart);

  const [declareOpen, setDeclareOpen] = useState(false);

  // Import/export en masse des ventes déclarées — même squelette que
  // l'import/export du catalogue Boutique dans ShopWorkspace.tsx.
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const pumps = salesState.status === "ready" ? salesState.data.pumps : [];
  const tanks = salesState.status === "ready" ? salesState.data.tanks : [];
  const sales = salesState.status === "ready" ? [...salesState.data.sales].sort((a, b) => b.eventAt.localeCompare(a.eventAt)) : [];
  const currencies = salesState.status === "ready" ? salesState.data.currencies : [];
  const commercialAccounts = salesState.status === "ready" ? salesState.data.commercialAccounts : [];

  function pumpLabel(pumpId: string | null | undefined): string {
    if (!pumpId) return "—";
    return pumps.find((pump) => pump.id === pumpId)?.name ?? "—";
  }

  function handleSaleSaved() {
    setDeclareOpen(false);
    void queryClient.invalidateQueries({ queryKey: salesQueryKey });
  }

  function handleDownloadTemplate() {
    const example = [
      pumps[0]?.name ?? "Pompe 1",
      "1000",
      "1300",
      new Date().toISOString().slice(0, 16).replace("T", " "),
      "650",
      currencies[0]?.code ?? "XAF",
      tPayment("cash"),
      "",
    ];
    void exportTable("xlsx", tStation("importExport.templateFilename"), [...IMPORT_HEADERS], [example], organizationId);
  }

  function handleExportSales() {
    const rows = sales.map((sale) => {
      const currencyCode = currencies.find((c) => c.id === sale.currencyId)?.code ?? "";
      const accountName = commercialAccounts.find((a) => a.id === sale.commercialAccountId)?.name ?? "";
      return [
        pumpLabel(sale.pumpId),
        String(sale.quantityLiters),
        sale.eventAt,
        String(sale.priceAmount),
        currencyCode,
        tPayment(sale.paymentMethod),
        accountName,
      ];
    });
    void exportTable("xlsx", tStation("importExport.exportFilename"), [...EXPORT_HEADERS], rows, organizationId);
  }

  async function handleImportSalesFile(file: File) {
    setImporting(true);
    setImportErrors([]);
    setImportSuccessCount(null);
    try {
      const rawRows = await parseXlsxFile(file, organizationId);
      if (rawRows.length === 0) {
        setImportErrors([tStation("importExport.invalidStructure", { headers: IMPORT_HEADERS.join(", ") })]);
        return;
      }
      const headerRow = rawRows[0].map((h) => h.trim());
      const headersMatch = IMPORT_HEADERS.length === headerRow.length && IMPORT_HEADERS.every((h, i) => h === headerRow[i]);
      if (!headersMatch) {
        setImportErrors([tStation("importExport.invalidStructure", { headers: IMPORT_HEADERS.join(", ") })]);
        return;
      }

      const pumpByName = new Map(pumps.map((p) => [p.name.trim().toLowerCase(), p]));
      const currencyByCode = new Map(currencies.map((c) => [c.code.toLowerCase(), c.id]));
      const accountByName = new Map(commercialAccounts.map((a) => [a.name.trim().toLowerCase(), a.id]));
      const paymentMethodByLabel = new Map(PAYMENT_METHODS.map((m) => [tPayment(m).trim().toLowerCase(), m]));

      const validRows: BulkImportSaleRow[] = [];
      const clientErrors: { rowNumber: number; message: string }[] = [];

      rawRows.slice(1).forEach((cells, index) => {
        const rowNumber = index + 2;
        if (cells.every((c) => !c.trim())) return; // ligne vide ignorée, jamais une erreur
        const [pumpName, indexStartStr, indexEndStr, dateStr, priceStr, currencyCode, paymentLabel, accountName] = cells;

        const pump = pumpName?.trim() ? pumpByName.get(pumpName.trim().toLowerCase()) : undefined;
        if (!pump) {
          clientErrors.push({ rowNumber, message: tStation("importExport.invalidPump", { value: pumpName ?? "" }) });
          return;
        }
        const indexStart = Number(indexStartStr);
        const indexEnd = Number(indexEndStr);
        if (!indexStartStr || !indexEndStr || Number.isNaN(indexStart) || Number.isNaN(indexEnd)) {
          clientErrors.push({ rowNumber, message: tStation("importExport.invalidIndex") });
          return;
        }
        if (indexEnd <= indexStart) {
          clientErrors.push({ rowNumber, message: tStation("importExport.indexOrderError") });
          return;
        }
        const eventDate = dateStr?.trim() ? new Date(dateStr) : null;
        if (!eventDate || Number.isNaN(eventDate.getTime())) {
          clientErrors.push({ rowNumber, message: tStation("importExport.invalidDate") });
          return;
        }
        const price = Number(priceStr);
        if (!priceStr || Number.isNaN(price) || price <= 0) {
          clientErrors.push({ rowNumber, message: tStation("importExport.invalidPrice") });
          return;
        }
        const currencyId = currencyCode?.trim() ? currencyByCode.get(currencyCode.trim().toLowerCase()) : undefined;
        if (!currencyId) {
          clientErrors.push({ rowNumber, message: tStation("importExport.invalidCurrency", { value: currencyCode ?? "" }) });
          return;
        }
        const paymentMethod = paymentLabel?.trim() ? paymentMethodByLabel.get(paymentLabel.trim().toLowerCase()) : undefined;
        if (!paymentMethod) {
          clientErrors.push({ rowNumber, message: tStation("importExport.invalidPaymentMethod", { value: paymentLabel ?? "" }) });
          return;
        }
        let commercialAccountId: string | undefined;
        if (paymentMethod === "credit") {
          if (!accountName?.trim()) {
            clientErrors.push({ rowNumber, message: tStation("importExport.missingAccount") });
            return;
          }
          const account = accountByName.get(accountName.trim().toLowerCase());
          if (!account) {
            clientErrors.push({ rowNumber, message: tStation("importExport.invalidAccount", { value: accountName }) });
            return;
          }
          commercialAccountId = account;
        }

        validRows.push({
          rowNumber,
          stationId,
          pumpId: pump.id,
          indexStart,
          indexEnd,
          eventAt: eventDate.toISOString(),
          priceAmount: price,
          currencyId,
          paymentMethod,
          commercialAccountId,
        });
      });

      let createdCount = 0;
      if (validRows.length > 0) {
        const response = await bulkImportSales(organizationId, validRows);
        createdCount = response.createdCount;
        clientErrors.push(...response.errors);
      }

      setImportSuccessCount(createdCount);
      if (clientErrors.length > 0) {
        setImportErrors(clientErrors.map((e) => tStation("importExport.invalidRow", { row: e.rowNumber, message: e.message })));
      }
      if (createdCount > 0) {
        void queryClient.invalidateQueries({ queryKey: salesQueryKey });
      }
    } catch (err) {
      setImportErrors([err instanceof Error ? err.message : tCommon("states.error")]);
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  const detectedContent = (
    <div className="flex flex-col gap-4">
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
            <Input type="datetime-local" aria-label={t("customFrom")} value={period.customFrom} onChange={(e) => period.setCustomFrom(e.target.value)} />
            <span className="text-text-muted">→</span>
            <Input type="datetime-local" aria-label={t("customTo")} value={period.customTo} onChange={(e) => period.setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      <Card>
        <CardSectionHeader title={tStation("byTankDrawdown")} />
        {loading && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <KpiSkeleton />
              <KpiSkeleton />
              <Skeleton className="h-6 w-24 rounded-pill" />
            </div>
            <table className="w-full border-collapse text-body-sm">
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={4} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        {data && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-caption text-text-muted">{t("stationModal.volumeSold")}</p>
                <p className="text-h4 font-semibold text-text">{formatLiters(data.volumeSoldLiters)} L</p>
              </div>
              <div>
                <p className="text-caption text-text-muted">{t("stationModal.monetaryValue")}</p>
                <p className="text-h4 font-semibold text-text">
                  {data.monetaryValue !== null && data.currencyCode ? formatMoney(format, data.monetaryValue, data.currencyCode) : "—"}
                </p>
                <CashReasonNote reason={data.monetaryValueNotCalculableReason} />
              </div>
              <CashConfidenceBadge confidence={data.confidence} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-caption font-semibold uppercase tracking-wide text-text-muted">
                    <th className="py-2 text-left">{t("stationModal.columns.productTank")}</th>
                    <th className="py-2 text-right">{t("stationModal.columns.volume")}</th>
                    <th className="py-2 text-right">{t("stationModal.columns.value")}</th>
                    <th className="py-2 text-left pl-4">{t("stationModal.columns.confidence")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <Fragment key={product.fuelProductId}>
                      <tr className="border-b border-border-subtle bg-surface-muted/60">
                        <td colSpan={4} className="py-2 font-semibold text-text">
                          {product.fuelProductName}
                        </td>
                      </tr>
                      {product.tanks.map((tank) => (
                        <tr
                          key={tank.tankId}
                          className="cursor-pointer border-b border-border-subtle/60 hover:bg-surface-muted"
                          onClick={() => setOpenTankId(tank.tankId)}
                        >
                          <td className="py-2 pl-4 text-text underline decoration-dotted">{tank.displayName}</td>
                          <td className="py-2 text-right tabular-nums text-text">
                            {tank.volumeSoldLiters !== null ? `${formatLiters(tank.volumeSoldLiters)} L` : "—"}
                          </td>
                          <td className="py-2 text-right tabular-nums text-text">
                            {tank.monetaryValue !== null && tank.currencyCode ? formatMoney(format, tank.monetaryValue, tank.currencyCode) : "—"}
                          </td>
                          <td className="py-2 pl-4">
                            <CashConfidenceBadge confidence={tank.confidence} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const declareContent = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="size-4" aria-hidden />
          {tStation("importExport.template")}
        </Button>
        <Button size="sm" variant="secondary" onClick={handleExportSales} disabled={sales.length === 0}>
          <Download className="size-4" aria-hidden />
          {tStation("importExport.export")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => importInputRef.current?.click()} loading={importing}>
          <Upload className="size-4" aria-hidden />
          {tStation("importExport.import")}
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportSalesFile(file);
          }}
        />
        <Button size="sm" onClick={() => setDeclareOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {tStation("declareButton")}
        </Button>
      </div>

      {importSuccessCount != null && importErrors.length === 0 && (
        <Alert tone="success">{tStation("importExport.successCount", { count: importSuccessCount })}</Alert>
      )}
      {importErrors.length > 0 && (
        <Alert tone="error">
          <p className="font-semibold">
            {importSuccessCount != null ? tStation("importExport.successCount", { count: importSuccessCount }) : null} {tStation("importExport.errorsTitle")}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {importErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}

      <PartStateBox state={salesState}>
        <Card>
          <CardSectionHeader title={tStation("declarationsTitle")} />
          {sales.length === 0 ? (
            <EmptyState icon={Receipt} title={tStation("empty")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{tStation("columns.pump")}</TableHeaderCell>
                  <TableHeaderCell>{tStation("columns.period")}</TableHeaderCell>
                  <TableHeaderCell>{tStation("columns.volume")}</TableHeaderCell>
                  <TableHeaderCell>{tStation("columns.value")}</TableHeaderCell>
                  <TableHeaderCell>{tStation("columns.paymentMethod")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => {
                  const currencyCode = currencies.find((c) => c.id === sale.currencyId)?.code ?? sale.currencyId;
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{pumpLabel(sale.pumpId)}</TableCell>
                      <TableCell>{format.dateTime(new Date(sale.eventAt), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                      <TableCell>{formatLiters(sale.quantityLiters)} L</TableCell>
                      <TableCell>{formatMoney(format, sale.priceAmount, currencyCode)}</TableCell>
                      <TableCell>{tPayment(sale.paymentMethod)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </PartStateBox>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{tStation("sourceNote")}</Alert>

      <Tabs
        variant="pills"
        defaultValue="detected"
        items={[
          { value: "detected", label: tStation("tabs.detected"), content: detectedContent },
          { value: "declare", label: tStation("tabs.declare"), content: declareContent },
        ]}
      />

      <TankCashModal
        open={openTankId !== null}
        onOpenChange={(next) => !next && setOpenTankId(null)}
        organizationId={organizationId}
        tankId={openTankId}
        fromDate={period.fromDate}
        toDate={period.toDate}
        mode={period.mode}
      />

      <SaleDeclarationModal
        organizationId={organizationId}
        stationId={stationId}
        pumps={pumps}
        tanks={tanks}
        open={declareOpen}
        onOpenChange={setDeclareOpen}
        onSaved={handleSaleSaved}
      />
    </div>
  );
}
