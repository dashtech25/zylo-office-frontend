"use client";

import { Download, FileSpreadsheet, ImageIcon, Plus, ShoppingBag, Trash2, Upload } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

import { resolveStorageUrl, uploadFile } from "@/core/api/storage";
import { exportTable } from "@/core/api/exportTable";
import { parseXlsxFile } from "@/core/api/importTable";
import { ApiError } from "@/core/api/client";
import type { BulkImportSellableProductRow, PaymentMethod } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, Modal, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Tabs } from "@/shared/ui";
import { CardSkeleton, ListSkeleton } from "@/shared/ui/Skeleton";

import { useProduits } from "./useProduits";

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "orange_money", "mtn_momo", "bank_transfer", "cheque", "credit", "other"];

// Ordre et libellés du fichier XLSX d'import/export — contrat figé partagé
// entre le modèle téléchargeable, l'export et l'import (même tableau des
// deux côtés, jamais deux définitions divergentes).
const IMPORT_HEADERS = ["Nom", "SKU", "Code-barres", "Catégorie", "Prix unitaire", "Devise (code)", "Stock initial", "Seuil stock bas", "Station (nom, vide = réseau)"] as const;

interface CartLine {
  sellableProductId: string;
  name: string;
  quantity: number;
  unitPriceAmount: number;
  availableStock: number;
}

/** Cœur de la Boutique (catalogue + vente comptoir + historique), partagé
 * entre l'écran réseau `/zylo-liquid/produits` (aucune station fixée,
 * sélecteur de station visible) et la section « Boutique » de
 * `StationAdminCenter` (station fixée, sélecteur masqué) — jamais deux
 * implémentations du même flux (Phase 4 mission Boutique, décision
 * d'emplacement UI validée par le commanditaire). */
