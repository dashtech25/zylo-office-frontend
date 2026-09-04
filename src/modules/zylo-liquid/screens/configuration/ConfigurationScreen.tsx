"use client";

import { Check, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Tabs } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useFuelCatalog } from "./useFuelCatalog";
import { usePrices } from "./usePrices";

const TABS = ["prix", "carburants", "seuils", "systeme", "orga", "roles"] as const;
const REAL_TABS: (typeof TABS)[number][] = ["prix", "carburants"];

/** Reproduit fidèlement les onglets "Catalogue carburants" et "Prix
 * carburant" de pageConfiguration() du prototype validé (prototype.html
 * ~L6107) — les seuls dont les champs correspondent à des données réelles
 * (endpoints 1 et 15, déjà en production). Différence assumée pour "Prix" :
 * le prototype montre un prix unique par produit, appliqué au réseau
 * entier ; le modèle réel (`PriceHistory`) est par station + produit +
 * période, avec devise résolue par station — reproduire un prix "global"
 * inventerait une donnée qui n'existe pas. Le formulaire demande donc
 * explicitement la station, conforme au modèle réel.
 *
 * Les 4 autres onglets restent désactivés : "Seuils d'alerte"/
 * "Configuration réseau" du prototype sont des réglages globaux en
 * pourcentage qui n'existent pas au Niveau 1 (seuils réels en mm, par
 * cuve, saisis à la création — endpoint 3) ; "Organisation"/"Rôles &
 * permissions" relèvent du Core Zylo Office, pas de ce module. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
export default function ConfigurationScreen() {
  const t = useTranslations("zyloLiquid.configuration");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useFuelCatalog(currentOrganization?.id ?? null);
  const prices = usePrices(currentOrganization?.id ?? null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("carburants");

  const [priceStationId, setPriceStationId] = useState("");
  const [priceProductId, setPriceProductId] = useState("");
  const [priceCurrencyId, setPriceCurrencyId] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 16));
  const [priceReason, setPriceReason] = useState("");
  const [creatingPrice, setCreatingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  function formatMoney(value: number, currencyCode: string): string {
    try {
      return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 2 });
    } catch {
      return `${format.number(value, { maximumFractionDigits: 2 })} ${currencyCode}`;
    }
  }

  async function handleCreatePrice() {
    if (!priceStationId || !priceProductId || !priceAmount) {
      setPriceError(t("fuelCatalog.codeRequired"));
      return;
    }
    setCreatingPrice(true);
    setPriceError(null);
    try {
      await prices.create({
        stationId: priceStationId,
        fuelProductId: priceProductId,
        priceAmount: Number(priceAmount),
        costAmount: costAmount ? Number(costAmount) : undefined,
        currencyId: priceCurrencyId || undefined,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        changeReason: priceReason.trim() || undefined,
      });
      setPriceAmount("");
      setCostAmount("");
      setPriceReason("");
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreatingPrice(false);
    }
  }
  const [savingId, setSavingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDensity, setNewDensity] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newColor, setNewColor] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleSave(id: string, form: HTMLFormElement) {
    setSavingId(id);
    setFormError(null);
    try {
      const fd = new FormData(form);
      await data.update(id, {
        name: String(fd.get("name") ?? ""),
        densityGPerCm3: fd.get("density") ? Number(fd.get("density")) : undefined,
        displayColor: String(fd.get("color") ?? "") || undefined,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    setSavingId(id);
    setFormError(null);
    try {
      await data.update(id, { active: !active });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newCode.trim()) {
      setFormError(t("fuelCatalog.codeRequired"));
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await data.create({
        name: newName.trim(),
        code: newCode.trim(),
        densityGPerCm3: newDensity ? Number(newDensity) : undefined,
        currentPriceFcfa: newPrice ? Number(newPrice) : undefined,
        currentCostFcfa: newCost ? Number(newCost) : undefined,
        displayColor: newColor.trim() || undefined,
      });
      setNewName("");
      setNewCode("");
      setNewDensity("");
      setNewPrice("");
      setNewCost("");
      setNewColor("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreating(false);
    }
  }

  const pricesTab = (
    <Stack>
      <Alert tone="info">{t("prices.banner")}</Alert>
      {priceError && <Alert tone="error">{priceError}</Alert>}
      {prices.error && <Alert tone="error">{prices.error}</Alert>}

      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("prices.addTitle")}</h2>
        <p className="mb-4 mt-1 text-body-sm text-text-muted">{t("prices.addSubtitle")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("prices.station")}>
            {() => <Select aria-label={t("prices.station")} value={priceStationId || undefined} onValueChange={setPriceStationId} placeholder={t("prices.selectStation")} options={prices.stations.map((s) => ({ value: s.id, label: s.name }))} />}
          </FormField>
          <FormField label={t("prices.product")}>
            {() => <Select aria-label={t("prices.product")} value={priceProductId || undefined} onValueChange={setPriceProductId} placeholder={t("prices.selectProduct")} options={data.products.map((p) => ({ value: p.id, label: p.name }))} />}
          </FormField>
          <FormField label={t("prices.currency")}>
            {() => <Select aria-label={t("prices.currency")} value={priceCurrencyId || undefined} onValueChange={setPriceCurrencyId} placeholder="—" options={prices.currencies.map((c) => ({ value: c.id, label: c.code }))} />}
          </FormField>
          <FormField label={t("prices.sellPrice")}>
            {(field) => <Input {...field} type="number" step="1" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />}
          </FormField>
          <FormField label={t("prices.costPrice")}>
            {(field) => <Input {...field} type="number" step="1" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} />}
          </FormField>
          <FormField label={t("prices.effectiveFrom")}>
            {(field) => <Input {...field} type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />}
          </FormField>
        </div>
        <div className="mt-3">
          <FormField label={t("prices.reason")}>
            {(field) => <Input {...field} value={priceReason} onChange={(e) => setPriceReason(e.target.value)} />}
          </FormField>
        </div>
        <Button className="mt-4" onClick={handleCreatePrice} loading={creatingPrice}>
          <Plus className="size-4" aria-hidden />
          {t("prices.create")}
        </Button>
      </Card>

      {prices.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : (
        <Card padding="none">
          <div className="flex flex-col gap-1 p-5 pb-0">
            <h2 className="text-h4 font-semibold text-text">{t("prices.historyTitle")}</h2>
            <p className="text-body-sm text-text-muted">{t("prices.historySubtitle")}</p>
          </div>
          {prices.prices.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t("prices.empty")} />
            </div>
          ) : (
            <div className="p-5">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("prices.columns.station")}</TableHeaderCell>
                    <TableHeaderCell>{t("prices.columns.product")}</TableHeaderCell>
                    <TableHeaderCell className="text-right">{t("prices.columns.price")}</TableHeaderCell>
                    <TableHeaderCell className="text-right">{t("prices.columns.cost")}</TableHeaderCell>
                    <TableHeaderCell className="text-right">{t("prices.columns.margin")}</TableHeaderCell>
                    <TableHeaderCell>{t("prices.columns.effectiveFrom")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prices.prices.map((entry) => {
                    const station = prices.stations.find((s) => s.id === entry.stationId);
                    const product = data.products.find((p) => p.id === entry.fuelProductId);
                    const currency = prices.currencies.find((c) => c.id === entry.currencyId);
                    const code = currency?.code ?? "";
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>{station?.name ?? "—"}</TableCell>
                        <TableCell>{product?.name ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatMoney(entry.priceAmount, code)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{entry.costAmount === null ? "—" : formatMoney(entry.costAmount, code)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{entry.costAmount === null ? "—" : formatMoney(entry.priceAmount - entry.costAmount, code)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {format.dateTime(new Date(entry.effectiveFrom), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {entry.isFuture && <Badge tone="warning">{t("prices.columns.future")}</Badge>}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </Stack>
  );

  const fuelCatalogTab = (
    <Stack>
      <Alert tone="info">{t("fuelCatalog.banner")}</Alert>
      {formError && <Alert tone="error">{formError}</Alert>}
      {data.error && <Alert tone="error">{data.error}</Alert>}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.products.map((product) => (
            <form
              key={product.id}
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(product.id, e.currentTarget);
              }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{product.name}</span>
                  <Badge tone={product.active ? "success" : "neutral"} dot>
                    {product.active ? t("fuelCatalog.statusActive") : t("fuelCatalog.statusInactive")}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  <FormField label={t("fuelCatalog.name")}>{(field) => <Input {...field} name="name" defaultValue={product.name} />}</FormField>
                  <FormField label={t("fuelCatalog.code")} hint={t("fuelCatalog.codeHint")}>
                    {(field) => <Input {...field} value={product.code} disabled />}
                  </FormField>
                  <FormField label={t("fuelCatalog.density")}>{(field) => <Input {...field} name="density" type="number" step="0.0001" defaultValue={product.densityGPerCm3 ?? ""} />}</FormField>
                  <FormField label={t("fuelCatalog.color")}>{(field) => <Input {...field} name="color" defaultValue={product.displayColor ?? ""} maxLength={7} />}</FormField>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3 text-body-sm">
                  <span className="text-text-muted">{t("fuelCatalog.currentPrice")}</span>
                  <span className="font-mono tabular-nums text-text">{product.currentPriceFcfa === null ? "—" : `${product.currentPriceFcfa} FCFA/L`}</span>
                </div>
                <Button type="submit" size="sm" className="mt-3 w-full" disabled={savingId === product.id}>
                  <Check className="size-4" aria-hidden />
                  {t("fuelCatalog.save")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="mt-2 w-full" disabled={savingId === product.id} onClick={() => handleToggleActive(product.id, product.active)}>
                  {product.active ? t("fuelCatalog.deactivate") : t("fuelCatalog.reactivate")}
                </Button>
              </Card>
            </form>
          ))}
        </div>
      )}

      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("fuelCatalog.addTitle")}</h2>
        <p className="mb-4 mt-1 text-body-sm text-text-muted">{t("fuelCatalog.addSubtitle")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("fuelCatalog.name")}>{(field) => <Input {...field} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("fuelCatalog.namePlaceholder")} />}</FormField>
          <FormField label={t("fuelCatalog.code")}>{(field) => <Input {...field} value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder={t("fuelCatalog.codePlaceholder")} maxLength={10} />}</FormField>
          <FormField label={t("fuelCatalog.density")}>{(field) => <Input {...field} type="number" step="0.0001" value={newDensity} onChange={(e) => setNewDensity(e.target.value)} placeholder="0.8400" />}</FormField>
          <FormField label={t("fuelCatalog.sellPrice")}>{(field) => <Input {...field} type="number" step="1" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />}</FormField>
          <FormField label={t("fuelCatalog.costPrice")}>{(field) => <Input {...field} type="number" step="1" value={newCost} onChange={(e) => setNewCost(e.target.value)} />}</FormField>
          <FormField label={t("fuelCatalog.color")}>{(field) => <Input {...field} value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="#1D4ED8" maxLength={7} />}</FormField>
        </div>
        <Button className="mt-4" onClick={handleCreate} loading={creating}>
          <Plus className="size-4" aria-hidden />
          {t("fuelCatalog.create")}
        </Button>
      </Card>
    </Stack>
  );

  return (
    <Stack>
      <h1 className="text-h1 font-semibold text-text">{t("pageTitle")}</h1>
      <p className="-mt-4 text-body-sm text-text-muted">{t("pageSubtitle")}</p>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as (typeof TABS)[number])}
        items={TABS.map((value) => ({
          value,
          label: t(`tabs.${value}`),
          content: !REAL_TABS.includes(value) ? <EmptyState title={tCommon("states.comingSoon")} /> : value === "prix" ? pricesTab : fuelCatalogTab,
        }))}
      />
    </Stack>
  );
}
