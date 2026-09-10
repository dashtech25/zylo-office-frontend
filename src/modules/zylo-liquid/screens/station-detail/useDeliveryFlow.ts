"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { resolveStorageUrl, uploadFile } from "@/core/api/storage";
import {
  createDeliveryDeclaration,
  createDocument,
  createPurchaseOrder,
  deleteDocument,
  getDocumentDownloadUrl,
  getStationCurrentState,
  listAlerts,
  listDeliveryDeclarations,
  listDocumentsByEntity,
  listFuelProducts,
  listPurchaseOrders,
  listStationSuppliers,
  listSuppliers,
  listTanks,
  reconcileDeliveryDeclaration,
  resolveAlert,
  type Alert,
  type CreateDeliveryDeclarationInput,
  type CreatePurchaseOrderInput,
  type DeliveryDeclaration,
  type FuelProduct,
  type PurchaseOrder,
  type Supplier,
  type Tank,
  type TankCurrentState,
  type ZyloDocument,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

const DELIVERY_DECLARATION_ENTITY_TYPE = "DeliveryDeclaration";

async function fetchDeliveryFlow(organizationId: string, stationId: string) {
  const [tanksPage, suppliersPage, linksPage, ordersPage, declarationsPage, alertsPage, fuelProductsPage, currentState] = await Promise.all([
    listTanks(organizationId, 100, stationId),
    listSuppliers(organizationId, { limit: 100 }),
    listStationSuppliers(organizationId, { stationId, limit: 100 }),
    listPurchaseOrders(organizationId, { stationId, limit: 100 }),
    listDeliveryDeclarations(organizationId, { stationId, limit: 100 }),
    listAlerts(organizationId, { stationId, limit: 100 }),
    listFuelProducts(organizationId, 100),
    // Un seul appel pour la capacité/espace disponible de toutes les cuves
    // de la station (jamais une donnée dupliquée/recalculée côté client —
    // mission « formulaire de commande intelligent », 2026-09-10). Best-
    // effort : une station sans cuve mesurée ne doit pas bloquer le reste.
    getStationCurrentState(organizationId, stationId).catch(() => ({ stationId, tanks: [] as TankCurrentState[] })),
  ]);
  const linkedSupplierIds = new Set(linksPage.data.filter((l) => l.active).map((l) => l.supplierId));
  const stationSuppliers = suppliersPage.data.filter((s) => linkedSupplierIds.has(s.id));
  const usedFuelProductIds = new Set(tanksPage.data.map((tk) => tk.fuelProductId));
  const fuelProducts = fuelProductsPage.data.filter((fp) => usedFuelProductIds.has(fp.id));
  const tankStateById = new Map(currentState.tanks.map((ts) => [ts.tankId, ts]));
  return {
    tanks: tanksPage.data,
    tankStateById,
    fuelProducts,
    stationSuppliers,
    purchaseOrders: ordersPage.data,
    declarations: declarationsPage.data,
    alerts: alertsPage.data,
  };
}

/** Flux de livraison station (mission « flux de livraison station »,
 * 2026-09-10) — Commande (`PurchaseOrder`) → Livraison déclarée
 * (`DeliveryDeclaration`, rapprochée automatiquement côté backend avec
 * `DeliveryDetected`) → Alertes (`Alert`, scopées à cette station, y
 * compris les 3 nouveaux types de rapprochement). Fournisseur et cuve
 * sont toujours choisis dans le référentiel déjà défini pour la station
 * (jamais une saisie libre — décision explicite du commanditaire). */
export function useDeliveryFlow(organizationId: string | null, stationId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["zylo-liquid", "delivery-flow", organizationId, stationId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchDeliveryFlow(organizationId as string, stationId),
    enabled: !!organizationId,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  async function addPurchaseOrder(data: Omit<CreatePurchaseOrderInput, "stationId">): Promise<PurchaseOrder | null> {
    if (!organizationId) return null;
    const order = await createPurchaseOrder(organizationId, { ...data, stationId });
    await invalidate();
    return order;
  }

  async function declareDelivery(data: Omit<CreateDeliveryDeclarationInput, "stationId">): Promise<DeliveryDeclaration | null> {
    if (!organizationId) return null;
    const declaration = await createDeliveryDeclaration(organizationId, { ...data, stationId });
    await invalidate();
    return declaration;
  }

  async function reevaluateReconciliation(declarationId: string) {
    if (!organizationId) return null;
    const record = await reconcileDeliveryDeclaration(organizationId, declarationId);
    await invalidate();
    return record;
  }

  async function closeAlert(alertId: string, resolutionNote?: string): Promise<Alert | null> {
    if (!organizationId) return null;
    const alert = await resolveAlert(organizationId, alertId, resolutionNote);
    await invalidate();
    return alert;
  }

  /** Bon de livraison scanné/uploadé (point 4 validé par le commanditaire)
   * — même mécanisme générique Document/DocumentLink que Fournisseurs,
   * jamais un second système de stockage propre à cet écran. */
  async function attachDeliveryFiles(declarationId: string, files: File[]) {
    if (!organizationId || files.length === 0) return;
    for (const file of files) {
      const uploaded = await uploadFile(organizationId, file);
      await createDocument(organizationId, {
        storageReference: uploaded.storageReference,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType ?? undefined,
        linkedEntityType: DELIVERY_DECLARATION_ENTITY_TYPE,
        linkedEntityId: declarationId,
      });
    }
    await invalidate();
  }

  async function listDeliveryFiles(declarationId: string): Promise<ZyloDocument[]> {
    if (!organizationId) return [];
    return listDocumentsByEntity(organizationId, DELIVERY_DECLARATION_ENTITY_TYPE, declarationId);
  }

  async function removeDeliveryFile(fileId: string) {
    if (!organizationId) return;
    await deleteDocument(organizationId, fileId);
    await invalidate();
  }

  async function downloadDeliveryFile(fileId: string): Promise<string> {
    if (!organizationId) return "";
    const { url } = await getDocumentDownloadUrl(organizationId, fileId);
    return resolveStorageUrl(url);
  }

  const tanks: Tank[] = query.data?.tanks ?? [];
  const stationSuppliers: Supplier[] = query.data?.stationSuppliers ?? [];
  const fuelProducts: FuelProduct[] = query.data?.fuelProducts ?? [];
  const tankStateById: Map<string, TankCurrentState> = query.data?.tankStateById ?? new Map();

  return {
    organizationId,
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    tanks,
    tankStateById,
    fuelProducts,
    stationSuppliers,
    purchaseOrders: query.data?.purchaseOrders ?? [],
    declarations: query.data?.declarations ?? [],
    alerts: query.data?.alerts ?? [],
    addPurchaseOrder,
    declareDelivery,
    reevaluateReconciliation,
    closeAlert,
    attachDeliveryFiles,
    listDeliveryFiles,
    removeDeliveryFile,
    downloadDeliveryFile,
    reload: invalidate,
  };
}
