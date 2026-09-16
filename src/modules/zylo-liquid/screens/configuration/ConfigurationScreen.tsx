"use client";

import { Check, Layers, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { StationPicker } from "@/modules/zylo-liquid/components/StationPicker";
import type { PriceHistoryEntry } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { ComingSoonTabContent } from "@/modules/zylo-liquid/screens/settings/ComingSoonTabContent";
import { HolykellTab } from "@/modules/zylo-liquid/screens/settings/HolykellTab";
import { OrganisationTab } from "@/modules/zylo-liquid/screens/settings/OrganisationTab";
import { SystemeTab } from "@/modules/zylo-liquid/screens/settings/SystemeTab";
import { TrackingTab } from "@/modules/zylo-liquid/screens/settings/TrackingTab";
import { Alert, Badge, Button, Card, CardSkeleton, ColorPicker, EmptyState, FormField, Input, Select, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Tabs, TableRowSkeleton } from "@/shared/ui";

import { BulkPriceModal } from "./BulkPriceModal";
import { MissingConfigBanner, type MissingConfigItem } from "./MissingConfigBanner";
import { PriceHistoryBrowser } from "./PriceHistoryBrowser";
import { PriceNetworkGrid } from "./PriceNetworkGrid";
import { ProductStationsToggle } from "./ProductStationsToggle";
import { ThresholdsTab } from "./ThresholdsTab";
import { useFuelCatalog } from "./useFuelCatalog";
import { usePrices } from "./usePrices";
import { useStationFuelProducts } from "./useStationFuelProducts";

const TABS = ["prix", "carburants", "seuils", "organisation", "holykell", "tracking", "systeme", "notifications", "utilisateurs", "roles"] as const;

/** Centre de configuration métier du réseau — fusionne désormais "Paramètres"
 * (Bloc 5 de refonte-configuration-zylo-liquid.md, Phase 4 §5, décision du
 * commanditaire de fusionner plutôt que simplement clarifier) : Organisation,
 * Holykell et Système (constantes en lecture seule) sont les mêmes
 * composants que l'ancien SettingsScreen, jamais dupliqués. L'onglet
 * "Système" fictif qui existait ici avant la fusion (toujours vide,
 * doublon de nom avec le "Système" réel de Paramètres — Phase 1 §2.3) a été
 * supprimé au profit du seul vrai. "Rôles & permissions" reste "à venir" :
 * hors périmètre de cette mission (relève de processus-double-sources-verite). */
export default function ConfigurationScreen() {
  const t = useTranslations("zyloLiquid.configuration");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization, reload: reloadOrganization } = useOrganization();
  const data = useFuelCatalog(currentOrganization?.id ?? null);
  const prices = usePrices(currentOrganization?.id ?? null);
  const stationProducts = useStationFuelProducts(currentOrganization?.id ?? null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("carburants");

  const [priceStationId, setPriceStationIdRaw] = useState("");
  const [currencyOverride, setCurrencyOverride] = useState(false);
  function setPriceStationId(id: string) {
    setPriceStationIdRaw(id);
    setCurrencyOverride(false);
    setPriceCurrencyId("");
  }
  const [priceProductId, setPriceProductId] = useState("");
  const [priceCurrencyId, setPriceCurrencyId] = useState("");
  const [isNetworkDefault, setIsNetworkDefault] = useState(false);
  const [priceAmount, setPriceAmount] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 16));
  const [priceReason, setPriceReason] = useState("");
  const [creatingPrice, setCreatingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPreselect, setBulkPreselect] = useState<string[] | undefined>(undefined);

  const [editingPrice, setEditingPrice] = useState<PriceHistoryEntry | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Divulgation progressive (Phase 3 §5) : la grille réseau est la vue par
  // défaut, le formulaire manuel et l'historique brut restent disponibles
  // mais repliés — utiles pour un cas non couvert par l'édition en ligne
  // (première ligne d'un produit/devise jamais vue, prix planifié à une
  // date future).
  const [showManualForm, setShowManualForm] = useState(false);
  const [showHistoryBrowser, setShowHistoryBrowser] = useState(false);
  const [showRawHistory, setShowRawHistory] = useState(false);

  function formatMoney(value: number, currencyCode: string): string {
    try {
      return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 2 });
    } catch {
      return `${format.number(value, { maximumFractionDigits: 2 })} ${currencyCode}`;
    }
  }

  function openBulkModal(stationIds?: string[]) {
    setBulkPreselect(stationIds);
    setBulkOpen(true);
  }

  const selectedStation = !isNetworkDefault ? prices.stations.find((s) => s.id === priceStationId) ?? null : null;
  const autoCurrency = selectedStation ? prices.resolveStationCurrency(selectedStation) : null;
  const effectiveCurrencyId = priceCurrencyId || autoCurrency?.id || "";

  async function handleCreatePrice() {
    if ((!isNetworkDefault && !priceStationId) || !priceProductId || !priceAmount || (isNetworkDefault && !effectiveCurrencyId)) {
      setPriceError(t("fuelCatalog.codeRequired"));
      return;
    }
    setCreatingPrice(true);
    setPriceError(null);
    try {
      await prices.create({
        stationId: isNetworkDefault ? null : priceStationId,
        fuelProductId: priceProductId,
        priceAmount: Number(priceAmount),
        costAmount: costAmount ? Number(costAmount) : undefined,
        currencyId: effectiveCurrencyId || undefined,
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

  async function handleSaveEdit() {
    if (!editingPrice) return;
    setEditSaving(true);
    try {
      await prices.update(editingPrice.id, {
        priceAmount: editAmount ? Number(editAmount) : undefined,
        costAmount: editCost ? Number(editCost) : undefined,
      });
      setEditingPrice(null);
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setEditSaving(false);
    }
  }

  const [savingId, setSavingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDensity, setNewDensity] = useState("");
  const [newColor, setNewColor] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleSave(id: string, form: HTMLFormElement, color: string | null) {
    setSavingId(id);
    setFormError(null);
    try {
      const fd = new FormData(form);
      await data.update(id, {
        name: String(fd.get("name") ?? ""),
        densityGPerCm3: fd.get("density") ? Number(fd.get("density")) : undefined,
        displayColor: color ?? undefined,
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
        displayColor: newColor ?? undefined,
      });
      setNewName("");
      setNewCode("");
      setNewDensity("");
      setNewColor(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreating(false);
    }
  }

  // Configuration manquante (page_configuration.md §21-22) — calculée à
  // partir des données déjà chargées, aucun nouvel appel réseau.
  const missingItems: MissingConfigItem[] = useMemo(() => {
    const stationsWithoutGeo = prices.stations.filter((s) => prices.resolveStationCurrency(s) === null);

    const activeProductIdsByStation = new Map<string, Set<string>>();
    for (const tank of prices.tanks) {
      if (!tank.active) continue;
      const set = activeProductIdsByStation.get(tank.stationId) ?? new Set<string>();
      set.add(tank.fuelProductId);
      activeProductIdsByStation.set(tank.stationId, set);
    }
    // Un prix par défaut réseau (stationId null, audit Configuration
    // carburant P2 §E) couvre toute station qui n'a pas son propre prix
    // pour ce produit — indexé séparément (par produit seul) pour ne
    // jamais le confondre avec un prix propre à une station réelle.
    const latestNonFuture = new Map<string, PriceHistoryEntry>();
    const latestNetworkDefault = new Map<string, PriceHistoryEntry>();
    for (const p of prices.prices) {
      if (p.isFuture) continue;
      if (p.stationId === null) {
        const current = latestNetworkDefault.get(p.fuelProductId);
        if (!current || p.effectiveFrom > current.effectiveFrom) latestNetworkDefault.set(p.fuelProductId, p);
        continue;
      }
      const key = `${p.stationId}:${p.fuelProductId}`;
      const current = latestNonFuture.get(key);
      if (!current || p.effectiveFrom > current.effectiveFrom) latestNonFuture.set(key, p);
    }

    const stationsWithoutSellPrice = new Set<string>();
    const stationsWithoutCostPrice = new Set<string>();
    for (const [stationId, productIds] of activeProductIdsByStation) {
      for (const productId of productIds) {
        const entry = latestNonFuture.get(`${stationId}:${productId}`) ?? latestNetworkDefault.get(productId);
        if (!entry) stationsWithoutSellPrice.add(stationId);
        else if (entry.costAmount === null) stationsWithoutCostPrice.add(stationId);
      }
    }

    return [
      { key: "geo" as const, count: stationsWithoutGeo.length, onFix: () => openBulkModal(stationsWithoutGeo.map((s) => s.id)) },
      { key: "sellPrice" as const, count: stationsWithoutSellPrice.size, onFix: () => openBulkModal([...stationsWithoutSellPrice]) },
      { key: "costPrice" as const, count: stationsWithoutCostPrice.size, onFix: () => openBulkModal([...stationsWithoutCostPrice]) },
    ];
  }, [prices]);

  const pricesTab = (
    <Stack>
      <MissingConfigBanner items={missingItems} />
      <Alert tone="info">{t("prices.banner")}</Alert>
      {priceError && <Alert tone="error">{priceError}</Alert>}
      {prices.error && <Alert tone="error">{prices.error}</Alert>}

      {prices.loading ? (
        <Card padding="none">
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-40 w-full" variant="rectangular" />
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="flex items-start justify-between gap-4 p-5 pb-0">
            <div>
              <h2 className="text-h4 font-semibold text-text">{t("prices.gridTitle")}</h2>
              <p className="mt-1 text-body-sm text-text-muted">{t("prices.gridSubtitle")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => openBulkModal()}>
              <Layers className="size-4" aria-hidden />
              {t("prices.bulk.openButton")}
            </Button>
          </div>
          <div className="p-5">
            <PriceNetworkGrid
              prices={prices.prices}
              stations={prices.stations}
              cities={prices.cities}
              currencies={prices.currencies}
              fuelProducts={data.products}
              members={prices.members}
              resolveStationCurrency={prices.resolveStationCurrency}
              onCreatePrice={prices.create}
            />
          </div>
        </Card>
      )}

      <Button variant="link" size="sm" onClick={() => setShowManualForm((v) => !v)}>
        {showManualForm ? t("prices.hideManualForm") : t("prices.showManualForm")}
      </Button>

      {showManualForm && (
      <Card>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-h4 font-semibold text-text">{t("prices.addTitle")}</h2>
            <p className="mt-1 text-body-sm text-text-muted">{t("prices.addSubtitle")}</p>
          </div>
        </div>
        <label className="mb-3 flex items-center gap-2 text-body-sm text-text">
          <input
            type="checkbox"
            checked={isNetworkDefault}
            onChange={(e) => {
              setIsNetworkDefault(e.target.checked);
              setPriceStationId("");
            }}
          />
          {t("prices.networkDefaultToggle")}
        </label>
        {isNetworkDefault && <Alert tone="info">{t("prices.networkDefaultHint")}</Alert>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {!isNetworkDefault && (
            <FormField label={t("prices.station")}>
              {() => <StationPicker mode="single" stations={prices.stations} cities={prices.cities} value={priceStationId || null} onChange={setPriceStationId} />}
            </FormField>
          )}
          <FormField label={t("prices.product")}>
            {() => <Select aria-label={t("prices.product")} value={priceProductId || undefined} onValueChange={setPriceProductId} placeholder={t("prices.selectProduct")} options={data.products.map((p) => ({ value: p.id, label: p.name }))} />}
          </FormField>
          <FormField label={t("prices.currency")}>
            {() =>
              autoCurrency && !currencyOverride ? (
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{autoCurrency.code}</Badge>
                  <span className="text-caption text-text-muted">{t("prices.currencyAuto", { code: autoCurrency.code })}</span>
                  <Button type="button" variant="link" size="sm" onClick={() => setCurrencyOverride(true)}>
                    {t("prices.currencyChange")}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    aria-label={t("prices.currency")}
                    value={effectiveCurrencyId || undefined}
                    onValueChange={setPriceCurrencyId}
                    placeholder="—"
                    options={prices.currencies.map((c) => ({ value: c.id, label: c.code }))}
                  />
                  {autoCurrency && (
                    <Button type="button" variant="link" size="sm" onClick={() => { setCurrencyOverride(false); setPriceCurrencyId(""); }}>
                      {tCommon("actions.cancel")}
                    </Button>
                  )}
                </div>
              )
            }
          </FormField>
          {!autoCurrency && selectedStation && <Alert tone="warning">{t("prices.currencyUnresolved")}</Alert>}
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
      )}

      <Button variant="link" size="sm" onClick={() => setShowRawHistory((v) => !v)}>
        {showRawHistory ? t("prices.hideRawHistory") : t("prices.showRawHistory")}
      </Button>

      {showRawHistory && (prices.loading ? (
        <Card padding="none">
          <div className="flex flex-col gap-1 p-5">
            <Skeleton className="mb-2 h-5 w-1/4" />
            <table className="w-full">
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
                    <TableHeaderCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prices.prices.map((entry) => {
                    const station = prices.stations.find((s) => s.id === entry.stationId);
                    const product = data.products.find((p) => p.id === entry.fuelProductId);
                    const currency = prices.currencies.find((c) => c.id === entry.currencyId);
                    const code = currency?.code ?? "";
                    const isEditing = editingPrice?.id === entry.id;
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.stationId === null ? <Badge tone="info">{t("prices.networkDefaultBadge")}</Badge> : station?.name ?? "—"}</TableCell>
                        <TableCell>{product?.name ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {isEditing ? <Input type="number" step="1" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-24" /> : formatMoney(entry.priceAmount, code)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {isEditing ? (
                            <Input type="number" step="1" value={editCost} onChange={(e) => setEditCost(e.target.value)} className="w-24" />
                          ) : entry.costAmount === null ? (
                            "—"
                          ) : (
                            formatMoney(entry.costAmount, code)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{entry.costAmount === null ? "—" : formatMoney(entry.priceAmount - entry.costAmount, code)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {format.dateTime(new Date(entry.effectiveFrom), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {entry.isFuture && <Badge tone="warning">{t("prices.columns.future")}</Badge>}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="primary" loading={editSaving} onClick={handleSaveEdit}>
                                {tCommon("actions.save")}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingPrice(null)}>
                                {tCommon("actions.cancel")}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="link"
                              onClick={() => {
                                setEditingPrice(entry);
                                setEditAmount(String(entry.priceAmount));
                                setEditCost(entry.costAmount === null ? "" : String(entry.costAmount));
                              }}
                            >
                              {tCommon("actions.edit")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      ))}

      <Button variant="link" size="sm" onClick={() => setShowHistoryBrowser((v) => !v)}>
        {showHistoryBrowser ? t("prices.history.hide") : t("prices.history.show")}
      </Button>

      {showHistoryBrowser && (
        <Card>
          <div className="mb-4">
            <h2 className="text-h4 font-semibold text-text">{t("prices.history.title")}</h2>
            <p className="mt-1 text-body-sm text-text-muted">{t("prices.history.subtitle")}</p>
          </div>
          <PriceHistoryBrowser
            organizationId={currentOrganization?.id ?? ""}
            stations={prices.stations}
            cities={prices.cities}
            fuelProducts={data.products}
            currencies={prices.currencies}
            members={prices.members}
          />
        </Card>
      )}

      {currentOrganization && (
        <BulkPriceModal
          organizationId={currentOrganization.id}
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          stations={prices.stations}
          cities={prices.cities}
          fuelProducts={data.products}
          prices={prices.prices}
          resolveStationCurrency={prices.resolveStationCurrency}
          initialStationIds={bulkPreselect}
          onDone={prices.reload}
        />
      )}
    </Stack>
  );

  const fuelCatalogTab = (
    <Stack>
      <Alert tone="info">{t("fuelCatalog.banner")}</Alert>
      {formError && <Alert tone="error">{formError}</Alert>}
      {data.error && <Alert tone="error">{data.error}</Alert>}

      {data.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.products.map((product) => {
            let colorDraft: string | null = product.displayColor;
            return (
              <form
                key={product.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave(product.id, e.currentTarget, colorDraft);
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
                    <FormField label={t("fuelCatalog.color")}>
                      {() => <ColorPicker value={product.displayColor} onChange={(hex) => (colorDraft = hex)} reservedColorMessage={t("fuelCatalog.colorReserved")} aria-label={t("fuelCatalog.color")} />}
                    </FormField>
                  </div>
                  <ProductStationsToggle stations={prices.stations} cities={prices.cities} isActive={(stationId) => stationProducts.isActive(product.id, stationId)} onToggle={(stationId, active) => stationProducts.toggle(product.id, stationId, active)} />
                  <Button type="submit" size="sm" className="mt-3 w-full" disabled={savingId === product.id}>
                    <Check className="size-4" aria-hidden />
                    {t("fuelCatalog.save")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="mt-2 w-full" disabled={savingId === product.id} onClick={() => handleToggleActive(product.id, product.active)}>
                    {product.active ? t("fuelCatalog.deactivate") : t("fuelCatalog.reactivate")}
                  </Button>
                </Card>
              </form>
            );
          })}
        </div>
      )}

      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("fuelCatalog.addTitle")}</h2>
        <p className="mb-4 mt-1 text-body-sm text-text-muted">{t("fuelCatalog.addSubtitle")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("fuelCatalog.name")}>{(field) => <Input {...field} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("fuelCatalog.namePlaceholder")} />}</FormField>
          <FormField label={t("fuelCatalog.code")}>{(field) => <Input {...field} value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder={t("fuelCatalog.codePlaceholder")} maxLength={10} />}</FormField>
          <FormField label={t("fuelCatalog.density")}>{(field) => <Input {...field} type="number" step="0.0001" value={newDensity} onChange={(e) => setNewDensity(e.target.value)} placeholder="0.8400" />}</FormField>
        </div>
        <div className="mt-3">
          <FormField label={t("fuelCatalog.color")}>
            {() => <ColorPicker value={newColor} onChange={setNewColor} reservedColorMessage={t("fuelCatalog.colorReserved")} aria-label={t("fuelCatalog.color")} />}
          </FormField>
        </div>
        <Button className="mt-4" onClick={handleCreate} loading={creating}>
          <Plus className="size-4" aria-hidden />
          {t("fuelCatalog.create")}
        </Button>
      </Card>
    </Stack>
  );

  // Squelette de formulaire générique (organisation/organisation vide en
  // attendant `currentOrganization` — jamais un `PageSpinner` plein écran) :
  // quelques lignes de champ empilées, forme la plus proche des onglets
  // Organisation/Holykell/Système sans en connaître le détail exact.
  const settingsTabSkeleton = (
    <Card>
      <Skeleton className="mb-4 h-5 w-1/3" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-2/3" />
      </div>
    </Card>
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
          content:
            value === "prix" ? (
              pricesTab
            ) : value === "carburants" ? (
              fuelCatalogTab
            ) : value === "seuils" ? (
              <ThresholdsTab organizationId={currentOrganization?.id ?? ""} stations={prices.stations} tanks={prices.tanks} fuelProducts={data.products} onUpdated={prices.reload} />
            ) : value === "organisation" ? (
              currentOrganization ? <OrganisationTab organization={currentOrganization} onUpdated={reloadOrganization} /> : settingsTabSkeleton
            ) : value === "holykell" ? (
              currentOrganization ? <HolykellTab organizationId={currentOrganization.id} /> : settingsTabSkeleton
            ) : value === "tracking" ? (
              currentOrganization ? <TrackingTab organizationId={currentOrganization.id} /> : settingsTabSkeleton
            ) : value === "systeme" ? (
              currentOrganization ? <SystemeTab organizationId={currentOrganization.id} /> : settingsTabSkeleton
            ) : value === "notifications" ? (
              <ComingSoonTabContent note={t("comingSoonNotifications")} />
            ) : value === "utilisateurs" ? (
              <ComingSoonTabContent note={t("comingSoonUtilisateurs")} />
            ) : (
              <EmptyState title={tCommon("states.comingSoon")} />
            ),
        }))}
      />
    </Stack>
  );
}
