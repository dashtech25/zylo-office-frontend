"use client";

import { Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import type { PaymentMethod } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, PageHeader, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Tabs } from "@/shared/ui";
import { CardSkeleton, ListSkeleton } from "@/shared/ui/Skeleton";

import { useProduits } from "./useProduits";

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "orange_money", "mtn_momo", "bank_transfer", "cheque", "credit", "other"];

interface CartLine {
  sellableProductId: string;
  name: string;
  quantity: number;
  unitPriceAmount: number;
}

/** Produits & boutique (Blocs 4 corrigé/5 de la mission
 * « vente-maintenant-reglementation ») — catalogue, panier multi-lignes,
 * historique. `ProductSaleTransaction` est une entité volontairement
 * séparée de `Sale` (voir Journal des ventes carburant). */
export default function ProduitsScreen() {
  const t = useTranslations("zyloLiquid.produitsScreen");
  const tPay = useTranslations("zyloLiquid.ventesScreen");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useProduits(currentOrganization?.id ?? null);

  // Catalogue
  const [catStationId, setCatStationId] = useState("");
  const [catName, setCatName] = useState("");
  const [catSku, setCatSku] = useState("");
  const [catBarcode, setCatBarcode] = useState("");
  const [catCategory, setCatCategory] = useState("");
  const [catPrice, setCatPrice] = useState("");
  const [catCurrencyId, setCatCurrencyId] = useState("");
  const [catCreating, setCatCreating] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Vente comptoir
  const [saleStationId, setSaleStationId] = useState("");
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
      });
      setCatName("");
      setCatSku("");
      setCatBarcode("");
      setCatCategory("");
      setCatPrice("");
    } catch (err) {
      setCatError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCatCreating(false);
    }
  }

  function addToCart(productId: string) {
    const product = data.products.find((p) => p.id === productId);
    if (!product) return;
    const qty = Number(quantity) || 1;
    setCart((prev) => {
      const existing = prev.find((line) => line.sellableProductId === productId);
      if (existing) {
        return prev.map((line) => (line.sellableProductId === productId ? { ...line, quantity: line.quantity + qty } : line));
      }
      return [...prev, { sellableProductId: productId, name: product.name, quantity: qty, unitPriceAmount: product.unitPriceAmount }];
    });
    setSearch("");
    setQuantity("1");
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((line) => line.sellableProductId !== productId));
  }

  async function handleSubmitSale() {
    if (!saleStationId || cart.length === 0) {
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
        stationId: saleStationId,
        eventAt: new Date().toISOString(),
        currencyId: currency.id,
        paymentMethod,
        lines: cart.map((line) => ({ sellableProductId: line.sellableProductId, quantity: line.quantity, unitPriceAmount: line.unitPriceAmount })),
        commercialAccountId: paymentMethod === "credit" ? commercialAccountId : undefined,
      });
      setCart([]);
      setSaleSuccess(true);
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSaleSubmitting(false);
    }
  }

  const catalogTab = (
    <Stack>
      {catError && <Alert tone="error">{catError}</Alert>}
      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("catalog.form.title")}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("catalog.form.station")}>
            {() => <Select aria-label={t("catalog.form.station")} value={catStationId || undefined} onValueChange={setCatStationId} placeholder={t("catalog.form.selectStation")} options={data.stations.map((s) => ({ value: s.id, label: s.name }))} />}
          </FormField>
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
        </div>
        <Button className="mt-4" onClick={handleCreateProduct} loading={catCreating}>
          <Plus className="size-4" aria-hidden />
          {t("catalog.form.submit")}
        </Button>
      </Card>

      {data.products.length === 0 ? (
        <EmptyState icon={ShoppingBag} title={t("catalog.empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("catalog.table.name")}</TableHeaderCell>
              <TableHeaderCell>{t("catalog.table.category")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("catalog.table.price")}</TableHeaderCell>
              <TableHeaderCell>{t("catalog.table.scope")}</TableHeaderCell>
              <TableHeaderCell>{t("catalog.table.barcode")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.products.map((p) => {
              const currency = data.currencies.find((c) => c.id === p.currencyId);
              const station = data.stations.find((s) => s.id === p.stationId);
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.category ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {p.unitPriceAmount} {currency?.code ?? ""}
                  </TableCell>
                  <TableCell>{station?.name ?? t("catalog.scopeNetwork")}</TableCell>
                  <TableCell className="font-mono">{p.barcodeValue ?? "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Stack>
  );

  const saleTab = (
    <Stack>
      {saleError && <Alert tone="error">{saleError}</Alert>}
      {saleSuccess && <Alert tone="success">{t("sale.success")}</Alert>}
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("sale.station")}>
            {() => <Select aria-label={t("sale.station")} value={saleStationId || undefined} onValueChange={setSaleStationId} placeholder={t("sale.selectStation")} options={data.stations.map((s) => ({ value: s.id, label: s.name }))} />}
          </FormField>
          <FormField label={t("sale.searchPlaceholder")}>
            {(field) => <Input {...field} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("sale.searchPlaceholder")} />}
          </FormField>
          <FormField label={t("sale.quantity")}>
            {(field) => <Input {...field} type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />}
          </FormField>
        </div>
        {searchResults.length > 0 && (
          <Stack className="mt-2">
            {searchResults.map((p) => (
              <Button key={p.id} variant="secondary" onClick={() => addToCart(p.id)}>
                {p.name} — {p.unitPriceAmount}
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
          <TableHeaderCell>{t("history.table.station")}</TableHeaderCell>
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
              <TableCell>{station?.name ?? "—"}</TableCell>
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
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />
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
            { value: "history", label: t("tabs.history"), content: historyTab },
          ]}
        />
      )}
    </Stack>
  );
}
