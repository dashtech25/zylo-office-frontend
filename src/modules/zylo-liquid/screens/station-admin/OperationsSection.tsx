"use client";

import { Droplet, Fuel, Gauge, Plus, Search, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, Input, Kpi, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { KpiSkeleton, ListSkeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";

import { useExploitation } from "../station-detail/useExploitation";
import { ProductDetailModal } from "../station-detail/ProductDetailModal";
import { ProductFormModal } from "../station-detail/ProductFormModal";

const STATUS_TONE = { normal: "success", attention: "warning", critique: "error", inconnu: "neutral" } as const;

/** Domaine « Exploitation » du Centre administratif — refonte complète
 * (mockup emalioration/, page Exploitation, 8 panneaux) : catalogue
 * carburants (stock agrégé depuis les cuves + seuils + prix courant,
 * jamais dupliqués — voir `useExploitation.ts`), services, politique
 * commerciale par produit, historique. Remplace l'ancienne version
 * (2 checkboxes produits + 4 checkboxes service). */
export function OperationsSection({ organizationId, station }: { organizationId: string; station: Station }) {
  const t = useTranslations("zyloLiquid.stationAdmin.operations");
  const data = useExploitation(organizationId, station.id);

  const [tab, setTab] = useState<"carburants" | "services" | "configuration" | "historique">("carburants");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    return data.products.filter((p) => {
      if (search && !p.fuelProductName.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [data.products, search, statusFilter]);

  const selectedProduct = data.products.find((p) => p.id === selectedProductId) ?? null;

  const totalStockLiters = data.products.reduce((sum, p) => sum + (p.currentVolumeLiters ?? 0), 0);
  const activeProductsCount = data.products.filter((p) => p.active).length;

  // Silhouette (skeleton) plutôt qu'un spinner plein écran — cet onglet du
  // Centre administratif est démonté/remonté à chaque bascule de section
  // (cf. `StationAdminCenter.tsx`), donc rechargé à chaque ouverture même
  // avec le cache React Query ; un skeleton qui reprend la forme réelle
  // (KPI + tableau) évite l'impression de « ça recharge tout » signalée sur
  // Configuration.
  if (data.loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
        <Card padding="none">
          <div className="p-5">
            <table className="w-full">
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-h4 font-semibold text-text">{t("pageTitle")}</h2>
        <p className="text-body-sm text-text-muted">{t("pageSubtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border-subtle">
        {(["carburants", "services", "configuration"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 px-3 py-2 text-body-sm font-medium ${tab === key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"}`}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTab("historique")}
          className={`border-b-2 px-3 py-2 text-body-sm font-medium ${tab === "historique" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"}`}
        >
          {t("tabs.historique")}
        </button>
      </div>

      {data.error && <Alert tone="error">{data.error}</Alert>}

      {tab === "carburants" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Fuel} label={t("kpis.productsAvailable")} value={activeProductsCount} />
            <Kpi icon={Gauge} label={t("kpis.activeLanes")} value={station.nbPistes ?? "—"} />
            <Kpi icon={Droplet} label={t("kpis.totalStock")} value={`${Math.round(totalStockLiters).toLocaleString()} L`} />
            <Kpi icon={Wrench} label={t("kpis.products")} value={data.products.length} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className="pl-8" />
            </div>
            <Select
              aria-label={t("filterStatus")}
              value={statusFilter || undefined}
              onValueChange={setStatusFilter}
              placeholder={t("filterStatus")}
              options={[
                { value: "", label: t("allStatuses") },
                { value: "normal", label: t("status.normal") },
                { value: "attention", label: t("status.attention") },
                { value: "critique", label: t("status.critique") },
                { value: "inconnu", label: t("status.inconnu") },
              ]}
            />
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" aria-hidden />
              {t("addProduct")}
            </Button>
          </div>

          <Card padding="none">
            <div className="p-5">
              {filteredProducts.length === 0 ? (
                <EmptyState icon={Fuel} title={t("empty")} />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t("table.product")}</TableHeaderCell>
                      <TableHeaderCell>{t("table.price")}</TableHeaderCell>
                      <TableHeaderCell>{t("table.stock")}</TableHeaderCell>
                      <TableHeaderCell>{t("table.capacity")}</TableHeaderCell>
                      <TableHeaderCell>{t("table.minThreshold")}</TableHeaderCell>
                      <TableHeaderCell>{t("table.criticalThreshold")}</TableHeaderCell>
                      <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProducts.map((p) => (
                      <TableRow key={p.id} clickable onClick={() => setSelectedProductId(p.id)}>
                        <TableCell className="font-medium text-text">
                          <span className="flex items-center gap-2">
                            {p.displayColor && <span className="size-2.5 rounded-full" style={{ background: p.displayColor }} />}
                            {p.fuelProductName}
                          </span>
                        </TableCell>
                        <TableCell>{p.currentPriceAmount !== null ? `${p.currentPriceAmount} ${p.currencyCode ?? ""}` : "—"}</TableCell>
                        <TableCell className="tabular-nums">{p.currentVolumeLiters !== null ? `${Math.round(p.currentVolumeLiters).toLocaleString()} L` : "—"}</TableCell>
                        <TableCell className="tabular-nums">{Math.round(p.capacityLiters).toLocaleString()} L</TableCell>
                        <TableCell className="tabular-nums">{p.minThresholdLiters !== null ? `${p.minThresholdLiters.toLocaleString()} L` : "—"}</TableCell>
                        <TableCell className="tabular-nums">{p.criticalThresholdLiters !== null ? `${p.criticalThresholdLiters.toLocaleString()} L` : "—"}</TableCell>
                        <TableCell>
                          <Badge tone={STATUS_TONE[p.status]}>{t(`status.${p.status}`)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === "services" && <ServicesTab data={data} />}

      {tab === "configuration" && <CommercialConfigTab data={data} />}

      {tab === "historique" && <HistoryTab data={data} />}

      {selectedProduct && (
        <ProductDetailModal
          organizationId={organizationId}
          station={station}
          product={selectedProduct}
          data={data}
          open={selectedProduct !== null}
          onOpenChange={(open) => { if (!open) setSelectedProductId(null); }}
        />
      )}

      <ProductFormModal data={data} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function ServicesTab({ data }: { data: ReturnType<typeof useExploitation> }) {
  const t = useTranslations("zyloLiquid.stationAdmin.operations");
  const tCommon = useTranslations("common");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await data.addService("autre", newLabel.trim());
      setNewLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex items-center justify-between">
        <h3 className="text-body-md font-semibold text-text">{t("servicesTitle")}</h3>
        <div className="flex items-center gap-2">
          <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={t("newServicePlaceholder")} className="w-56" />
          <Button size="sm" onClick={handleAdd} loading={adding}>
            <Plus className="size-4" aria-hidden />
            {t("addService")}
          </Button>
        </div>
      </div>

      {data.services.length === 0 ? (
        <EmptyState icon={Wrench} title={t("noServices")} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.services.map((service) => (
            <Card key={service.id} padding="sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text">{service.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={service.available}
                  onClick={() => data.toggleService(service.id, !service.available)}
                  className={`h-5 w-9 rounded-pill transition-colors ${service.available ? "bg-success" : "bg-surface-muted"}`}
                >
                  <span className={`block size-4 rounded-full bg-white transition-transform ${service.available ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              <p className="mt-1 text-caption text-text-muted">{service.available ? t("available") : t("unavailable")}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CommercialConfigTab({ data }: { data: ReturnType<typeof useExploitation> }) {
  const t = useTranslations("zyloLiquid.stationAdmin.operations");
  const tCommon = useTranslations("common");
  const [productId, setProductId] = useState(data.products[0]?.id ?? "");
  const [policyType, setPolicyType] = useState("prix_fixe");
  const [applicationPeriod, setApplicationPeriod] = useState("toujours_actif");
  const [promotionsEnabled, setPromotionsEnabled] = useState(false);
  const [differentPriceByPeriod, setDifferentPriceByPeriod] = useState(false);
  const [volumeDiscount, setVolumeDiscount] = useState(false);
  const [corporateRate, setCorporateRate] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = data.products.find((p) => p.id === productId);

  async function handleSelectProduct(id: string) {
    setProductId(id);
    setLoaded(false);
    const product = data.products.find((p) => p.id === id);
    if (!product) return;
    const policy = await data.fetchPolicy(product.fuelProductId);
    if (policy) {
      setPolicyType(policy.policyType);
      setApplicationPeriod(policy.applicationPeriod);
      setPromotionsEnabled(policy.promotionsEnabled);
      setDifferentPriceByPeriod(policy.differentPriceByPeriod);
      setVolumeDiscount(policy.volumeDiscount);
      setCorporateRate(policy.corporateRate);
    } else {
      setPolicyType("prix_fixe");
      setApplicationPeriod("toujours_actif");
      setPromotionsEnabled(false);
      setDifferentPriceByPeriod(false);
      setVolumeDiscount(false);
      setCorporateRate(false);
    }
    setLoaded(true);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await data.savePolicy(selected.fuelProductId, {
        policyType, applicationPeriod, promotionsEnabled, differentPriceByPeriod, volumeDiscount, corporateRate,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSaving(false);
    }
  }

  if (data.products.length === 0) return <EmptyState icon={Fuel} title={t("noProductsForPolicy")} />;

  return (
    <Card>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div>
          <p className="mb-1 text-body-sm font-medium text-text">{t("policy.product")}</p>
          <Select
            aria-label={t("policy.product")}
            value={productId || undefined}
            onValueChange={handleSelectProduct}
            options={data.products.map((p) => ({ value: p.id, label: p.fuelProductName }))}
          />
        </div>
        {(loaded || productId) && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-body-sm font-medium text-text">{t("policy.type")}</p>
                <Select
                  aria-label={t("policy.type")}
                  value={policyType}
                  onValueChange={setPolicyType}
                  options={[
                    { value: "prix_fixe", label: t("policy.typeFixed") },
                    { value: "variable", label: t("policy.typeVariable") },
                  ]}
                />
              </div>
              <div>
                <p className="mb-1 text-body-sm font-medium text-text">{t("policy.period")}</p>
                <Select
                  aria-label={t("policy.period")}
                  value={applicationPeriod}
                  onValueChange={setApplicationPeriod}
                  options={[
                    { value: "toujours_actif", label: t("policy.periodAlways") },
                    { value: "plage_dates", label: t("policy.periodRange") },
                  ]}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-body-sm text-text">
              <input type="checkbox" checked={promotionsEnabled} onChange={(e) => setPromotionsEnabled(e.target.checked)} />
              {t("policy.promotionsEnabled")}
            </label>

            <div>
              <p className="mb-2 text-body-sm font-semibold text-text">{t("policy.specialRulesTitle")}</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-body-sm text-text">
                  <input type="checkbox" checked={differentPriceByPeriod} onChange={(e) => setDifferentPriceByPeriod(e.target.checked)} />
                  {t("policy.differentPriceByPeriod")}
                </label>
                <label className="flex items-center gap-2 text-body-sm text-text">
                  <input type="checkbox" checked={volumeDiscount} onChange={(e) => setVolumeDiscount(e.target.checked)} />
                  {t("policy.volumeDiscount")}
                </label>
                <label className="flex items-center gap-2 text-body-sm text-text">
                  <input type="checkbox" checked={corporateRate} onChange={(e) => setCorporateRate(e.target.checked)} />
                  {t("policy.corporateRate")}
                </label>
              </div>
            </div>

            <Button size="sm" className="self-start" onClick={handleSave} loading={saving}>{tCommon("actions.save")}</Button>
          </>
        )}
      </div>
    </Card>
  );
}

function HistoryTab({ data }: { data: ReturnType<typeof useExploitation> }) {
  const t = useTranslations("zyloLiquid.stationAdmin.operations");
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof data.listHistory>> | null>(null);

  // `data.listHistory` n'est pas mémoïsée (comme le reste des actions de ce
  // hook, même convention que `useSuppliers.ts`) — un seul chargement à
  // l'ouverture de cet onglet, jamais dans le tableau de dépendances
  // (leçon retenue : une fonction non mémoïsée en dépendance provoque une
  // boucle de rendu infinie).
  useEffect(() => {
    let cancelled = false;
    data.listHistory().then((rows) => {
      if (!cancelled) setEntries(rows);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (entries === null) return <ListSkeleton rows={5} />;
  if (entries.length === 0) return <EmptyState title={t("noHistory")} />;

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{t("history.date")}</TableHeaderCell>
          <TableHeaderCell>{t("history.event")}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="tabular-nums text-text-muted">{new Date(entry.createdAt).toLocaleString()}</TableCell>
            <TableCell>{entry.summary}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
