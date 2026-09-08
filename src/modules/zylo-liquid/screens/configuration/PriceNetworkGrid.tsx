"use client";

import { Check, ChevronRight, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { OrganizationMember } from "@/core/api/rbac";
import type { City, CreatePriceHistoryInput, Currency, FuelProduct, PriceHistoryEntry, Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, Input, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

/** Grille réseau produit × devise, avec navigation en drill-down (Réseau ->
 * Devise -> Station), édition en ligne et badges hérité/dérogation —
 * implémente les décisions de Phase 2 (architecture de l'information) et
 * Phase 3 (conception UX/UI) de refonte-configuration-zylo-liquid.md.
 * Reste agnostique de la source des données : reçoit tout en props,
 * délègue la persistance à `onCreatePrice` (toujours une nouvelle ligne
 * d'historique, jamais une réécriture — Phase 3 §7). */

type View = { level: "network" } | { level: "currency"; currencyId: string } | { level: "station"; stationId: string };

interface Props {
  prices: PriceHistoryEntry[];
  stations: Station[];
  cities: City[];
  currencies: Currency[];
  fuelProducts: FuelProduct[];
  members: OrganizationMember[];
  resolveStationCurrency: (station: Station) => Currency | null;
  onCreatePrice: (data: CreatePriceHistoryInput) => Promise<void>;
}

function latestNonFuture(rows: PriceHistoryEntry[]): PriceHistoryEntry | null {
  let best: PriceHistoryEntry | null = null;
  for (const row of rows) {
    if (row.isFuture) continue;
    if (!best || row.effectiveFrom > best.effectiveFrom) best = row;
  }
  return best;
}

export function PriceNetworkGrid({ prices, stations, cities, currencies, fuelProducts, members, resolveStationCurrency, onCreatePrice }: Props) {
  const t = useTranslations("zyloLiquid.configuration.prices.grid");
  const format = useFormatter();
  const [view, setView] = useState<View>({ level: "network" });

  const currencyById = useMemo(() => new Map(currencies.map((c) => [c.id, c])), [currencies]);
  const productById = useMemo(() => new Map(fuelProducts.map((p) => [p.id, p])), [fuelProducts]);
  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const cityById = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  function formatMoney(value: number, currencyCode: string): string {
    try {
      return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 2 });
    } catch {
      return `${format.number(value, { maximumFractionDigits: 2 })} ${currencyCode}`;
    }
  }

  function formatDate(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  // Devises réellement utilisées par le réseau (Phase 2 §7 : dérivées des
  // stations et prix réellement existants, jamais les ~170 devises du
  // référentiel global — Phase 3 §7, sélecteur de devises actives).
  const activeCurrencies = useMemo(() => {
    const ids = new Set<string>();
    for (const p of prices) ids.add(p.currencyId);
    return [...ids]
      .map((id) => currencyById.get(id))
      .filter((c): c is Currency => !!c)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [prices, currencyById]);

  const activeProducts = useMemo(() => fuelProducts.filter((p) => p.active), [fuelProducts]);

  function networkDefaultPrice(fuelProductId: string, currencyId: string): PriceHistoryEntry | null {
    return latestNonFuture(prices.filter((p) => p.stationId === null && p.fuelProductId === fuelProductId && p.currencyId === currencyId));
  }

  // Réplique côté client de `_resolve_applicable_price` (backend) : le prix
  // propre à la station prime toujours, repli sur le prix par défaut réseau
  // DANS SA DEVISE (Phase 4 §1) seulement s'il n'en a pas.
  function applicablePrice(station: Station, fuelProductId: string): { entry: PriceHistoryEntry; inherited: boolean } | null {
    const ownPrice = latestNonFuture(prices.filter((p) => p.stationId === station.id && p.fuelProductId === fuelProductId));
    if (ownPrice) return { entry: ownPrice, inherited: false };
    const currency = resolveStationCurrency(station);
    if (!currency) return null;
    const fallback = networkDefaultPrice(fuelProductId, currency.id);
    return fallback ? { entry: fallback, inherited: true } : null;
  }

  const [editing, setEditing] = useState<{ fuelProductId: string; currencyId: string; stationId: string | null } | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function startEdit(fuelProductId: string, currencyId: string, stationId: string | null, current: PriceHistoryEntry | null) {
    setEditing({ fuelProductId, currencyId, stationId });
    setEditAmount(current ? String(current.priceAmount) : "");
    setEditReason("");
    setSaveError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setSaveError(null);
  }

  async function confirmEdit() {
    if (!editing || !editAmount || !editReason.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Toujours une nouvelle ligne d'historique, jamais une réécriture de
      // l'existante (décision Phase 3 §7, cohérente avec le principe
      // d'historisation insert-only déjà en place côté backend).
      await onCreatePrice({
        stationId: editing.stationId,
        fuelProductId: editing.fuelProductId,
        currencyId: editing.currencyId,
        priceAmount: Number(editAmount),
        effectiveFrom: new Date().toISOString(),
        changeReason: editReason.trim(),
      });
      setEditing(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function isEditingCell(fuelProductId: string, currencyId: string, stationId: string | null): boolean {
    return editing?.fuelProductId === fuelProductId && editing?.currencyId === currencyId && editing?.stationId === stationId;
  }

  function EditCell({ fuelProductId, currencyId, stationId, current }: { fuelProductId: string; currencyId: string; stationId: string | null; current: PriceHistoryEntry | null }) {
    if (isEditingCell(fuelProductId, currencyId, stationId)) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Input type="number" step="1" autoFocus value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-24" aria-label={t("amountLabel")} />
            <Button size="sm" variant="primary" loading={saving} disabled={!editAmount || !editReason.trim()} onClick={confirmEdit} aria-label={t("confirm")}>
              <Check className="size-3.5" aria-hidden />
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit} aria-label={t("cancel")}>
              <X className="size-3.5" aria-hidden />
            </Button>
          </div>
          <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder={t("reasonPlaceholder")} className="w-48" />
        </div>
      );
    }
    return (
      <button
        type="button"
        className="rounded-input px-2 py-1 text-right font-mono tabular-nums hover:bg-surface-muted"
        onClick={() => startEdit(fuelProductId, currencyId, stationId, current)}
      >
        {current ? formatMoney(current.priceAmount, currencyById.get(currencyId)?.code ?? "") : <span className="text-text-muted">{t("emptyCell")}</span>}
      </button>
    );
  }

  function Breadcrumb() {
    const station = view.level === "station" ? stationById.get(view.stationId) : null;
    const currency = view.level === "currency" ? currencyById.get(view.currencyId) : station ? resolveStationCurrency(station) : null;
    return (
      <div className="flex flex-wrap items-center gap-1 text-body-sm text-text-muted">
        <button type="button" className={view.level === "network" ? "font-semibold text-text" : "hover:underline"} onClick={() => setView({ level: "network" })}>
          {t("breadcrumbNetwork")}
        </button>
        {currency && (
          <>
            <ChevronRight className="size-3.5" aria-hidden />
            <button type="button" className={view.level === "currency" ? "font-semibold text-text" : "hover:underline"} onClick={() => setView({ level: "currency", currencyId: currency.id })}>
              {currency.code}
            </button>
          </>
        )}
        {station && (
          <>
            <ChevronRight className="size-3.5" aria-hidden />
            <span className="font-semibold text-text">{station.name}</span>
          </>
        )}
      </div>
    );
  }

  // --- Niveau 1 : réseau (pivot produit × devise) ---
  function NetworkLevel() {
    if (activeProducts.length === 0) return <EmptyState title={t("noProducts")} />;
    if (activeCurrencies.length === 0) return <EmptyState title={t("noCurrencies")} description={t("noCurrenciesHint")} />;
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>{t("productColumn")}</TableHeaderCell>
            {activeCurrencies.map((currency) => (
              <TableHeaderCell key={currency.id} className="text-right">
                <button type="button" className="hover:underline" onClick={() => setView({ level: "currency", currencyId: currency.id })}>
                  {currency.code}
                </button>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {activeProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              {activeCurrencies.map((currency) => {
                const current = networkDefaultPrice(product.id, currency.id);
                return (
                  <TableCell key={currency.id} className="text-right">
                    <EditCell fuelProductId={product.id} currencyId={currency.id} stationId={null} current={current} />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  // --- Niveau 2 : regroupement par devise ---
  function CurrencyLevel({ currencyId }: { currencyId: string }) {
    const currency = currencyById.get(currencyId);
    const stationsInCurrency = useMemo(
      () => stations.filter((s) => resolveStationCurrency(s)?.id === currencyId).sort((a, b) => a.name.localeCompare(b.name)),
      [currencyId]
    );
    if (!currency) return null;
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-h4 font-semibold text-text">{t("networkDefaultTitle", { code: currency.code })}</h3>
              <p className="text-body-sm text-text-muted">{t("networkDefaultHint")}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeProducts.map((product) => {
              const current = networkDefaultPrice(product.id, currencyId);
              return (
                <div key={product.id} className="flex items-center justify-between rounded-input border border-border-subtle px-3 py-2">
                  <span className="text-body-sm text-text">{product.name}</span>
                  <EditCell fuelProductId={product.id} currencyId={currencyId} stationId={null} current={current} />
                </div>
              );
            })}
          </div>
        </Card>

        {stationsInCurrency.length === 0 ? (
          <EmptyState title={t("noStationsForCurrency")} />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("stationColumn")}</TableHeaderCell>
                {activeProducts.map((product) => (
                  <TableHeaderCell key={product.id} className="text-right">
                    {product.name}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {stationsInCurrency.map((station) => (
                <TableRow key={station.id} clickable onClick={() => setView({ level: "station", stationId: station.id })}>
                  <TableCell className="font-medium">{station.name}</TableCell>
                  {activeProducts.map((product) => {
                    const applicable = applicablePrice(station, product.id);
                    return (
                      <TableCell key={product.id} className="text-right">
                        {applicable ? (
                          <span className="flex items-center justify-end gap-1.5">
                            {formatMoney(applicable.entry.priceAmount, currency.code)}
                            <Badge tone={applicable.inherited ? "neutral" : "info"}>{applicable.inherited ? t("badgeInherited") : t("badgeOverride")}</Badge>
                          </span>
                        ) : (
                          <span className="text-text-muted">{t("emptyCell")}</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  }

  // --- Niveau 3 : fiche station (prix effectifs + historique complet) ---
  function StationLevel({ stationId }: { stationId: string }) {
    const station = stationById.get(stationId);
    const history = useMemo(
      () => [...prices.filter((p) => p.stationId === stationId)].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1)),
      [stationId]
    );
    if (!station) return null;
    const currency = resolveStationCurrency(station);
    const city = station.cityId ? cityById.get(station.cityId) : null;

    return (
      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="text-h4 font-semibold text-text">{station.name}</h3>
          <p className="text-body-sm text-text-muted">{city?.name ?? t("noCity")}</p>
          {!currency && <Alert tone="warning">{t("currencyUnresolvedStation")}</Alert>}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeProducts.map((product) => {
              const applicable = applicablePrice(station, product.id);
              return (
                <div key={product.id} className="flex flex-col gap-1 rounded-input border border-border-subtle px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm text-text">{product.name}</span>
                    {applicable && <Badge tone={applicable.inherited ? "neutral" : "info"}>{applicable.inherited ? t("badgeInherited") : t("badgeOverride")}</Badge>}
                  </div>
                  {currency ? (
                    <EditCell fuelProductId={product.id} currencyId={currency.id} stationId={stationId} current={applicable?.entry ?? null} />
                  ) : (
                    <span className="text-text-muted">{t("emptyCell")}</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding="none">
          <div className="flex flex-col gap-1 p-5 pb-0">
            <h3 className="text-h4 font-semibold text-text">{t("historyTitle")}</h3>
            <p className="text-body-sm text-text-muted">{t("historySubtitle")}</p>
          </div>
          {history.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t("noHistory")} />
            </div>
          ) : (
            <div className="p-5">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("historyColumns.effectiveFrom")}</TableHeaderCell>
                    <TableHeaderCell>{t("historyColumns.product")}</TableHeaderCell>
                    <TableHeaderCell className="text-right">{t("historyColumns.price")}</TableHeaderCell>
                    <TableHeaderCell>{t("historyColumns.by")}</TableHeaderCell>
                    <TableHeaderCell>{t("historyColumns.reason")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((entry) => {
                    const product = productById.get(entry.fuelProductId);
                    const entryCurrency = currencyById.get(entry.currencyId);
                    const author = memberById.get(entry.createdBy);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {formatDate(entry.effectiveFrom)}
                            {entry.isFuture && <Badge tone="warning">{t("futureBadge")}</Badge>}
                          </span>
                        </TableCell>
                        <TableCell>{product?.name ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatMoney(entry.priceAmount, entryCurrency?.code ?? "")}</TableCell>
                        <TableCell>{author?.fullName ?? t("unknownAuthor")}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.changeReason ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb />
      {saveError && <Alert tone="error">{saveError}</Alert>}
      {view.level === "network" && <NetworkLevel />}
      {view.level === "currency" && <CurrencyLevel currencyId={view.currencyId} />}
      {view.level === "station" && <StationLevel stationId={view.stationId} />}
    </div>
  );
}