export function ShopWorkspace({ organizationId, fixedStationId }: { organizationId: string; fixedStationId?: string }) {
  const t = useTranslations("zyloLiquid.produitsScreen");
  const tPay = useTranslations("zyloLiquid.ventesScreen");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const data = useProduits(organizationId, fixedStationId ?? null);

  // Catalogue
  const [catStationId, setCatStationId] = useState(fixedStationId ?? "");
  const [catName, setCatName] = useState("");
  const [catSku, setCatSku] = useState("");
  const [catBarcode, setCatBarcode] = useState("");
  const [catCategory, setCatCategory] = useState("");
  const [catPrice, setCatPrice] = useState("");
  const [catCurrencyId, setCatCurrencyId] = useState("");
  const [catStock, setCatStock] = useState("0");
  const [catLowStockThreshold, setCatLowStockThreshold] = useState("");
  const [catImageRef, setCatImageRef] = useState<string | null>(null);
  const [catImagePreview, setCatImagePreview] = useState<string | null>(null);
  const [catImageUploading, setCatImageUploading] = useState(false);
  const [catCreating, setCatCreating] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Prix par station (édition inline sur une carte du catalogue)
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [priceAmountInput, setPriceAmountInput] = useState("");
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Import/export
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Vente comptoir
  const [saleStationId, setSaleStationId] = useState(fixedStationId ?? "");
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [commercialAccountId, setCommercialAccountId] = useState("");
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [saleSuccess, setSaleSuccess] = useState(false);

  const searchResults = useMemo(() => {
    if (!search) return [];
    const lower = search.toLowerCase();
    return data.products.filter(
      (p) => p.active && (p.name.toLowerCase().includes(lower) || p.sku?.toLowerCase().includes(lower) || p.barcodeValue === search)
    );
  }, [data.products, search]);

  const cartTotal = cart.reduce((sum, line) => sum + line.quantity * line.unitPriceAmount, 0);

  async function handleImageSelected(file: File) {
    setCatImageUploading(true);
    try {
      const uploaded = await uploadFile(organizationId, file);
      setCatImageRef(uploaded.storageReference);
      setCatImagePreview(URL.createObjectURL(file));
    } catch {
      // L'image reste optionnelle — un échec d'upload ne bloque jamais la
      // création du produit, juste pas d'image cette fois.
      setCatImageRef(null);
      setCatImagePreview(null);
    } finally {
      setCatImageUploading(false);
    }
  }

  async function handleCreateProduct() {
    if (!catName || !catPrice || !catCurrencyId) {
      setCatError(t("catalog.form.required"));
      return;
    }
    setCatCreating(true);
    setCatError(null);
    try {
      await data.addProduct({
        stationId: catStationId || undefined,
        name: catName,
        sku: catSku || undefined,
        barcodeValue: catBarcode || undefined,
        category: catCategory || undefined,
        unitPriceAmount: Number(catPrice),
        currencyId: catCurrencyId,
        stockQuantity: catStock ? Number(catStock) : 0,
        lowStockThreshold: catLowStockThreshold ? Number(catLowStockThreshold) : undefined,
        imageStorageReference: catImageRef ?? undefined,
      });
      setCatName("");
      setCatSku("");
      setCatBarcode("");
      setCatCategory("");
      setCatPrice("");
      setCatStock("0");
      setCatLowStockThreshold("");
      setCatImageRef(null);
      setCatImagePreview(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      setAddModalOpen(false);
    } catch (err) {
      setCatError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCatCreating(false);
    }
  }

  function closeAddModal() {
    setAddModalOpen(false);
    setCatError(null);
  }

  function startEditPrice(productId: string, currentAmount: number) {
    setEditingPriceProductId(productId);
    setPriceAmountInput(String(currentAmount));
    setPriceError(null);
  }

  async function handleSubmitPrice(productId: string, currencyId: string) {
    const amount = Number(priceAmountInput);
    if (!amount || amount <= 0) {
      setPriceError(t("catalog.price.amount"));
      return;
    }
    setPriceSubmitting(true);
    setPriceError(null);
    try {
      await data.setPrice(productId, {
        stationId: fixedStationId,
        priceAmount: amount,
        currencyId,
        effectiveFrom: new Date().toISOString(),
      });
      setEditingPriceProductId(null);
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setPriceSubmitting(false);
    }
  }

  function handleDownloadTemplate() {
    const example = ["Huile moteur 5W30 1L", "HM-5W30-1L", "", "Lubrifiants", "6500", data.currencies[0]?.code ?? "XAF", "20", "5", ""];
    void exportTable("xlsx", t("catalog.importExport.templateFilename"), [...IMPORT_HEADERS], [example], organizationId);
  }

  function handleExportCatalog() {
    const rows = data.products.map((p) => {
      const currency = data.currencies.find((c) => c.id === p.currencyId);
      const station = data.stations.find((s) => s.id === p.stationId);
      return [
        p.name,
        p.sku ?? "",
        p.barcodeValue ?? "",
        p.category ?? "",
        String(p.resolvedUnitPriceAmount ?? p.unitPriceAmount),
        currency?.code ?? "",
        String(p.stockQuantity),
        p.lowStockThreshold != null ? String(p.lowStockThreshold) : "",
        station?.name ?? "",
      ];
    });
    void exportTable("xlsx", t("catalog.importExport.exportFilename"), [...IMPORT_HEADERS], rows, organizationId);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportErrors([]);
    setImportSuccessCount(null);
    try {
      const rawRows = await parseXlsxFile(file, organizationId);
      if (rawRows.length === 0) {
        setImportErrors([t("catalog.importExport.invalidStructure", { headers: IMPORT_HEADERS.join(", ") })]);
        return;
      }
      const headerRow = rawRows[0].map((h) => h.trim());
      const headersMatch = IMPORT_HEADERS.length === headerRow.length && IMPORT_HEADERS.every((h, i) => h === headerRow[i]);
      if (!headersMatch) {
        setImportErrors([t("catalog.importExport.invalidStructure", { headers: IMPORT_HEADERS.join(", ") })]);
        return;
      }

      const currencyByCode = new Map(data.currencies.map((c) => [c.code.toLowerCase(), c.id]));
      const stationByName = new Map(data.stations.map((s) => [s.name.toLowerCase(), s.id]));
      const rows: BulkImportSellableProductRow[] = [];
      const clientErrors: string[] = [];

      rawRows.slice(1).forEach((cells, index) => {
        const rowNumber = index + 2;
        if (cells.every((c) => !c.trim())) return; // ligne vide ignorée, jamais une erreur
        const [name, sku, barcode, category, priceStr, currencyCode, stockStr, lowStockStr, stationName] = cells;
        if (!name?.trim()) {
          clientErrors.push(t("catalog.importExport.invalidRow", { row: rowNumber, message: t("catalog.importExport.missingName") }));
          return;
        }
        const price = Number(priceStr);
        if (!priceStr || Number.isNaN(price) || price <= 0) {
          clientErrors.push(t("catalog.importExport.invalidRow", { row: rowNumber, message: t("catalog.importExport.invalidPrice") }));
          return;
        }
        const currencyId = currencyCode ? currencyByCode.get(currencyCode.trim().toLowerCase()) : data.currencies[0]?.id;
        if (!currencyId) {
          clientErrors.push(t("catalog.importExport.invalidRow", { row: rowNumber, message: t("catalog.importExport.invalidCurrency", { value: currencyCode }) }));
          return;
        }
        let stationId: string | undefined = fixedStationId;
        if (!fixedStationId && stationName?.trim()) {
          const resolved = stationByName.get(stationName.trim().toLowerCase());
          if (!resolved) {
            clientErrors.push(t("catalog.importExport.invalidRow", { row: rowNumber, message: t("catalog.importExport.invalidStation", { value: stationName }) }));
            return;
          }
          stationId = resolved;
        }
        rows.push({
          rowNumber,
          stationId,
          name: name.trim(),
          sku: sku?.trim() || undefined,
          barcodeValue: barcode?.trim() || undefined,
          category: category?.trim() || undefined,
          unitPriceAmount: price,
          currencyId,
          stockQuantity: stockStr ? Number(stockStr) || 0 : 0,
          lowStockThreshold: lowStockStr ? Number(lowStockStr) || undefined : undefined,
        });
      });

      if (clientErrors.length > 0) {
        setImportErrors(clientErrors);
        return;
      }
      if (rows.length === 0) {
        setImportErrors([t("catalog.importExport.invalidStructure", { headers: IMPORT_HEADERS.join(", ") })]);
        return;
      }

      const result = await data.importProducts(rows);
      setImportSuccessCount(result.createdCount);
      if (result.errors.length > 0) {
        setImportErrors(result.errors.map((e) => t("catalog.importExport.invalidRow", { row: e.rowNumber, message: e.message })));
      }
    } catch (err) {
      setImportErrors([err instanceof Error ? err.message : tCommon("states.error")]);
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  function addToCart(productId: string) {
    const product = data.products.find((p) => p.id === productId);
    if (!product) return;
    const qty = Number(quantity) || 1;
    const unitPrice = product.resolvedUnitPriceAmount ?? product.unitPriceAmount;
    setCart((prev) => {
      const existing = prev.find((line) => line.sellableProductId === productId);
      const requested = (existing?.quantity ?? 0) + qty;
      if (requested > product.stockQuantity) {
        setSaleError(t("sale.insufficientStock"));
        return prev;
      }
      setSaleError(null);
      if (existing) {
        return prev.map((line) => (line.sellableProductId === productId ? { ...line, quantity: requested } : line));
      }
      return [...prev, { sellableProductId: productId, name: product.name, quantity: qty, unitPriceAmount: unitPrice, availableStock: product.stockQuantity }];
    });
    setSearch("");
    setQuantity("1");
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((line) => line.sellableProductId !== productId));
  }

  async function handleSubmitSale() {
    const stationId = fixedStationId ?? saleStationId;
    if (!stationId || cart.length === 0) {
      setSaleError(t("sale.error"));
      return;
    }
    if (paymentMethod === "credit" && !commercialAccountId) {
      setSaleError(t("sale.creditAccountRequired"));
      return;
    }
    const currency = data.currencies[0];
    if (!currency) return;
    setSaleSubmitting(true);
    setSaleError(null);
    setSaleSuccess(false);
    try {
      await data.submitSale({
        stationId,
        eventAt: new Date().toISOString(),
        currencyId: currency.id,
        paymentMethod,
        lines: cart.map((line) => ({ sellableProductId: line.sellableProductId, quantity: line.quantity, unitPriceAmount: line.unitPriceAmount })),
        commercialAccountId: paymentMethod === "credit" ? commercialAccountId : undefined,
      });
      setCart([]);
      setSaleSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "insufficient_stock") {
        setSaleError(t("sale.insufficientStock"));
      } else {
        setSaleError(err instanceof Error ? err.message : tCommon("states.error"));
      }
    } finally {
      setSaleSubmitting(false);
    }
  }

  const addProductModal = (
    <Modal
      open={addModalOpen}
      onOpenChange={(next) => {
        if (!next) closeAddModal();
      }}
      title={t("catalog.form.title")}
      size="lg"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={closeAddModal}>{tCommon("actions.cancel")}</Button>
          <Button size="sm" type="submit" form="add-product-form" loading={catCreating}>
            <Plus className="size-4" aria-hidden />
            {t("catalog.form.submit")}
          </Button>
        </>
      }
    >
      <form id="add-product-form" onSubmit={(e) => { e.preventDefault(); void handleCreateProduct(); }} className="flex flex-col gap-4">
        {catError && <Alert tone="error">{catError}</Alert>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {!fixedStationId && (
            <FormField label={t("catalog.form.station")}>
              {() => <Select aria-label={t("catalog.form.station")} value={catStationId || undefined} onValueChange={setCatStationId} placeholder={t("catalog.form.selectStation")} options={data.stations.map((s) => ({ value: s.id, label: s.name }))} />}
            </FormField>
          )}
          <FormField label={t("catalog.form.name")}>
            {(field) => <Input {...field} value={catName} onChange={(e) => setCatName(e.target.value)} />}
          </FormField>
          <FormField label={t("catalog.form.sku")}>
            {(field) => <Input {...field} value={catSku} onChange={(e) => setCatSku(e.target.value)} />}
          </FormField>
          <FormField label={t("catalog.form.barcode")}>
            {(field) => <Input {...field} value={catBarcode} onChange={(e) => setCatBarcode(e.target.value)} />}
          </FormField>
          <FormField label={t("catalog.form.category")}>
            {(field) => <Input {...field} value={catCategory} onChange={(e) => setCatCategory(e.target.value)} />}
          </FormField>
          <FormField label={t("catalog.form.price")}>
            {(field) => <Input {...field} type="number" step="1" value={catPrice} onChange={(e) => setCatPrice(e.target.value)} />}
          </FormField>
          <FormField label={t("catalog.form.currency")}>
            {() => <Select aria-label={t("catalog.form.currency")} value={catCurrencyId || undefined} onValueChange={setCatCurrencyId} placeholder="—" options={data.currencies.map((c) => ({ value: c.id, label: c.code }))} />}
          </FormField>
          <FormField label={t("catalog.form.stock")}>
            {(field) => <Input {...field} type="number" step="1" min="0" value={catStock} onChange={(e) => setCatStock(e.target.value)} />}
          </FormField>
          <FormField label={t("catalog.form.lowStockThreshold")}>
            {(field) => <Input {...field} type="number" step="1" min="0" value={catLowStockThreshold} onChange={(e) => setCatLowStockThreshold(e.target.value)} />}
          </FormField>
          <FormField label={t("catalog.form.image")}>
            {() => (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-card border border-dashed border-border-subtle bg-surface-muted/40 text-text-muted hover:border-primary"
                >
                  {catImagePreview ? <img src={catImagePreview} alt="" className="size-full object-cover" /> : <ImageIcon className="size-5" aria-hidden />}
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImageSelected(file);
                  }}
                />
                {catImageUploading && <span className="text-body-sm text-text-muted">{t("catalog.form.imageUploading")}</span>}
              </div>
            )}
          </FormField>
        </div>
      </form>
    </Modal>
  );

  const catalogTab = (
    <Stack>
      {addProductModal}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h4 font-semibold text-text">{t("tabs.catalog")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="size-4" aria-hidden />
              {t("catalog.form.submit")}
            </Button>
            <Button variant="secondary" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="size-4" aria-hidden />
              {t("catalog.importExport.template")}
            </Button>
            <Button variant="secondary" onClick={handleExportCatalog} disabled={data.products.length === 0}>
              <Download className="size-4" aria-hidden />
              {t("catalog.importExport.export")}
            </Button>
            <Button variant="secondary" onClick={() => importInputRef.current?.click()} loading={importing}>
              <Upload className="size-4" aria-hidden />
              {t("catalog.importExport.import")}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
              }}
            />
          </div>
        </div>
        {importSuccessCount != null && importErrors.length === 0 && (
          <Alert tone="success" className="mt-3">{t("catalog.importExport.successCount", { count: importSuccessCount })}</Alert>
        )}
        {importErrors.length > 0 && (
          <Alert tone="error" className="mt-3">
            <p className="font-semibold">{importSuccessCount != null ? t("catalog.importExport.successCount", { count: importSuccessCount }) : null} {t("catalog.importExport.errorsTitle")}</p>
            <ul className="mt-1 list-disc pl-5">
              {importErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Card>

      {data.products.length === 0 ? (
        <EmptyState icon={ShoppingBag} title={t("catalog.empty")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.products.map((p) => {
            const currency = data.currencies.find((c) => c.id === (p.resolvedCurrencyId ?? p.currencyId));
            const station = data.stations.find((s) => s.id === p.stationId);
            const isLow = p.lowStockThreshold != null && p.stockQuantity <= p.lowStockThreshold;
            const isOut = p.stockQuantity <= 0;
            const displayPrice = p.resolvedUnitPriceAmount ?? p.unitPriceAmount;
            const isNetworkDefaultPrice = fixedStationId != null && p.priceNotCalculableReason === "no_price_history_entry";
            return (
              <Card key={p.id} className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border-subtle bg-surface-muted/40">
                    {p.imageUrl ? (
                      <img src={resolveStorageUrl(p.imageUrl)} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageIcon className="size-6 text-text-muted" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-semibold text-text">{p.name}</p>
                    <p className="text-body-sm text-text-muted">{p.category ?? "—"}</p>
                    {!fixedStationId && <p className="text-body-sm text-text-muted">{station?.name ?? t("catalog.scopeNetwork")}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-mono text-h4 tabular-nums text-text">
                    {displayPrice} {currency?.code ?? ""}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-body-sm tabular-nums text-text-muted">{p.stockQuantity}</span>
                    {isOut ? <Badge tone="error">{t("catalog.outOfStock")}</Badge> : isLow ? <Badge tone="warning">{t("catalog.lowStock")}</Badge> : null}
                  </div>
                </div>
                {isNetworkDefaultPrice && <p className="text-body-sm text-text-muted">{t("catalog.price.networkDefaultBadge")}</p>}

                {fixedStationId && (
                  editingPriceProductId === p.id ? (
                    <div className="flex items-center gap-2">
                      <Input type="number" step="1" value={priceAmountInput} onChange={(e) => setPriceAmountInput(e.target.value)} className="w-28" />
                      <Button onClick={() => void handleSubmitPrice(p.id, p.resolvedCurrencyId ?? p.currencyId)} loading={priceSubmitting}>
                        {t("catalog.price.submit")}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" onClick={() => startEditPrice(p.id, displayPrice)}>
                      {t("catalog.price.resolvedLabel")}
                    </Button>
                  )
                )}
                {priceError && editingPriceProductId === p.id && <Alert tone="error">{priceError}</Alert>}

                <p className="font-mono text-body-sm text-text-muted">{p.barcodeValue ?? "—"}</p>
              </Card>
            );
          })}
        </div>
      )}
    </Stack>
  );

  const saleTab = (
    <Stack>
      {saleError && <Alert tone="error">{saleError}</Alert>}
      {saleSuccess && <Alert tone="success">{t("sale.success")}</Alert>}
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {!fixedStationId && (
            <FormField label={t("sale.station")}>
              {() => <Select aria-label={t("sale.station")} value={saleStationId || undefined} onValueChange={setSaleStationId} placeholder={t("sale.selectStation")} options={data.stations.map((s) => ({ value: s.id, label: s.name }))} />}
            </FormField>
          )}
          <FormField label={t("sale.searchPlaceholder")}>
            {(field) => <Input {...field} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("sale.searchPlaceholder")} autoFocus />}
          </FormField>
          <FormField label={t("sale.quantity")}>
            {(field) => <Input {...field} type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />}
          </FormField>
        </div>
        {searchResults.length > 0 && (
          <Stack className="mt-2">
            {searchResults.map((p) => (
              <Button key={p.id} variant="secondary" onClick={() => addToCart(p.id)} disabled={p.stockQuantity <= 0}>
                {p.name} — {p.resolvedUnitPriceAmount ?? p.unitPriceAmount} ({t("catalog.table.stock")}: {p.stockQuantity})
              </Button>
            ))}
          </Stack>
        )}
      </Card>

      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("sale.cart")}</h2>
        {cart.length === 0 ? (
          <p className="text-body-sm text-text-muted">{t("sale.empty")}</p>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("catalog.table.name")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("sale.quantity")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("catalog.table.price")}</TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.map((line) => (
                  <TableRow key={line.sellableProductId}>
                    <TableCell>{line.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{line.quantity}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{(line.quantity * line.unitPriceAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" onClick={() => removeFromCart(line.sellableProductId)} aria-label={t("sale.removeLine")}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-right text-h4 font-semibold text-text">
              {t("sale.total")}: {cartTotal.toFixed(2)}
            </p>
          </>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("sale.paymentMethod")}>
            {() => <Select aria-label={t("sale.paymentMethod")} value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} options={PAYMENT_METHODS.map((m) => ({ value: m, label: tPay(`paymentMethod.${m}`) }))} />}
          </FormField>
          {paymentMethod === "credit" && (
            <FormField label={t("sale.commercialAccount")}>
              {() => <Select aria-label={t("sale.commercialAccount")} value={commercialAccountId || undefined} onValueChange={setCommercialAccountId} placeholder={t("sale.selectAccount")} options={data.commercialAccounts.map((a) => ({ value: a.id, label: a.name }))} />}
            </FormField>
          )}
        </div>
        <Button className="mt-4" onClick={handleSubmitSale} loading={saleSubmitting} disabled={cart.length === 0}>
          {t("sale.submit")}
        </Button>
      </Card>
    </Stack>
  );

  const historyTab = data.transactions.length === 0 ? (
    <EmptyState icon={ShoppingBag} title={t("history.empty")} />
  ) : (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{t("history.table.date")}</TableHeaderCell>
          {!fixedStationId && <TableHeaderCell>{t("history.table.station")}</TableHeaderCell>}
          <TableHeaderCell className="text-right">{t("history.table.amount")}</TableHeaderCell>
          <TableHeaderCell>{t("history.table.paymentMethod")}</TableHeaderCell>
          <TableHeaderCell>{t("history.table.status")}</TableHeaderCell>
          <TableHeaderCell>{t("history.table.actions")}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.transactions.map((tx) => {
          const station = data.stations.find((s) => s.id === tx.stationId);
          const currency = data.currencies.find((c) => c.id === tx.currencyId);
          return (
            <TableRow key={tx.id}>
              <TableCell>{format.dateTime(new Date(tx.eventAt), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
              {!fixedStationId && <TableCell>{station?.name ?? "—"}</TableCell>}
              <TableCell className="text-right font-mono tabular-nums">
                {tx.totalAmount} {currency?.code ?? ""}
              </TableCell>
              <TableCell>{tx.paymentMethod}</TableCell>
              <TableCell>
                <Badge tone={tx.status === "cancelled" ? "error" : "success"}>{t(`history.status.${tx.status}`)}</Badge>
              </TableCell>
              <TableCell>
                {tx.status === "completed" && (
                  <Button variant="secondary" onClick={() => data.cancelSale(tx.id)}>
                    {t("history.cancel")}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <Stack>
      {data.error && <Alert tone="error">{data.error}</Alert>}
      {data.loading ? (
        <Stack>
          <CardSkeleton />
          <ListSkeleton rows={4} />
        </Stack>
      ) : (
        <Tabs
          items={[
            { value: "catalog", label: t("tabs.catalog"), content: catalogTab },
            { value: "sale", label: t("tabs.sale"), content: saleTab },
            {
              value: "history",
              label: (
                <span className="flex items-center gap-1.5">
                  {t("tabs.history")}
                  {data.transactions.length > 0 && <Badge tone="neutral">{data.transactions.length}</Badge>}
                </span>
              ),
              content: historyTab,
            },
          ]}
        />
      )}
    </Stack>
  );
}
