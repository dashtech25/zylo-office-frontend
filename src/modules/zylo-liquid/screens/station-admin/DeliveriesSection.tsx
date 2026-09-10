"use client";

import { File as FileIcon, Paperclip, Plus, Truck, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { listReconciliationRecords, type ReconciliationRecord, type Station, type ZyloDocument } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, Modal, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useDeliveryFlow } from "../station-detail/useDeliveryFlow";

const RECONCILIATION_TONE = { matched: "success", discrepancy: "error", pending: "warning", insufficient_data: "neutral" } as const;

/** Onglet « Livraison » (mission « flux de livraison station », 2026-09-10)
 * — étape 2 du flux : la personne habilitée à réceptionner
 * (`DELIVERY_DECLARATION_CREATE`, un droit distinct de celui de commander)
 * déclare la livraison reçue en la rattachant à une commande ouverte de
 * cette station — produit et fournisseur en découlent automatiquement
 * (jamais ressaisis), seuls le volume réellement livré et le code du bon
 * de livraison sont saisis. Le rapprochement avec la télémétrie (détection
 * automatique) se déclenche tout seul côté backend dès l'enregistrement —
 * rien à faire ici pour ça. */
export function DeliveriesSection({ organizationId, station }: { organizationId: string; station: Station }) {
  const t = useTranslations("zyloLiquid.stationAdmin.deliveries");
  const tCommon = useTranslations("common");
  const data = useDeliveryFlow(organizationId, station.id);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDeclarationId, setSelectedDeclarationId] = useState<string | null>(null);
  const selectedDeclaration = data.declarations.find((d) => d.id === selectedDeclarationId) ?? null;

  const openOrders = data.purchaseOrders.filter((o) => o.status === "open");

  if (data.loading) return <PageSpinner label={tCommon("states.loading")} />;

  return (
    <div className="flex flex-col gap-4">
      {data.error && <Alert tone="error">{data.error}</Alert>}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h4 font-semibold text-text">{t("pageTitle")}</h2>
          <p className="text-body-sm text-text-muted">{t("pageSubtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} disabled={openOrders.length === 0}>
          <Plus className="size-4" aria-hidden />
          {t("declareDelivery")}
        </Button>
      </div>

      {openOrders.length === 0 && <Alert tone="warning">{t("noOpenOrderHint")}</Alert>}

      <Card padding="none">
        <div className="p-5">
          {data.declarations.length === 0 ? (
            <EmptyState icon={Truck} title={t("empty")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("table.eventAt")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.order")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.volume")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.noteReference")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.declarations.map((declaration) => {
                  const order = data.purchaseOrders.find((o) => o.id === declaration.purchaseOrderId);
                  return (
                    <TableRow key={declaration.id} clickable onClick={() => setSelectedDeclarationId(declaration.id)}>
                      <TableCell className="text-text-muted underline decoration-dotted">{new Date(declaration.eventAt).toLocaleString()}</TableCell>
                      <TableCell className="font-medium text-text">{order?.orderReference ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{declaration.declaredVolumeLiters.toLocaleString()} L</TableCell>
                      <TableCell>{declaration.deliveryNoteReference ?? "—"}</TableCell>
                      <TableCell>
                        <Badge tone={declaration.lifecycleStatus === "locked" ? "neutral" : "info"}>{t(`lifecycle.${declaration.lifecycleStatus}`)}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <DeliveryFormModal data={data} openOrders={openOrders} open={formOpen} onOpenChange={setFormOpen} />
      <DeliveryDetailModal
        data={data}
        declaration={selectedDeclaration}
        open={selectedDeclaration !== null}
        onOpenChange={(next) => { if (!next) setSelectedDeclarationId(null); }}
      />
    </div>
  );
}

function DeliveryDetailModal({
  data,
  declaration,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof useDeliveryFlow>;
  declaration: ReturnType<typeof useDeliveryFlow>["declarations"][number] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.deliveries.detail");
  const tDeliveries = useTranslations("zyloLiquid.stationAdmin.deliveries");
  const tCommon = useTranslations("common");

  const [files, setFiles] = useState<ZyloDocument[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationRecord | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(false);

  useEffect(() => {
    if (!open || !declaration) return;
    let cancelled = false;
    setLoadingExtra(true);
    Promise.all([
      data.listDeliveryFiles(declaration.id),
      listReconciliationRecords(data.organizationId ?? "", { subjectType: "DeliveryDeclaration", subjectId: declaration.id, limit: 1 }).catch(() => ({ data: [] })),
    ])
      .then(([docs, recRes]) => {
        if (cancelled) return;
        setFiles(docs);
        setReconciliation((recRes.data[0] as ReconciliationRecord | undefined) ?? null);
      })
      .finally(() => { if (!cancelled) setLoadingExtra(false); });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, declaration?.id]);

  if (!declaration) return null;

  const order = data.purchaseOrders.find((o) => o.id === declaration.purchaseOrderId);
  const supplier = data.stationSuppliers.find((s) => s.id === declaration.supplierId);
  const fuelProduct = data.fuelProducts.find((fp) => fp.id === declaration.fuelProductId);

  async function handleDownload(fileId: string) {
    const url = await data.downloadDeliveryFile(fileId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("title")} closeLabel={tCommon("actions.close")} size="lg">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Badge tone={declaration.lifecycleStatus === "locked" ? "neutral" : "info"}>{tDeliveries(`lifecycle.${declaration.lifecycleStatus}`)}</Badge>
          {reconciliation && (
            <Badge tone={RECONCILIATION_TONE[reconciliation.status]}>{t(`reconciliation.${reconciliation.status}`)}</Badge>
          )}
        </div>

        <dl className="grid grid-cols-1 gap-3 text-body-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">{t("order")}</dt><dd className="text-text">{order?.orderReference ?? "—"}</dd></div>
          <div><dt className="text-text-muted">{t("fuelProduct")}</dt><dd className="text-text">{fuelProduct?.name ?? "—"}</dd></div>
          <div><dt className="text-text-muted">{t("supplier")}</dt><dd className="text-text">{supplier?.name ?? "—"}</dd></div>
          <div><dt className="text-text-muted">{t("eventAt")}</dt><dd className="text-text">{new Date(declaration.eventAt).toLocaleString()}</dd></div>
          <div><dt className="text-text-muted">{t("declaredVolume")}</dt><dd className="tabular-nums text-text">{declaration.declaredVolumeLiters.toLocaleString()} L</dd></div>
          <div><dt className="text-text-muted">{t("noteReference")}</dt><dd className="text-text">{declaration.deliveryNoteReference ?? "—"}</dd></div>
        </dl>

        {reconciliation && reconciliation.discrepancyValue !== null && (
          <p className="text-caption text-text-muted">
            {t("discrepancy", { value: Math.round(reconciliation.discrepancyValue).toLocaleString(), tolerance: reconciliation.toleranceApplied !== null ? Math.round(reconciliation.toleranceApplied).toLocaleString() : "—" })}
          </p>
        )}

        <div>
          <p className="mb-2 text-body-sm font-semibold text-text">{t("attachments")}</p>
          {loadingExtra ? (
            <p className="text-body-sm text-text-muted">{tCommon("states.loading")}</p>
          ) : files.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("noAttachment")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {files.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleDownload(f.id)}
                  className="flex items-center gap-2 rounded-card border border-border-subtle px-3 py-2 text-body-sm text-text hover:border-primary hover:text-primary"
                >
                  <FileIcon className="size-4" aria-hidden />
                  {f.fileName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border-subtle pt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{tCommon("actions.close")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function DeliveryFormModal({
  data,
  openOrders,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof useDeliveryFlow>;
  openOrders: ReturnType<typeof useDeliveryFlow>["purchaseOrders"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.deliveries.form");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [volume, setVolume] = useState("");
  const [noteReference, setNoteReference] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Erreur de soumission (réseau/serveur) uniquement — le message "champs
  // requis" est dérivé à chaque rendu, jamais stocké tel quel (même
  // correctif que le formulaire de commande, 2026-09-10 : sinon il reste
  // affiché même une fois les champs corrigés).
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const selectedOrder = openOrders.find((o) => o.id === purchaseOrderId);
  const selectedTank = selectedOrder ? data.tanks.find((tk) => tk.id === selectedOrder.tankId) : undefined;
  const missingRequired = !selectedOrder || !eventAt || !volume || !selectedTank;
  const displayError = attempted && missingRequired ? t("required") : submitError;

  function reset() {
    setPurchaseOrderId("");
    setEventAt("");
    setVolume("");
    setNoteReference("");
    setStagedFiles([]);
    setSubmitError(null);
    setAttempted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (missingRequired || !selectedOrder || !selectedTank) return;
    const tank = selectedTank;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const declaration = await data.declareDelivery({
        fuelProductId: tank.fuelProductId,
        eventAt,
        declaredVolumeLiters: Number(volume),
        supplierId: selectedOrder.supplierId,
        purchaseOrderId: selectedOrder.id,
        deliveryNoteReference: noteReference || undefined,
      });
      if (declaration && stagedFiles.length > 0) {
        await data.attachDeliveryFiles(declaration.id, stagedFiles);
      }
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
          <Button size="sm" type="submit" form="delivery-form" loading={submitting}>{tCommon("actions.save")}</Button>
        </>
      }
    >
      <form id="delivery-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {displayError && <Alert tone="error">{displayError}</Alert>}
        <FormField label={t("order")}>
          {() => (
            <Select
              aria-label={t("order")}
              value={purchaseOrderId || undefined}
              onValueChange={(value) => {
                setPurchaseOrderId(value);
                const order = openOrders.find((o) => o.id === value);
                if (order) setVolume(String(order.orderedVolumeLiters));
              }}
              placeholder={t("selectOrder")}
              options={openOrders.map((o) => ({ value: o.id, label: o.orderReference }))}
            />
          )}
        </FormField>
        <p className="text-caption text-text-muted">{t("orderHint")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("eventAt")}>{(f) => <Input {...f} type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} />}</FormField>
          <FormField label={t("volume")}>{(f) => <Input {...f} type="number" value={volume} onChange={(e) => setVolume(e.target.value)} />}</FormField>
        </div>
        <FormField label={t("noteReference")}>{(f) => <Input {...f} value={noteReference} onChange={(e) => setNoteReference(e.target.value)} placeholder={t("noteReferencePlaceholder")} />}</FormField>

        <div>
          <p className="mb-2 text-body-sm font-medium text-text">{t("attachments")}</p>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files && setStagedFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])} />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-card border-2 border-dashed border-border-subtle p-4 text-center text-body-sm text-text-muted transition-colors hover:border-primary"
          >
            <Upload className="size-5" aria-hidden />
            {t("dropZone")}
          </div>
          {stagedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {stagedFiles.map((file, i) => (
                <span key={`${file.name}-${i}`} className="flex items-center gap-1 rounded-pill border border-border-subtle px-2 py-1 text-caption text-text">
                  <Paperclip className="size-3" aria-hidden />
                  {file.name}
                  <button type="button" className="text-text-muted hover:text-error" onClick={() => setStagedFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
