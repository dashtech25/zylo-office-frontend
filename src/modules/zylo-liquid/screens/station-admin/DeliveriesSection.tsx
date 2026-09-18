"use client";

import { File as FileIcon, Link2, Paperclip, Plus, RefreshCcw, Trash2, Truck, Upload } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  correctDeliveryDeclarationLines,
  listDeliveryDeclarationLineReconciliationCandidates,
  listReconciliationRecords,
  manuallyReconcileDeliveryDeclarationLine,
  type CorrectDeliveryDeclarationLineInput,
  type CreateDeliveryDeclarationLineInput,
  type Delivery,
  type DeliveryDeclaration,
  type DeliveryDeclarationLine,
  type DeliveryReconciliationCandidate,
  type PurchaseOrder,
  type PurchaseOrderLine,
  type ReconciliationRecord,
  type Station,
  type Tank,
  type ZyloDocument,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatDurationMinutes, formatFreshness } from "@/shared/lib/formatDateTime";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, Modal, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { Skeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";
import { Tabs } from "@/shared/ui/Tabs";

import { useDeliveryFlow } from "../station-detail/useDeliveryFlow";

// "not_reconciled" : une livraison détectée (ou une ligne de déclaration)
// sans aucun enregistrement de rapprochement pointant vers elle — ne
// préjuge pas d'une alerte `delivery_undeclared`, c'est un statut
// d'affichage honnête, pas une garantie qu'une alerte existe.
const RECONCILIATION_TONE = { matched: "success", discrepancy: "error", pending: "warning", insufficient_data: "neutral", not_reconciled: "neutral" } as const;
type ReconciliationTone = keyof typeof RECONCILIATION_TONE;

type OpenOrderLine = { order: PurchaseOrder; line: PurchaseOrderLine };

/** Récupère l'enregistrement de rapprochement le plus récent de chaque
 * LIGNE de déclaration (refonte 2026-09-17 : le rapprochement se fait
 * désormais par ligne/cuve, plus par déclaration entière — `subjectType`
 * est maintenant `"DeliveryDeclarationLine"`, `subjectId` l'id de la
 * ligne). Best-effort par ligne : une ligne dont le rapprochement échoue à
 * charger ne doit pas empêcher les autres de s'afficher (même stratégie
 * que `fetchReconciliationMaps` dans `useDeliveryFlow`, ici recentrée sur
 * la ligne puisque le hook partagé n'a pas encore été mis à jour). */
async function fetchLineReconciliationRecords(organizationId: string, lines: DeliveryDeclarationLine[]): Promise<Map<string, ReconciliationRecord>> {
  const byLineId = new Map<string, ReconciliationRecord>();
  await Promise.all(
    lines.map(async (line) => {
      try {
        const page = await listReconciliationRecords(organizationId, { subjectType: "DeliveryDeclarationLine", subjectId: line.id, limit: 1 });
        const record = page.data[0];
        if (record) byLineId.set(line.id, record);
      } catch {
        // best-effort — cf. commentaire ci-dessus
      }
    })
  );
  return byLineId;
}

function aggregateDeclarationStatus(declaration: DeliveryDeclaration, byLineId: Map<string, ReconciliationRecord>): ReconciliationTone {
  if (declaration.lines.length === 0) return "not_reconciled";
  const statuses = declaration.lines.map((line) => byLineId.get(line.id)?.status ?? "not_reconciled");
  if (statuses.includes("discrepancy")) return "discrepancy";
  if (statuses.includes("insufficient_data")) return "insufficient_data";
  if (statuses.includes("pending")) return "pending";
  if (statuses.every((s) => s === "matched")) return "matched";
  return "not_reconciled";
}

/** Rapprochement MANUEL, sens ligne déclarée -> détection (mission
 * « rapprochement manuel », 2026-09-17, validée scénario par scénario) —
 * la personne habilitée voit tous les candidats de la fenêtre (jamais un
 * choix silencieux comme l'automatique) et choisit elle-même. Un candidat
 * déjà utilisé par une autre ligne active est signalé explicitement ;
 * le choisir quand même exige une confirmation avant l'envoi
 * (`force: true`), jamais un partage silencieux d'une même détection. */
function ManualReconcileFromLineModal({
  organizationId,
  line,
  tankName,
  open,
  onOpenChange,
  onDone,
}: {
  organizationId: string;
  line: DeliveryDeclarationLine | null;
  tankName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.deliveries.reconcileModal");
  const format = useFormatter();
  const tCommon = useTranslations("common");
  const [candidates, setCandidates] = useState<DeliveryReconciliationCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !line) return;
    let cancelled = false;
    setLoading(true);
    setSelectedId(null);
    setConfirmOverride(false);
    setError(null);
    listDeliveryDeclarationLineReconciliationCandidates(organizationId, line.id)
      .then((result) => { if (!cancelled) setCandidates(result); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : tCommon("states.error")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, line?.id]);

  const selectedCandidate = candidates.find((c) => c.detected.id === selectedId) ?? null;
  const needsConfirmation = selectedCandidate?.alreadyReconciledWith != null;

  async function handleSubmit() {
    if (!line || !selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      await manuallyReconcileDeliveryDeclarationLine(organizationId, line.id, { detectedId: selectedId, force: needsConfirmation });
      onDone();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("title", { tank: tankName })}
      closeLabel={tCommon("actions.close")}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{tCommon("actions.cancel")}</Button>
          <Button size="sm" onClick={handleSubmit} loading={submitting} disabled={!selectedId || (needsConfirmation && !confirmOverride)}>
            {t("submit")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && <Alert tone="error">{error}</Alert>}
        {loading ? (
          <Skeleton className="h-32 w-full" variant="rectangular" />
        ) : candidates.length === 0 ? (
          <p className="text-body-sm text-text-muted">{t("noCandidates")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {candidates.map((candidate) => {
              const selected = selectedId === candidate.detected.id;
              return (
                <button
                  key={candidate.detected.id}
                  type="button"
                  onClick={() => { setSelectedId(candidate.detected.id); setConfirmOverride(false); }}
                  className={`flex flex-col gap-1 rounded-card border p-3 text-left transition-colors ${selected ? "border-primary bg-primary-muted/40" : "border-border-subtle hover:border-primary/50"}`}
                >
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="font-medium text-text">{formatFreshness(candidate.detected.startTime, format)}</span>
                    <span className="tabular-nums text-text-muted">{candidate.detected.volumeLiters !== null ? `${formatLiters(candidate.detected.volumeLiters)} L` : "—"}</span>
                  </div>
                  <span className="text-caption text-text-muted">{t("deltaMinutes", { duration: formatDurationMinutes(candidate.deltaMinutes) })}</span>
                  {candidate.alreadyReconciledWith && <Badge tone="warning" className="w-fit">{t("alreadyUsed")}</Badge>}
                </button>
              );
            })}
          </div>
        )}
        {needsConfirmation && (
          <label className="flex items-start gap-2 rounded-card border border-warning/40 bg-warning-muted/30 p-3 text-body-sm text-text">
            <input type="checkbox" checked={confirmOverride} onChange={(e) => setConfirmOverride(e.target.checked)} className="mt-0.5" />
            {t("confirmOverride")}
          </label>
        )}
      </div>
    </Modal>
  );
}

/** Même mécanisme, sens INVERSE : détection -> ligne déclarée (scénario 3/6,
 * demandé explicitement des deux côtés). Les candidats sont les lignes
 * ACTIVES (non supplantées) de cette station sur la même cuve — calculées
 * côté client (pas d'appel réseau dédié, réutilise `data.declarations` déjà
 * chargé), plutôt qu'un second endpoint symétrique côté backend. */
function ManualReconcileFromDetectedModal({
  organizationId,
  data,
  delivery,
  lineReconciliation,
  detectedAlreadyUsedByLineId,
  open,
  onOpenChange,
  onDone,
}: {
  organizationId: string;
  data: ReturnType<typeof useDeliveryFlow>;
  delivery: Delivery | null;
  lineReconciliation: Map<string, ReconciliationRecord>;
  detectedAlreadyUsedByLineId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.deliveries.reconcileModal");
  const format = useFormatter();
  const tCommon = useTranslations("common");
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedLineId(null);
    setConfirmOverride(false);
    setError(null);
  }, [open, delivery?.id]);

  if (!delivery) return null;

  const supersededLineIds = new Set(data.declarations.flatMap((d) => d.lines).map((l) => l.correctsLineId).filter((id): id is string => id !== null));
  const candidateLines = data.declarations
    .flatMap((declaration) => declaration.lines.map((line) => ({ declaration, line })))
    .filter(({ line }) => line.tankId === delivery.tankId && !supersededLineIds.has(line.id));

  const needsConfirmation = detectedAlreadyUsedByLineId !== null;

  async function handleSubmit() {
    if (!selectedLineId) return;
    setSubmitting(true);
    setError(null);
    try {
      await manuallyReconcileDeliveryDeclarationLine(organizationId, selectedLineId, { detectedId: delivery!.id, force: needsConfirmation });
      onDone();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("titleFromDetected")}
      closeLabel={tCommon("actions.close")}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{tCommon("actions.cancel")}</Button>
          <Button size="sm" onClick={handleSubmit} loading={submitting} disabled={!selectedLineId || (needsConfirmation && !confirmOverride)}>
            {t("submit")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && <Alert tone="error">{error}</Alert>}
        {needsConfirmation && (
          <Alert tone="warning">{t("detectedAlreadyUsed")}</Alert>
        )}
        {candidateLines.length === 0 ? (
          <p className="text-body-sm text-text-muted">{t("noCandidates")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {candidateLines.map(({ declaration, line }) => {
              const selected = selectedLineId === line.id;
              const status = lineReconciliation.get(line.id)?.status ?? "not_reconciled";
              return (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => setSelectedLineId(line.id)}
                  className={`flex items-center justify-between gap-3 rounded-card border p-3 text-left transition-colors ${selected ? "border-primary bg-primary-muted/40" : "border-border-subtle hover:border-primary/50"}`}
                >
                  <div className="flex flex-col gap-0.5 text-body-sm">
                    <span className="font-medium text-text">{formatFreshness(declaration.eventAt, format)}</span>
                    <span className="text-caption text-text-muted">{declaration.deliveryNoteReference ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-body-sm text-text-muted">{formatLiters(line.volumeLiters)} L</span>
                    <Badge tone={RECONCILIATION_TONE[status]}>{t(`currentStatus.${status}`)}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {needsConfirmation && (
          <label className="flex items-start gap-2 rounded-card border border-warning/40 bg-warning-muted/30 p-3 text-body-sm text-text">
            <input type="checkbox" checked={confirmOverride} onChange={(e) => setConfirmOverride(e.target.checked)} className="mt-0.5" />
            {t("confirmOverride")}
          </label>
        )}
      </div>
    </Modal>
  );
}

/** Onglet « Livraison » (mission « flux de livraison station », 2026-09-10,
 * refonte 2026-09-17 validée scénario par scénario avec le commanditaire) —
 * étape 2 du flux : la personne habilitée à réceptionner
 * (`DELIVERY_DECLARATION_CREATE`, un droit distinct de celui de commander)
 * déclare la livraison reçue, cuve par cuve (la cuve se choisit désormais à
 * la LIVRAISON, jamais à la commande — un même passage de camion peut
 * remplir plusieurs cuves et/ou plusieurs produits). Chaque ligne peut,
 * optionnellement, être rattachée à une ligne de commande ouverte — une
 * déclaration peut aussi n'en avoir aucune (livraison spot/urgence). Le
 * rapprochement avec la télémétrie se déclenche tout seul côté backend,
 * PAR LIGNE, dès l'enregistrement — rien à faire ici pour ça, sauf la
 * ré-évaluation manuelle proposée dans le détail. */
export function DeliveriesSection({ organizationId, station }: { organizationId: string; station: Station }) {
  const t = useTranslations("zyloLiquid.stationAdmin.deliveries");
  const format = useFormatter();
  const data = useDeliveryFlow(organizationId, station.id);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDeclarationId, setSelectedDeclarationId] = useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const selectedDeclaration = data.declarations.find((d) => d.id === selectedDeclarationId) ?? null;
  const selectedDelivery = data.deliveries.find((d) => d.id === selectedDeliveryId) ?? null;

  // Rapprochement manuel (mission « rapprochement manuel », 2026-09-17) —
  // un seul id sélectionné à la fois par sens, jamais les deux modales
  // ouvertes simultanément.
  const [reconcileLineId, setReconcileLineId] = useState<string | null>(null);
  const [reconcileDetectedId, setReconcileDetectedId] = useState<string | null>(null);

  // Toutes les lignes de commande encore ouvertes de cette station, tous
  // bons de commande confondus (une commande "partially_received" peut
  // encore avoir des lignes "open" — ex. Super livré, Gasoil attendu) :
  // c'est cette liste, filtrée par produit de la cuve choisie, qui alimente
  // le sélecteur "commande" optionnel de chaque ligne du formulaire.
  const openOrderLines: OpenOrderLine[] = data.purchaseOrders.flatMap((order) => order.lines.filter((line) => line.status === "open").map((line) => ({ order, line })));

  // Rapprochement par ligne, chargé en une passe pour toutes les
  // déclarations affichées dans le tableau (cf. commentaire de
  // `fetchLineReconciliationRecords` ci-dessus).
  const [lineReconciliation, setLineReconciliation] = useState<Map<string, ReconciliationRecord>>(new Map());
  useEffect(() => {
    if (!data.organizationId) return;
    const allLines = data.declarations.flatMap((d) => d.lines);
    if (allLines.length === 0) {
      setLineReconciliation(new Map());
      return;
    }
    let cancelled = false;
    fetchLineReconciliationRecords(data.organizationId, allLines).then((map) => {
      if (!cancelled) setLineReconciliation(map);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.organizationId, data.declarations]);

  const detectedReconciliationByDetectedId = new Map<string, ReconciliationRecord>();
  lineReconciliation.forEach((record) => {
    if (record.counterpartType === "DeliveryDetected" && record.counterpartId) detectedReconciliationByDetectedId.set(record.counterpartId, record);
  });

  // Toutes les lignes de toutes les déclarations, aplaties — la table
  // « Déclarée » affiche désormais une ligne par CUVE (pas par déclaration),
  // cohérent avec le fait que le rapprochement se fait par ligne (refonte
  // 2026-09-17). Une ligne déjà remplacée par une correction ciblée
  // (`correctsLineId` d'une autre ligne pointe vers elle) n'est jamais
  // proposée au rapprochement manuel — elle n'est plus la vérité active.
  const allDeclaredLines = data.declarations.flatMap((declaration) => declaration.lines.map((line) => ({ declaration, line })));
  const supersededLineIds = new Set(allDeclaredLines.map(({ line }) => line.correctsLineId).filter((id): id is string => id !== null));

  // Onglet « Rapprochées » (mission « rapprochement manuel », 2026-09-17,
  // validé avec le commanditaire) : uniquement les lignes pour lesquelles
  // un rapprochement a réellement comparé une déclaration à une détection —
  // "matched" (correspondance) ET "discrepancy" (écart) comptent, jamais
  // "pending"/"insufficient_data" (rien à comparer pour l'instant).
  const reconciledLines = allDeclaredLines
    .map(({ declaration, line }) => ({ declaration, line, record: lineReconciliation.get(line.id) }))
    .filter((entry): entry is { declaration: DeliveryDeclaration; line: DeliveryDeclarationLine; record: ReconciliationRecord } =>
      entry.record != null && (entry.record.status === "matched" || entry.record.status === "discrepancy")
    );

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
                  <TableRowSkeleton key={i} columns={5} />
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
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {t("declareDelivery")}
        </Button>
      </div>

      <Tabs
        items={[
          {
            value: "declared",
            label: t("tabs.declared"),
            content: (
              <Card padding="none">
                <div className="p-5">
                  {allDeclaredLines.length === 0 ? (
                    <EmptyState icon={Truck} title={t("empty")} />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>{t("table.eventAt")}</TableHeaderCell>
                          <TableHeaderCell>{t("table.tanks")}</TableHeaderCell>
                          <TableHeaderCell>{t("table.volume")}</TableHeaderCell>
                          <TableHeaderCell>{t("table.noteReference")}</TableHeaderCell>
                          <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                          <TableHeaderCell>{t("table.actions")}</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allDeclaredLines.map(({ declaration, line }) => {
                          const tankName = data.tanks.find((tk) => tk.id === line.tankId)?.displayName ?? "—";
                          const reconciliationStatus = lineReconciliation.get(line.id)?.status ?? "not_reconciled";
                          const superseded = supersededLineIds.has(line.id);
                          return (
                            <TableRow key={line.id}>
                              <TableCell className="cursor-pointer text-text-muted underline decoration-dotted" onClick={() => setSelectedDeclarationId(declaration.id)}>
                                {formatFreshness(declaration.eventAt, format)}
                              </TableCell>
                              <TableCell className="font-medium text-text">{tankName}</TableCell>
                              <TableCell className="tabular-nums">{formatLiters(line.volumeLiters)} L</TableCell>
                              <TableCell>{declaration.deliveryNoteReference ?? "—"}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Badge tone={RECONCILIATION_TONE[reconciliationStatus]}>{t(`detail.reconciliation.${reconciliationStatus}`)}</Badge>
                                  <Badge tone={declaration.lifecycleStatus === "locked" ? "neutral" : "info"}>{t(`lifecycle.${declaration.lifecycleStatus}`)}</Badge>
                                  {superseded && <Badge tone="neutral">{t("detail.line.corrected")}</Badge>}
                                </div>
                              </TableCell>
                              <TableCell>
                                {!superseded && (
                                  <Button variant="outline" size="sm" onClick={() => setReconcileLineId(line.id)}>
                                    <Link2 className="size-4" aria-hidden />
                                    {t("table.reconcileAction")}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </Card>
            ),
          },
          {
            value: "detected",
            label: t("tabs.detected"),
            content: (
              <Card padding="none">
                <div className="p-5">
                  {data.deliveries.length === 0 ? (
                    <EmptyState icon={Truck} title={t("emptyDetected")} />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>{t("detectedTable.startTime")}</TableHeaderCell>
                          <TableHeaderCell>{t("detectedTable.endTime")}</TableHeaderCell>
                          <TableHeaderCell>{t("detectedTable.volume")}</TableHeaderCell>
                          <TableHeaderCell>{t("detectedTable.status")}</TableHeaderCell>
                          <TableHeaderCell>{t("table.actions")}</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.deliveries.map((delivery) => {
                          const reconciliationStatus = detectedReconciliationByDetectedId.get(delivery.id)?.status ?? "not_reconciled";
                          return (
                            <TableRow key={delivery.id}>
                              <TableCell className="cursor-pointer text-text-muted underline decoration-dotted" onClick={() => setSelectedDeliveryId(delivery.id)}>
                                {formatFreshness(delivery.startTime, format)}
                              </TableCell>
                              <TableCell className="text-text-muted">{formatFreshness(delivery.endTime, format)}</TableCell>
                              <TableCell className="tabular-nums">{delivery.volumeLiters !== null ? `${formatLiters(delivery.volumeLiters)} L` : "—"}</TableCell>
                              <TableCell>
                                <Badge tone={RECONCILIATION_TONE[reconciliationStatus]}>{t(`detail.reconciliation.${reconciliationStatus}`)}</Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" onClick={() => setReconcileDetectedId(delivery.id)}>
                                  <Link2 className="size-4" aria-hidden />
                                  {t("table.reconcileAction")}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </Card>
            ),
          },
          {
            value: "reconciled",
            label: t("tabs.reconciled"),
            content: (
              <Card padding="none">
                <div className="p-5">
                  {reconciledLines.length === 0 ? (
                    <EmptyState icon={Truck} title={t("emptyReconciled")} />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>{t("table.eventAt")}</TableHeaderCell>
                          <TableHeaderCell>{t("table.tanks")}</TableHeaderCell>
                          <TableHeaderCell>{t("reconciledTable.declaredVolume")}</TableHeaderCell>
                          <TableHeaderCell>{t("reconciledTable.detectedVolume")}</TableHeaderCell>
                          <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reconciledLines.map(({ declaration, line, record }) => {
                          const tankName = data.tanks.find((tk) => tk.id === line.tankId)?.displayName ?? "—";
                          const detected = record.counterpartId ? data.deliveries.find((d) => d.id === record.counterpartId) : undefined;
                          return (
                            <TableRow key={line.id} clickable onClick={() => setSelectedDeclarationId(declaration.id)}>
                              <TableCell className="text-text-muted underline decoration-dotted">{formatFreshness(declaration.eventAt, format)}</TableCell>
                              <TableCell className="font-medium text-text">{tankName}</TableCell>
                              <TableCell className="tabular-nums">{formatLiters(line.volumeLiters)} L</TableCell>
                              <TableCell className="tabular-nums">{detected?.volumeLiters != null ? `${formatLiters(detected.volumeLiters)} L` : "—"}</TableCell>
                              <TableCell><Badge tone={RECONCILIATION_TONE[record.status as ReconciliationTone]}>{t(`detail.reconciliation.${record.status}`)}</Badge></TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </Card>
            ),
          },
        ]}
      />

      <DeliveryFormModal data={data} openOrderLines={openOrderLines} open={formOpen} onOpenChange={setFormOpen} />
      <DeliveryDetailModal
        data={data}
        declaration={selectedDeclaration}
        open={selectedDeclaration !== null}
        onOpenChange={(next) => { if (!next) setSelectedDeclarationId(null); }}
      />
      <DetectedDeliveryDetailModal
        data={data}
        delivery={selectedDelivery}
        reconciliationByDetectedId={detectedReconciliationByDetectedId}
        open={selectedDelivery !== null}
        onOpenChange={(next) => { if (!next) setSelectedDeliveryId(null); }}
        onOpenDeclaration={(declarationId) => {
          setSelectedDeliveryId(null);
          setSelectedDeclarationId(declarationId);
        }}
      />
      <ManualReconcileFromLineModal
        organizationId={data.organizationId ?? ""}
        line={allDeclaredLines.find((entry) => entry.line.id === reconcileLineId)?.line ?? null}
        tankName={data.tanks.find((tk) => tk.id === allDeclaredLines.find((entry) => entry.line.id === reconcileLineId)?.line.tankId)?.displayName ?? ""}
        open={reconcileLineId !== null}
        onOpenChange={(next) => { if (!next) setReconcileLineId(null); }}
        onDone={data.reload}
      />
      <ManualReconcileFromDetectedModal
        organizationId={data.organizationId ?? ""}
        data={data}
        delivery={data.deliveries.find((d) => d.id === reconcileDetectedId) ?? null}
        lineReconciliation={lineReconciliation}
        detectedAlreadyUsedByLineId={reconcileDetectedId ? detectedReconciliationByDetectedId.get(reconcileDetectedId)?.subjectId ?? null : null}
        open={reconcileDetectedId !== null}
        onOpenChange={(next) => { if (!next) setReconcileDetectedId(null); }}
        onDone={data.reload}
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
  declaration: DeliveryDeclaration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.deliveries.detail");
  const format = useFormatter();
  const tDeliveries = useTranslations("zyloLiquid.stationAdmin.deliveries");
  const tCommon = useTranslations("common");

  const [files, setFiles] = useState<ZyloDocument[]>([]);
  const [lineRecords, setLineRecords] = useState<Map<string, ReconciliationRecord>>(new Map());
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [reevaluating, setReevaluating] = useState(false);

  // Correction ciblée d'UNE ligne à la fois (interaction volontairement
  // simple — décision validée du commanditaire : la correction par ligne
  // est le flux primaire, pas la fantaisie). `editingLineId` désigne la
  // ligne d'origine (`correctsLineId` envoyé au backend).
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editTankId, setEditTankId] = useState("");
  const [editVolume, setEditVolume] = useState("");
  const [editOrderLineId, setEditOrderLineId] = useState("");
  const [editChangeReason, setEditChangeReason] = useState("");
  const [correctAttempted, setCorrectAttempted] = useState(false);
  const [correctSubmitting, setCorrectSubmitting] = useState(false);
  const [correctError, setCorrectError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !declaration) return;
    let cancelled = false;
    setLoadingExtra(true);
    Promise.all([
      data.listDeliveryFiles(declaration.id),
      data.organizationId ? fetchLineReconciliationRecords(data.organizationId, declaration.lines) : Promise.resolve(new Map<string, ReconciliationRecord>()),
    ])
      .then(([docs, records]) => {
        if (cancelled) return;
        setFiles(docs);
        setLineRecords(records);
      })
      .finally(() => { if (!cancelled) setLoadingExtra(false); });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, declaration?.id]);

  // Réinitialise l'édition de correction à chaque changement de déclaration
  // affichée — jamais une correction "orpheline" laissée ouverte sur la
  // déclaration suivante.
  useEffect(() => {
    setEditingLineId(null);
    setCorrectError(null);
    setCorrectAttempted(false);
  }, [declaration?.id]);

  if (!declaration) return null;

  const supplier = data.stationSuppliers.find((s) => s.id === declaration.supplierId);
  // Toute ligne d'une AUTRE déclaration dont `correctsLineId` pointe vers
  // une ligne d'ici signale que cette ligne d'origine a déjà été
  // supplantée par une correction — jamais rouvrable une deuxième fois
  // depuis cette même ligne (il faudrait corriger la ligne corrective).
  const supersededLineIds = new Set(data.declarations.flatMap((d) => d.lines).map((l) => l.correctsLineId).filter((id): id is string => id !== null));

  const openOrderLinesForEdit: OpenOrderLine[] = data.purchaseOrders.flatMap((order) => order.lines.filter((line) => line.status === "open").map((line) => ({ order, line })));

  function orderLineLabel(purchaseOrderLineId: string | null): string {
    if (!purchaseOrderLineId) return t("line.noOrder");
    for (const order of data.purchaseOrders) {
      const line = order.lines.find((l) => l.id === purchaseOrderLineId);
      if (line) {
        const product = data.fuelProducts.find((fp) => fp.id === line.fuelProductId);
        return `${order.orderReference} — ${product?.name ?? "?"}`;
      }
    }
    return t("line.noOrder");
  }

  async function handleDownload(fileId: string) {
    const url = await data.downloadDeliveryFile(fileId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleReevaluate() {
    if (!declaration) return;
    setReevaluating(true);
    try {
      const records = await data.reevaluateReconciliation(declaration.id);
      if (records) {
        setLineRecords((prev) => {
          const next = new Map(prev);
          records.forEach((record) => next.set(record.subjectId, record));
          return next;
        });
      }
    } finally {
      setReevaluating(false);
    }
  }

  function startCorrection(line: DeliveryDeclarationLine) {
    setEditingLineId(line.id);
    setEditTankId(line.tankId);
    setEditVolume(String(line.volumeLiters));
    setEditOrderLineId(line.purchaseOrderLineId ?? "");
    setEditChangeReason("");
    setCorrectAttempted(false);
    setCorrectError(null);
  }

  function cancelCorrection() {
    setEditingLineId(null);
    setCorrectAttempted(false);
    setCorrectError(null);
  }

  const editMissingRequired = !editTankId || !editVolume || Number(editVolume) <= 0;

  async function submitCorrection(e: React.FormEvent) {
    e.preventDefault();
    setCorrectAttempted(true);
    if (!declaration || !editingLineId || editMissingRequired) return;
    setCorrectSubmitting(true);
    setCorrectError(null);
    try {
      const line: CorrectDeliveryDeclarationLineInput = {
        correctsLineId: editingLineId,
        tankId: editTankId,
        volumeLiters: Number(editVolume),
        purchaseOrderLineId: editOrderLineId || undefined,
      };
      await correctDeliveryDeclarationLines(data.organizationId ?? "", {
        declarationId: declaration.id,
        changeReason: editChangeReason || undefined,
        lines: [line],
      });
      await data.reload();
      setEditingLineId(null);
      onOpenChange(false);
    } catch (err) {
      setCorrectError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCorrectSubmitting(false);
    }
  }

  const editTank = data.tanks.find((tk) => tk.id === editTankId);
  const editOrderLineOptions = openOrderLinesForEdit.filter((entry) => !editTank || entry.line.fuelProductId === editTank.fuelProductId);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("title")} closeLabel={tCommon("actions.close")} size="lg">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone={declaration.lifecycleStatus === "locked" ? "neutral" : "info"}>{tDeliveries(`lifecycle.${declaration.lifecycleStatus}`)}</Badge>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={handleReevaluate} loading={reevaluating}>
            <RefreshCcw className="size-4" aria-hidden />
            {t("reevaluate")}
          </Button>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-body-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">{t("supplier")}</dt><dd className="text-text">{supplier?.name ?? declaration.supplierName ?? "—"}</dd></div>
          <div><dt className="text-text-muted">{t("eventAt")}</dt><dd className="text-text">{formatFreshness(declaration.eventAt, format)}</dd></div>
          <div><dt className="text-text-muted">{t("noteReference")}</dt><dd className="text-text">{declaration.deliveryNoteReference ?? "—"}</dd></div>
        </dl>

        <div>
          <p className="mb-2 text-body-sm font-semibold text-text">{t("lines")}</p>
          {loadingExtra ? (
            <Skeleton className="h-24 w-full" variant="rectangular" />
          ) : (
            <div className="flex flex-col gap-2">
              {declaration.lines.map((line) => {
                const tank = data.tanks.find((tk) => tk.id === line.tankId);
                const record = lineRecords.get(line.id);
                const status = record?.status ?? "not_reconciled";
                const superseded = supersededLineIds.has(line.id);
                const editing = editingLineId === line.id;
                return (
                  <div key={line.id} className="rounded-card border border-border-subtle p-3">
                    {editing ? (
                      <form onSubmit={submitCorrection} className="flex flex-col gap-3">
                        {correctAttempted && editMissingRequired && <Alert tone="error">{t("line.correctRequired")}</Alert>}
                        {correctError && <Alert tone="error">{correctError}</Alert>}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <FormField label={t("line.tank")}>
                            {() => (
                              <Select
                                aria-label={t("line.tank")}
                                value={editTankId || undefined}
                                onValueChange={(value) => setEditTankId(value)}
                                placeholder={t("line.selectTank")}
                                options={data.tanks.map((tk: Tank) => ({ value: tk.id, label: tk.displayName }))}
                              />
                            )}
                          </FormField>
                          <FormField label={t("line.volume")}>{(f) => <Input {...f} type="number" value={editVolume} onChange={(e) => setEditVolume(e.target.value)} />}</FormField>
                        </div>
                        <FormField label={t("line.order")}>
                          {() => (
                            <Select
                              aria-label={t("line.order")}
                              value={editOrderLineId || undefined}
                              onValueChange={(value) => setEditOrderLineId(value)}
                              placeholder={t("line.noOrder")}
                              disabled={!editTankId}
                              options={editOrderLineOptions.map((entry) => ({
                                value: entry.line.id,
                                label: `${entry.order.orderReference} — ${formatLiters(entry.line.orderedVolumeLiters)} L`,
                              }))}
                            />
                          )}
                        </FormField>
                        <FormField label={t("line.correctionReason")}>{(f) => <Input {...f} value={editChangeReason} onChange={(e) => setEditChangeReason(e.target.value)} placeholder={t("line.correctionReasonPlaceholder")} />}</FormField>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" type="button" onClick={cancelCorrection}>{tCommon("actions.cancel")}</Button>
                          <Button size="sm" type="submit" loading={correctSubmitting}>{t("line.submitCorrection")}</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <dl className="grid grid-cols-1 gap-2 text-body-sm sm:grid-cols-2">
                          <div><dt className="text-text-muted">{t("line.tank")}</dt><dd className="text-text">{tank?.displayName ?? "—"}</dd></div>
                          <div><dt className="text-text-muted">{t("line.volume")}</dt><dd className="tabular-nums text-text">{formatLiters(line.volumeLiters)} L</dd></div>
                          <div><dt className="text-text-muted">{t("line.order")}</dt><dd className="text-text">{orderLineLabel(line.purchaseOrderLineId)}</dd></div>
                          <div>
                            <dt className="text-text-muted">{t("line.reconciliation")}</dt>
                            <dd>
                              <Badge tone={RECONCILIATION_TONE[status]}>{t(`reconciliation.${status}`)}</Badge>
                              {superseded && <Badge tone="neutral" className="ml-1.5">{t("line.corrected")}</Badge>}
                            </dd>
                          </div>
                        </dl>
                        {!superseded && (
                          <Button variant="outline" size="sm" type="button" onClick={() => startCorrection(line)}>
                            {t("line.correctAction")}
                          </Button>
                        )}
                      </div>
                    )}
                    {!editing && record && record.discrepancyValue !== null && (
                      <p className="mt-2 text-caption text-error font-medium">
                        {t("discrepancy", {
                          value: `${record.discrepancyValue > 0 ? "+" : ""}${formatLiters(record.discrepancyValue)}`,
                          tolerance: record.toleranceApplied !== null ? formatLiters(record.toleranceApplied) : "—",
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-body-sm font-semibold text-text">{t("attachments")}</p>
          {loadingExtra ? (
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32" variant="rectangular" />
              <Skeleton className="h-9 w-32" variant="rectangular" />
            </div>
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

/** Détail d'une livraison DÉTECTÉE (télémétrie) — jamais fusionnée avec la
 * modale des livraisons déclarées ci-dessus (correction explicite : les deux
 * flux restent visuellement et fonctionnellement séparés). Si un
 * rapprochement existe et pointe vers une déclaration, un lien permet de
 * rouvrir directement la déclaration (et sa ligne) correspondante dans son
 * propre détail. */
function DetectedDeliveryDetailModal({
  data,
  delivery,
  reconciliationByDetectedId,
  open,
  onOpenChange,
  onOpenDeclaration,
}: {
  data: ReturnType<typeof useDeliveryFlow>;
  delivery: Delivery | null;
  reconciliationByDetectedId: Map<string, ReconciliationRecord>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDeclaration: (declarationId: string) => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.deliveries.detail");
  const format = useFormatter();
  const tCommon = useTranslations("common");

  if (!delivery) return null;

  const reconciliation = reconciliationByDetectedId.get(delivery.id) ?? null;
  const reconciliationStatus = reconciliation?.status ?? "not_reconciled";
  // `subjectId` du rapprochement désigne désormais une LIGNE de
  // déclaration (`DeliveryDeclarationLine.id`), pas la déclaration
  // elle-même — on retrouve la déclaration parente en cherchant celle qui
  // porte cette ligne.
  const linkedDeclaration =
    reconciliation && reconciliation.subjectType === "DeliveryDeclarationLine"
      ? data.declarations.find((d) => d.lines.some((l) => l.id === reconciliation.subjectId))
      : undefined;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("detectedTitle")} closeLabel={tCommon("actions.close")} size="lg">
      <div className="flex flex-col gap-5">
        <Badge tone={RECONCILIATION_TONE[reconciliationStatus]}>{t(`reconciliation.${reconciliationStatus}`)}</Badge>

        <dl className="grid grid-cols-1 gap-3 text-body-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">{t("detectedStartTime")}</dt><dd className="text-text">{formatFreshness(delivery.startTime, format)}</dd></div>
          <div><dt className="text-text-muted">{t("detectedEndTime")}</dt><dd className="text-text">{formatFreshness(delivery.endTime, format)}</dd></div>
          <div><dt className="text-text-muted">{t("detectedStartHeight")}</dt><dd className="tabular-nums text-text">{formatLiters(delivery.startHeightMm)} mm</dd></div>
          <div><dt className="text-text-muted">{t("detectedEndHeight")}</dt><dd className="tabular-nums text-text">{formatLiters(delivery.endHeightMm)} mm</dd></div>
          <div><dt className="text-text-muted">{t("detectedVolume")}</dt><dd className="tabular-nums text-text">{delivery.volumeLiters !== null ? `${formatLiters(delivery.volumeLiters)} L` : "—"}</dd></div>
        </dl>

        {reconciliation && reconciliation.discrepancyValue !== null && (
          <p className="text-caption text-error font-medium">
            {t("discrepancy", {
              value: `${reconciliation.discrepancyValue > 0 ? "+" : ""}${formatLiters(reconciliation.discrepancyValue)}`,
              tolerance: reconciliation.toleranceApplied !== null ? formatLiters(reconciliation.toleranceApplied) : "—",
            })}
          </p>
        )}

        {linkedDeclaration ? (
          <button
            type="button"
            onClick={() => onOpenDeclaration(linkedDeclaration.id)}
            className="self-start text-body-sm font-medium text-primary underline decoration-dotted hover:opacity-80"
          >
            {t("detectedLinkedDeclaration", { reference: linkedDeclaration.deliveryNoteReference ?? formatFreshness(linkedDeclaration.eventAt, format) })}
          </button>
        ) : (
          <p className="text-body-sm text-text-muted">{t("detectedNoDeclaration")}</p>
        )}

        <div className="flex justify-end border-t border-border-subtle pt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{tCommon("actions.close")}</Button>
        </div>
      </div>
    </Modal>
  );
}

type DraftLine = { key: string; tankId: string; volume: string; purchaseOrderLineId: string };

function makeDraftLine(): DraftLine {
  return { key: Math.random().toString(36).slice(2), tankId: "", volume: "", purchaseOrderLineId: "" };
}

function DeliveryFormModal({
  data,
  openOrderLines,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof useDeliveryFlow>;
  openOrderLines: OpenOrderLine[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.deliveries.form");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [eventAt, setEventAt] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [noteReference, setNoteReference] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([makeDraftLine()]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Erreur de soumission (réseau/serveur) uniquement — le message "champs
  // requis" est dérivé à chaque rendu, jamais stocké tel quel (même
  // correctif que le formulaire de commande, 2026-09-10 : sinon il reste
  // affiché même une fois les champs corrigés).
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const missingRequired = !eventAt || lines.length === 0 || lines.some((l) => !l.tankId || !l.volume || Number(l.volume) <= 0);
  const displayError = attempted && missingRequired ? t("required") : submitError;

  function reset() {
    setEventAt("");
    setSupplierId("");
    setNoteReference("");
    setLines([makeDraftLine()]);
    setStagedFiles([]);
    setSubmitError(null);
    setAttempted(false);
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, makeDraftLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (missingRequired) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const declarationLines: CreateDeliveryDeclarationLineInput[] = lines.map((l) => ({
        tankId: l.tankId,
        volumeLiters: Number(l.volume),
        purchaseOrderLineId: l.purchaseOrderLineId || undefined,
      }));
      const declaration = await data.declareDelivery({
        eventAt,
        lines: declarationLines,
        supplierId: supplierId || undefined,
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
      size="lg"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("eventAt")}>{(f) => <Input {...f} type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} />}</FormField>
          <FormField label={t("supplier")}>
            {() => (
              <Select
                aria-label={t("supplier")}
                value={supplierId || undefined}
                onValueChange={setSupplierId}
                placeholder={t("selectSupplier")}
                options={data.stationSuppliers.map((s) => ({ value: s.id, label: s.name }))}
              />
            )}
          </FormField>
        </div>
        <FormField label={t("noteReference")}>{(f) => <Input {...f} value={noteReference} onChange={(e) => setNoteReference(e.target.value)} placeholder={t("noteReferencePlaceholder")} />}</FormField>

        <div className="flex flex-col gap-3">
          <p className="text-body-sm font-medium text-text">{t("lines")}</p>
          {lines.map((line, index) => {
            const tank = data.tanks.find((tk) => tk.id === line.tankId);
            const lineOrderOptions = openOrderLines.filter((entry) => !tank || entry.line.fuelProductId === tank.fuelProductId);
            return (
              <div key={line.key} className="rounded-card border border-border-subtle p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-caption font-medium text-text-muted">{t("lineTitle", { index: index + 1 })}</span>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(line.key)} className="text-text-muted hover:text-error" aria-label={t("removeLine")}>
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label={t("tank")}>
                    {() => (
                      <Select
                        aria-label={t("tank")}
                        value={line.tankId || undefined}
                        onValueChange={(value) => updateLine(line.key, { tankId: value, purchaseOrderLineId: "" })}
                        placeholder={t("selectTank")}
                        options={data.tanks.map((tk: Tank) => ({ value: tk.id, label: tk.displayName }))}
                      />
                    )}
                  </FormField>
                  <FormField label={t("volume")}>{(f) => <Input {...f} type="number" value={line.volume} onChange={(e) => updateLine(line.key, { volume: e.target.value })} />}</FormField>
                </div>
                <FormField label={t("orderLine")}>
                  {() => (
                    <Select
                      aria-label={t("orderLine")}
                      value={line.purchaseOrderLineId || undefined}
                      onValueChange={(value) => {
                        const entry = lineOrderOptions.find((o) => o.line.id === value);
                        updateLine(line.key, { purchaseOrderLineId: value, volume: line.volume || (entry ? String(entry.line.orderedVolumeLiters) : line.volume) });
                      }}
                      placeholder={t("selectOrderLine")}
                      disabled={!line.tankId}
                      options={lineOrderOptions.map((entry) => ({
                        value: entry.line.id,
                        label: `${entry.order.orderReference} — ${formatLiters(entry.line.orderedVolumeLiters)} L`,
                      }))}
                    />
                  )}
                </FormField>
              </div>
            );
          })}
          <Button variant="outline" size="sm" type="button" onClick={addLine} className="self-start">
            <Plus className="size-4" aria-hidden />
            {t("addLine")}
          </Button>
        </div>

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
