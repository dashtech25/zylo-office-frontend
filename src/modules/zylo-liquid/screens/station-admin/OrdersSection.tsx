"use client";

import { Plus, RefreshCw, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, Modal, SearchableSelect, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useDeliveryFlow } from "../station-detail/useDeliveryFlow";

const STATUS_TONE = { open: "warning", received: "success" } as const;

/** Onglet « Commande » (mission « flux de livraison station », 2026-09-10)
 * — étape 1 du flux : le gérant (ou toute personne habilitée,
 * `PURCHASE_ORDER_MANAGE`) commande auprès d'un fournisseur déjà rattaché
 * à la station, sur une cuve déjà existante — jamais une saisie libre de
 * fournisseur ou de cuve (décision explicite du commanditaire : réutiliser
 * ce qui est déjà défini plutôt que de le ressaisir). Le produit est celui
 * de la cuve choisie (jamais un second champ, même règle que le backend). */
export function OrdersSection({ organizationId, station }: { organizationId: string; station: Station }) {
  const t = useTranslations("zyloLiquid.stationAdmin.orders");
  const tCommon = useTranslations("common");
  const data = useDeliveryFlow(organizationId, station.id);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = data.purchaseOrders.find((o) => o.id === selectedOrderId) ?? null;

  if (data.loading) return <PageSpinner label={tCommon("states.loading")} />;

  return (
    <div className="flex flex-col gap-4">
      {data.error && <Alert tone="error">{data.error}</Alert>}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h4 font-semibold text-text">{t("pageTitle")}</h2>
          <p className="text-body-sm text-text-muted">{t("pageSubtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} disabled={data.stationSuppliers.length === 0 || data.tanks.length === 0}>
          <Plus className="size-4" aria-hidden />
          {t("newOrder")}
        </Button>
      </div>

      {(data.stationSuppliers.length === 0 || data.tanks.length === 0) && (
        <Alert tone="warning">{t("prerequisiteHint")}</Alert>
      )}

      <Card padding="none">
        <div className="p-5">
          {data.purchaseOrders.length === 0 ? (
            <EmptyState icon={ShoppingCart} title={t("empty")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("table.reference")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.supplier")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.volume")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.orderedAt")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.expectedAt")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.purchaseOrders.map((order) => {
                  const tank = data.tanks.find((tk) => tk.id === order.tankId);
                  const supplier = data.stationSuppliers.find((s) => s.id === order.supplierId);
                  return (
                    <TableRow key={order.id} clickable onClick={() => setSelectedOrderId(order.id)}>
                      <TableCell className="font-medium text-text underline decoration-dotted">{order.orderReference}</TableCell>
                      <TableCell>{tank?.displayName ?? "—"}</TableCell>
                      <TableCell>{supplier?.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{order.orderedVolumeLiters.toLocaleString()} L</TableCell>
                      <TableCell className="text-text-muted">{new Date(order.orderedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-text-muted">{order.expectedAt ? new Date(order.expectedAt).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        <Badge tone={STATUS_TONE[order.status]}>{t(`status.${order.status}`)}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <OrderFormModal data={data} open={formOpen} onOpenChange={setFormOpen} />
      <OrderDetailModal
        data={data}
        order={selectedOrder}
        open={selectedOrder !== null}
        onOpenChange={(next) => { if (!next) setSelectedOrderId(null); }}
      />
    </div>
  );
}

function OrderDetailModal({
  data,
  order,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof useDeliveryFlow>;
  order: ReturnType<typeof useDeliveryFlow>["purchaseOrders"][number] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.orders.detail");
  const tOrders = useTranslations("zyloLiquid.stationAdmin.orders");
  const tCommon = useTranslations("common");

  if (!order) return null;

  const tank = data.tanks.find((tk) => tk.id === order.tankId);
  const fuelProduct = tank ? data.fuelProducts.find((fp) => fp.id === tank.fuelProductId) : undefined;
  const supplier = data.stationSuppliers.find((s) => s.id === order.supplierId);
  const tankState = tank ? data.tankStateById.get(tank.id) : undefined;
  const linkedDeliveries = data.declarations.filter((d) => d.purchaseOrderId === order.id);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={order.orderReference} closeLabel={tCommon("actions.close")} size="lg">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[order.status]}>{tOrders(`status.${order.status}`)}</Badge>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-body-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">{t("fuelProduct")}</dt><dd className="text-text">{fuelProduct?.name ?? "—"}</dd></div>
          <div><dt className="text-text-muted">{t("tank")}</dt><dd className="text-text">{tank?.displayName ?? "—"}</dd></div>
          <div><dt className="text-text-muted">{t("supplier")}</dt><dd className="text-text">{supplier?.name ?? "—"}</dd></div>
          <div><dt className="text-text-muted">{t("orderedVolume")}</dt><dd className="tabular-nums text-text">{order.orderedVolumeLiters.toLocaleString()} L</dd></div>
          <div><dt className="text-text-muted">{t("orderedAt")}</dt><dd className="text-text">{new Date(order.orderedAt).toLocaleString()}</dd></div>
          <div><dt className="text-text-muted">{t("expectedAt")}</dt><dd className="text-text">{order.expectedAt ? new Date(order.expectedAt).toLocaleDateString() : "—"}</dd></div>
          <div><dt className="text-text-muted">{t("tankCapacity")}</dt><dd className="tabular-nums text-text">{tank ? `${tank.capacityLiters.toLocaleString()} L` : "—"}</dd></div>
          <div>
            <dt className="text-text-muted">{t("tankAvailable")}</dt>
            <dd className="tabular-nums text-text">
              {tankState?.emptyVolumeLiters !== null && tankState?.emptyVolumeLiters !== undefined
                ? `${Math.round(tankState.emptyVolumeLiters).toLocaleString()} L`
                : t("unknown")}
            </dd>
          </div>
        </dl>

        <div>
          <p className="mb-2 text-body-sm font-semibold text-text">{t("linkedDeliveries")}</p>
          {linkedDeliveries.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("noLinkedDelivery")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {linkedDeliveries.map((delivery) => (
                <li key={delivery.id} className="flex items-center justify-between rounded-card border border-border-subtle px-3 py-2 text-body-sm">
                  <span className="text-text">{new Date(delivery.eventAt).toLocaleString()}</span>
                  <span className="tabular-nums text-text">{delivery.declaredVolumeLiters.toLocaleString()} L</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-border-subtle pt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{tCommon("actions.close")}</Button>
        </div>
      </div>
    </Modal>
  );
}

/** Génère une référence de commande unique et lisible
 * (`CMD-YYYYMMDD-XXXX`) — jamais imposée : le champ reste éditable à la
 * main, ce bouton ne fait que proposer une valeur (même principe qu'un
 * générateur de mot de passe). */
function generateOrderReference(): string {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus (0/O, 1/I)
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `CMD-${datePart}-${suffix}`;
}

/** Seuil de l'avertissement non bloquant (décision du commanditaire,
 * 2026-09-10) : au-delà de 90% de l'espace disponible, le volume saisi
 * reste accepté mais signalé — le blocage strict ne s'applique qu'au
 * dépassement réel de l'espace disponible. */
const CAPACITY_WARNING_RATIO = 0.9;

function OrderFormModal({
  data,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof useDeliveryFlow>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.orders.form");
  const tCommon = useTranslations("common");

  const [fuelProductId, setFuelProductId] = useState("");
  const [tankId, setTankId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [reference, setReference] = useState("");
  const [volume, setVolume] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Erreur de soumission (réseau/serveur) uniquement — l'erreur "champs
  // requis" est dérivée à chaque rendu (voir `missingRequired` plus bas),
  // jamais stockée telle quelle : sinon elle reste affichée à tort une
  // fois les champs corrigés, tant que l'utilisateur n'a pas re-cliqué
  // Enregistrer (bug signalé par le commanditaire, 2026-09-10).
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const tanksForProduct = useMemo(
    () => data.tanks.filter((tk) => tk.active && (!fuelProductId || tk.fuelProductId === fuelProductId)),
    [data.tanks, fuelProductId]
  );
  const selectedTank = data.tanks.find((tk) => tk.id === tankId);
  const selectedTankState = selectedTank ? data.tankStateById.get(selectedTank.id) : undefined;
  const availableLiters = selectedTankState?.emptyVolumeLiters ?? null;

  const volumeNumber = volume ? Number(volume) : null;
  const exceedsCapacity = availableLiters !== null && volumeNumber !== null && volumeNumber > availableLiters;
  const nearsCapacity =
    !exceedsCapacity && availableLiters !== null && availableLiters > 0 && volumeNumber !== null && volumeNumber >= availableLiters * CAPACITY_WARNING_RATIO;
  const missingRequired = !tankId || !supplierId || !reference || !volume;
  const displayError = attempted && missingRequired ? t("required") : exceedsCapacity ? t("exceedsCapacity") : submitError;

  function reset() {
    setFuelProductId("");
    setTankId("");
    setSupplierId("");
    setReference("");
    setVolume("");
    setExpectedAt("");
    setSubmitError(null);
    setAttempted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (missingRequired || exceedsCapacity) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await data.addPurchaseOrder({
        tankId,
        supplierId,
        orderReference: reference,
        orderedVolumeLiters: Number(volume),
        expectedAt: expectedAt || undefined,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t("title")}
      size="md"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>{tCommon("actions.cancel")}</Button>
          <Button size="sm" type="submit" form="order-form" loading={submitting} disabled={exceedsCapacity}>{tCommon("actions.save")}</Button>
        </>
      }
    >
      <form id="order-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {displayError && <Alert tone="error">{displayError}</Alert>}
        <FormField label={t("fuelProduct")}>
          {() => (
            <SearchableSelect
              aria-label={t("fuelProduct")}
              value={fuelProductId || undefined}
              onValueChange={(next) => {
                setFuelProductId(next);
                if (selectedTank && selectedTank.fuelProductId !== next) setTankId("");
              }}
              placeholder={t("selectFuelProduct")}
              searchPlaceholder={t("searchPlaceholder")}
              emptyLabel={t("noResult")}
              options={data.fuelProducts.map((fp) => ({ value: fp.id, label: fp.name }))}
            />
          )}
        </FormField>
        <FormField label={t("tank")}>
          {() => (
            <SearchableSelect
              aria-label={t("tank")}
              value={tankId || undefined}
              onValueChange={setTankId}
              placeholder={fuelProductId ? t("selectTank") : t("selectFuelProductFirst")}
              searchPlaceholder={t("searchPlaceholder")}
              emptyLabel={t("noResult")}
              disabled={!fuelProductId}
              options={tanksForProduct.map((tk) => {
                const state = data.tankStateById.get(tk.id);
                const fuelProductName = data.fuelProducts.find((fp) => fp.id === tk.fuelProductId)?.name ?? "";
                const capacity = `${tk.capacityLiters.toLocaleString()} L`;
                const available = state?.emptyVolumeLiters !== null && state?.emptyVolumeLiters !== undefined
                  ? t("availableSuffix", { volume: Math.round(state.emptyVolumeLiters).toLocaleString() })
                  : t("availableUnknown");
                return {
                  value: tk.id,
                  label: tk.displayName,
                  description: `${fuelProductName} · ${t("capacityPrefix")} ${capacity} · ${available}`,
                };
              })}
            />
          )}
        </FormField>
        {selectedTank && (
          <p className="text-caption text-text-muted">
            {t("tankContext", {
              capacity: selectedTank.capacityLiters.toLocaleString(),
              available: availableLiters !== null ? `${Math.round(availableLiters).toLocaleString()} L` : t("availableUnknown"),
            })}
          </p>
        )}
        <FormField label={t("supplier")}>
          {() => (
            <SearchableSelect
              aria-label={t("supplier")}
              value={supplierId || undefined}
              onValueChange={setSupplierId}
              placeholder={t("selectSupplier")}
              searchPlaceholder={t("searchPlaceholder")}
              emptyLabel={t("noResult")}
              options={data.stationSuppliers.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
        </FormField>
        <FormField label={t("reference")}>
          {(f) => (
            <Input
              {...f}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={t("referencePlaceholder")}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setReference(generateOrderReference())}
                  aria-label={t("generateReference")}
                  title={t("generateReference")}
                  className="pointer-events-auto rounded-button p-1 text-text-muted hover:bg-surface-muted hover:text-primary"
                >
                  <RefreshCw className="size-4" aria-hidden />
                </button>
              }
            />
          )}
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("volume")} error={exceedsCapacity ? t("exceedsCapacity") : undefined}>
            {(f) => <Input {...f} type="number" invalid={exceedsCapacity} value={volume} onChange={(e) => setVolume(e.target.value)} />}
          </FormField>
          <FormField label={t("expectedAt")}>{(f) => <Input {...f} type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />}</FormField>
        </div>
        {nearsCapacity && <Alert tone="warning">{t("nearsCapacityWarning")}</Alert>}
      </form>
    </Modal>
  );
}
