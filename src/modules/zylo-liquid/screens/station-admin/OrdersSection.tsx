"use client";

import { Plus, RefreshCw, ShoppingCart, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { resolveStorageUrl } from "@/core/api/storage";
import { formatFreshness } from "@/shared/lib/formatDateTime";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import {
  assignTruckToPurchaseOrder, generatePurchaseOrderDocument, getDocumentDownloadUrl, listDocumentsByEntity, listTrucks, listTrucksForPurchaseOrder,
  unassignTruckFromPurchaseOrder, type Truck, type TruckOrderAssignment, type ZyloDocument, type Station,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import {
  Alert, Badge, Button, Card, EmptyState, FilePreviewModal, FormField, Input, Modal, SearchableSelect, ShareButton,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from "@/shared/ui";
import { TableRowSkeleton } from "@/shared/ui/Skeleton";

import { useDeliveryFlow } from "../station-detail/useDeliveryFlow";

const PURCHASE_ORDER_ENTITY_TYPE = "PurchaseOrder";

const STATUS_TONE = { open: "warning", partially_received: "info", received: "success" } as const;

/** Onglet « Commande » (mission « flux de livraison station », 2026-09-10)
 * — étape 1 du flux : le gérant (ou toute personne habilitée,
 * `PURCHASE_ORDER_MANAGE`) commande auprès d'un fournisseur déjà rattaché
 * à la station, un ou plusieurs produits — jamais une saisie libre de
 * fournisseur. Refonte 2026-09-17 (validée scénario par scénario avec le
 * commanditaire) : la cuve se choisit à la LIVRAISON, jamais à la commande
 * — un `PurchaseOrder` est désormais une en-tête portant plusieurs
 * `PurchaseOrderLine` (un produit + un volume + un statut par ligne), pour
 * représenter un camion compartimenté livrant plusieurs produits en une
 * seule visite. */
export function OrdersSection({ organizationId, station }: { organizationId: string; station: Station }) {
  const t = useTranslations("zyloLiquid.stationAdmin.orders");
  const format = useFormatter();
  const data = useDeliveryFlow(organizationId, station.id);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = data.purchaseOrders.find((o) => o.id === selectedOrderId) ?? null;

  // Silhouette de tableau plutôt qu'un spinner plein écran — cette section
  // est démontée/remontée à chaque bascule du Centre administratif (cf.
  // `StationAdminCenter.tsx`), donc rechargée à chaque ouverture même avec
  // le cache React Query de `useDeliveryFlow`.
  if (data.loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h4 font-semibold text-text">{t("pageTitle")}</h2>
            <p className="text-body-sm text-text-muted">{t("pageSubtitle")}</p>
          </div>
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
                  <TableHeaderCell>{t("table.products")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.supplier")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.volume")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.orderedAt")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.expectedAt")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.purchaseOrders.map((order) => {
                  const supplier = data.stationSuppliers.find((s) => s.id === order.supplierId);
                  const totalVolume = order.lines.reduce((sum, line) => sum + line.orderedVolumeLiters, 0);
                  const productsLabel = order.lines
                    .map((line) => data.fuelProducts.find((fp) => fp.id === line.fuelProductId)?.name ?? "—")
                    .join(", ");
                  return (
                    <TableRow key={order.id} clickable onClick={() => setSelectedOrderId(order.id)}>
                      <TableCell className="font-medium text-text underline decoration-dotted">{order.orderReference}</TableCell>
                      <TableCell>{productsLabel || "—"}</TableCell>
                      <TableCell>{supplier?.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{formatLiters(totalVolume)} L</TableCell>
                      <TableCell className="text-text-muted">{format.dateTime(new Date(order.orderedAt), { dateStyle: "long" })}</TableCell>
                      <TableCell className="text-text-muted">{order.expectedAt ? format.dateTime(new Date(order.expectedAt), { dateStyle: "long" }) : "—"}</TableCell>
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
  const format = useFormatter();
  const tDoc = useTranslations("zyloLiquid.stationAdmin.orders.detail.document");
  const tOrders = useTranslations("zyloLiquid.stationAdmin.orders");
  const tCommon = useTranslations("common");

  const [documents, setDocuments] = useState<ZyloDocument[]>([]);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  // Rattachement camion<->commande (mission « tracking », étape 2 —
  // scénario 8, validé avec le commanditaire) — plusieurs-à-plusieurs,
  // toujours optionnel, jamais requis pour créer/suivre une commande.
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [truckAssignments, setTruckAssignments] = useState<TruckOrderAssignment[]>([]);
  const [addingTruckId, setAddingTruckId] = useState("");
  const [truckActionBusy, setTruckActionBusy] = useState<string | null>(null);

  const organizationId = data.organizationId;

  useEffect(() => {
    if (!open || !order || !organizationId) {
      setDocuments([]);
      setDocUrls({});
      setTrucks([]);
      setTruckAssignments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const docs = await listDocumentsByEntity(organizationId, PURCHASE_ORDER_ENTITY_TYPE, order.id);
      if (cancelled) return;
      setDocuments(docs);
      const entries = await Promise.all(
        docs.map(async (doc) => {
          const { url } = await getDocumentDownloadUrl(organizationId, doc.id);
          return [doc.id, resolveStorageUrl(url)] as const;
        })
      );
      if (!cancelled) setDocUrls(Object.fromEntries(entries));

      const [trucksPage, assignments] = await Promise.all([
        listTrucks(organizationId, { limit: 100 }),
        listTrucksForPurchaseOrder(organizationId, order.id),
      ]);
      if (!cancelled) {
        setTrucks(trucksPage.data);
        setTruckAssignments(assignments);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id, organizationId]);

  async function reloadTruckAssignments() {
    if (!organizationId || !order) return;
    setTruckAssignments(await listTrucksForPurchaseOrder(organizationId, order.id));
  }

  async function handleAssignTruck() {
    if (!organizationId || !order || !addingTruckId) return;
    setTruckActionBusy(addingTruckId);
    try {
      await assignTruckToPurchaseOrder(organizationId, order.id, addingTruckId);
      setAddingTruckId("");
      await reloadTruckAssignments();
    } finally {
      setTruckActionBusy(null);
    }
  }

  async function handleUnassignTruck(truckId: string) {
    if (!organizationId || !order) return;
    setTruckActionBusy(truckId);
    try {
      await unassignTruckFromPurchaseOrder(organizationId, order.id, truckId);
      await reloadTruckAssignments();
    } finally {
      setTruckActionBusy(null);
    }
  }

  if (!order) return null;

  const supplier = data.stationSuppliers.find((s) => s.id === order.supplierId);
  const totalOrderedVolume = order.lines.reduce((sum, line) => sum + line.orderedVolumeLiters, 0);
  // Volume livré par ligne : somme des lignes de déclaration de livraison
  // dont `purchaseOrderLineId` référence cette ligne de commande — jamais
  // via un `purchaseOrderId` unique sur la déclaration (obsolète depuis la
  // refonte cuve-à-la-livraison, cf. commentaire de tête de fichier).
  const deliveredByLineId = new Map<string, number>();
  for (const declaration of data.declarations) {
    for (const line of declaration.lines) {
      if (!line.purchaseOrderLineId) continue;
      deliveredByLineId.set(line.purchaseOrderLineId, (deliveredByLineId.get(line.purchaseOrderLineId) ?? 0) + line.volumeLiters);
    }
  }
  const orderLineIds = new Set(order.lines.map((line) => line.id));
  const linkedDeliveries = data.declarations
    .map((declaration) => ({
      declaration,
      matchedVolume: declaration.lines
        .filter((line) => line.purchaseOrderLineId && orderLineIds.has(line.purchaseOrderLineId))
        .reduce((sum, line) => sum + line.volumeLiters, 0),
    }))
    .filter((entry) => entry.matchedVolume > 0);
  const previewDoc = documents.find((doc) => doc.id === previewDocId) ?? null;

  async function handleGenerate(format: "pdf" | "docx") {
    if (!order || !organizationId) return;
    setGenerating(format);
    try {
      const doc = await generatePurchaseOrderDocument(organizationId, order.id, format);
      const { url } = await getDocumentDownloadUrl(organizationId, doc.id);
      setDocuments((prev) => [doc, ...prev]);
      setDocUrls((prev) => ({ ...prev, [doc.id]: resolveStorageUrl(url) }));
    } finally {
      setGenerating(null);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={order.orderReference} closeLabel={tCommon("actions.close")} size="lg">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[order.status]}>{tOrders(`status.${order.status}`)}</Badge>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-body-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">{t("supplier")}</dt><dd className="text-text">{supplier?.name ?? "—"}</dd></div>
          <div><dt className="text-text-muted">{t("orderedVolume")}</dt><dd className="tabular-nums text-text">{formatLiters(totalOrderedVolume)} L</dd></div>
          <div><dt className="text-text-muted">{t("orderedAt")}</dt><dd className="text-text">{format.dateTime(new Date(order.orderedAt), { dateStyle: "long" })}</dd></div>
          <div><dt className="text-text-muted">{t("expectedAt")}</dt><dd className="text-text">{order.expectedAt ? format.dateTime(new Date(order.expectedAt), { dateStyle: "long" }) : "—"}</dd></div>
        </dl>

        <div>
          <p className="mb-2 text-body-sm font-semibold text-text">{t("lines")}</p>
          <ul className="flex flex-col gap-2">
            {order.lines.map((line) => {
              const fuelProduct = data.fuelProducts.find((fp) => fp.id === line.fuelProductId);
              const delivered = deliveredByLineId.get(line.id) ?? 0;
              return (
                <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border-subtle px-3 py-2 text-body-sm">
                  <span className="font-medium text-text">{fuelProduct?.name ?? "—"}</span>
                  <span className="tabular-nums text-text-muted">
                    {t("lineDelivered")}: {formatLiters(delivered)} / {formatLiters(line.orderedVolumeLiters)} L
                  </span>
                  <Badge tone={STATUS_TONE[line.status]}>{tOrders(`status.${line.status}`)}</Badge>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-body-sm font-semibold text-text">{t("linkedDeliveries")}</p>
          {linkedDeliveries.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("noLinkedDelivery")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {linkedDeliveries.map(({ declaration, matchedVolume }) => (
                <li key={declaration.id} className="flex items-center justify-between rounded-card border border-border-subtle px-3 py-2 text-body-sm">
                  <span className="text-text">{formatFreshness(declaration.eventAt, format)}</span>
                  <span className="tabular-nums text-text">{formatLiters(matchedVolume)} L</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 text-body-sm font-semibold text-text">{t("assignedTrucks")}</p>
          {truckAssignments.filter((a) => a.active).length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("noAssignedTruck")}</p>
          ) : (
            <ul className="mb-2 flex flex-col gap-2">
              {truckAssignments.filter((a) => a.active).map((assignment) => {
                const truck = trucks.find((tk) => tk.id === assignment.truckId);
                return (
                  <li key={assignment.id} className="flex items-center justify-between rounded-card border border-border-subtle px-3 py-2 text-body-sm">
                    <span className="text-text">{truck?.plateNumber ?? assignment.truckId}</span>
                    <Button variant="ghost" size="sm" loading={truckActionBusy === assignment.truckId} onClick={() => handleUnassignTruck(assignment.truckId)}>
                      {t("unassignTruck")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex gap-2">
            <SearchableSelect
              aria-label={t("assignedTrucks")}
              value={addingTruckId || undefined}
              onValueChange={setAddingTruckId}
              placeholder={t("selectTruckToAssign")}
              searchPlaceholder={tCommon("actions.search")}
              emptyLabel={tCommon("states.empty")}
              options={trucks
                .filter((tk) => !truckAssignments.some((a) => a.active && a.truckId === tk.id))
                .map((tk) => ({ value: tk.id, label: tk.plateNumber }))}
            />
            <Button variant="outline" size="sm" disabled={!addingTruckId} loading={truckActionBusy === addingTruckId} onClick={handleAssignTruck}>
              {t("assignTruck")}
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-body-sm font-semibold text-text">{tDoc("title")}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" loading={generating === "pdf"} disabled={generating !== null} onClick={() => handleGenerate("pdf")}>
                {tDoc("generatePdf")}
              </Button>
              <Button variant="outline" size="sm" loading={generating === "docx"} disabled={generating !== null} onClick={() => handleGenerate("docx")}>
                {tDoc("generateDocx")}
              </Button>
            </div>
          </div>
          {documents.length === 0 ? (
            <p className="text-body-sm text-text-muted">{tDoc("empty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 rounded-card border border-border-subtle px-3 py-2 text-body-sm">
                  <span className="truncate text-text">{doc.fileName}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setPreviewDocId(doc.id)}>{tDoc("preview")}</Button>
                    {docUrls[doc.id] && (
                      <ShareButton
                        fileUrl={docUrls[doc.id]}
                        fileName={doc.fileName}
                        mimeType={doc.mimeType}
                        label={tDoc("share")}
                        copyLinkLabel={tCommon("actions.copy")}
                        copiedLabel={tCommon("actions.copied")}
                        emailLabel={tDoc("shareEmail")}
                        whatsappLabel={tDoc("shareWhatsapp")}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-border-subtle pt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{tCommon("actions.close")}</Button>
        </div>
      </div>
      {previewDoc && docUrls[previewDoc.id] && (
        <FilePreviewModal
          open={previewDocId !== null}
          onOpenChange={(next) => { if (!next) setPreviewDocId(null); }}
          fileName={previewDoc.fileName}
          mimeType={previewDoc.mimeType}
          fileUrl={docUrls[previewDoc.id]}
          downloadLabel={tCommon("actions.download")}
          closeLabel={tCommon("actions.close")}
          unavailableLabel={tDoc("previewUnavailable")}
        />
      )}
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

interface OrderLineDraft {
  key: number;
  fuelProductId: string;
  volume: string;
}

let orderLineDraftSeq = 0;
function newOrderLineDraft(): OrderLineDraft {
  orderLineDraftSeq += 1;
  return { key: orderLineDraftSeq, fuelProductId: "", volume: "" };
}

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

  const [supplierId, setSupplierId] = useState("");
  const [reference, setReference] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [lines, setLines] = useState<OrderLineDraft[]>([newOrderLineDraft()]);
  const [submitting, setSubmitting] = useState(false);
  // Erreur de soumission (réseau/serveur) uniquement — l'erreur "champs
  // requis" est dérivée à chaque rendu (voir `missingRequired` plus bas),
  // jamais stockée telle quelle : sinon elle reste affichée à tort une
  // fois les champs corrigés, tant que l'utilisateur n'a pas re-cliqué
  // Enregistrer (bug signalé par le commanditaire, 2026-09-10).
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const validLines = lines.filter((line) => line.fuelProductId && Number(line.volume) > 0);
  const missingRequired = !supplierId || !reference || validLines.length === 0;
  const displayError = attempted && missingRequired ? t("required") : submitError;

  function reset() {
    setSupplierId("");
    setReference("");
    setExpectedAt("");
    setLines([newOrderLineDraft()]);
    setSubmitError(null);
    setAttempted(false);
  }

  function updateLine(key: number, patch: Partial<OrderLineDraft>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, newOrderLineDraft()]);
  }

  function removeLine(key: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.key !== key)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (missingRequired) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await data.addPurchaseOrder({
        supplierId,
        orderReference: reference,
        lines: validLines.map((line) => ({ fuelProductId: line.fuelProductId, orderedVolumeLiters: Number(line.volume) })),
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
          <Button size="sm" type="submit" form="order-form" loading={submitting}>{tCommon("actions.save")}</Button>
        </>
      }
    >
      <form id="order-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {displayError && <Alert tone="error">{displayError}</Alert>}
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

        {/* Refonte 2026-09-17 : une commande porte une ou plusieurs lignes
         * (une par produit), jamais une cuve unique — la cuve se choisit à
         * la livraison (camion compartimenté = plusieurs lignes, un seul
         * bon de commande). */}
        <div className="flex flex-col gap-3">
          <p className="text-body-sm font-semibold text-text">{t("lines")}</p>
          {lines.map((line) => (
            <div key={line.key} className="flex items-end gap-2">
              <div className="flex-1">
                <FormField label={t("lineFuelProduct")}>
                  {() => (
                    <SearchableSelect
                      aria-label={t("lineFuelProduct")}
                      value={line.fuelProductId || undefined}
                      onValueChange={(next) => updateLine(line.key, { fuelProductId: next })}
                      placeholder={t("selectFuelProduct")}
                      searchPlaceholder={t("searchPlaceholder")}
                      emptyLabel={t("noResult")}
                      options={data.fuelProducts.map((fp) => ({ value: fp.id, label: fp.name }))}
                    />
                  )}
                </FormField>
              </div>
              <div className="w-32">
                <FormField label={t("lineVolume")}>
                  {(f) => (
                    <Input
                      {...f}
                      type="number"
                      value={line.volume}
                      onChange={(e) => updateLine(line.key, { volume: e.target.value })}
                    />
                  )}
                </FormField>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("removeLine")}
                title={t("removeLine")}
                disabled={lines.length <= 1}
                onClick={() => removeLine(line.key)}
                className="mb-0.5"
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addLine} className="self-start">
            <Plus className="size-4" aria-hidden />
            {t("addLine")}
          </Button>
        </div>

        <FormField label={t("expectedAt")}>{(f) => <Input {...f} type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />}</FormField>
      </form>
    </Modal>
  );
}
