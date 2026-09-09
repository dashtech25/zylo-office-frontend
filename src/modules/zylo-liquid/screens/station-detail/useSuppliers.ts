"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listAuditLogs, type AuditLogEntry } from "@/core/api/audit";
import { resolveStorageUrl, uploadFile } from "@/core/api/storage";
import {
  countDocumentsByEntity,
  createDocument,
  createStationSupplier,
  createSupplier,
  deleteDocument,
  getDocumentDownloadUrl,
  listDocumentsByEntity,
  listStationSuppliers,
  listSuppliers,
  updateStationSupplier,
  updateSupplier,
  type CreateStationSupplierInput,
  type CreateSupplierInput,
  type UpdateStationSupplierInput,
  type ZyloDocument,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

const STATION_SUPPLIER_ENTITY_TYPE = "StationSupplier";

async function fetchSuppliers(organizationId: string, stationId: string) {
  const [suppliersPage, linksPage] = await Promise.all([
    listSuppliers(organizationId, { limit: 100 }),
    listStationSuppliers(organizationId, { stationId, limit: 100 }),
  ]);
  // Un seul appel réseau pour tous les compteurs de pièces jointes (audit
  // performance — remplaçait un appel par ligne, cause directe de lenteur
  // sur une base distante).
  const fileCounts = await countDocumentsByEntity(
    organizationId,
    STATION_SUPPLIER_ENTITY_TYPE,
    linksPage.data.map((l) => l.id)
  ).catch(() => ({}) as Record<string, number>);

  return { suppliers: suppliersPage.data, links: linksPage.data, fileCounts };
}

/** Refonte de la page Fournisseurs (amelioration/reglementation, maquette
 * fournie) — `Supplier` reste le référentiel réseau (nom, catégorie,
 * contact), `StationSupplier` porte ce qui est propre à CETTE station
 * (contrat, périmètre d'intervention, actif/inactif) : jamais confondu,
 * même séparation que le backend. Pièces jointes réutilisent
 * Document/DocumentLink (`linkedEntityType="StationSupplier"`), historique
 * réutilise le journal d'audit générique déjà backend, filtré sur le
 * lien station-fournisseur précis.
 *
 * Migré vers React Query (audit performance/cache, cf. `QueryProvider`) :
 * revenir sur cette page après l'avoir quittée affiche instantanément la
 * dernière donnée connue au lieu de tout recharger. */
export function useSuppliers(organizationId: string | null, stationId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["zylo-liquid", "suppliers", organizationId, stationId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSuppliers(organizationId as string, stationId),
    enabled: !!organizationId,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  /** Crée le fournisseur réseau (référentiel) ET son rattachement à cette
   * station en une action — cas le plus courant (nouveau fournisseur connu
   * uniquement de cette station). */
  async function createSupplierAndLink(supplierData: CreateSupplierInput, linkData: Omit<CreateStationSupplierInput, "stationId" | "supplierId">) {
    if (!organizationId) return null;
    const supplier = await createSupplier(organizationId, supplierData);
    const link = await createStationSupplier(organizationId, { ...linkData, stationId, supplierId: supplier.id });
    await invalidate();
    return { supplier, link };
  }

  async function updateSupplierInfo(supplierId: string, data: Partial<CreateSupplierInput> & { active?: boolean }) {
    if (!organizationId) return;
    await updateSupplier(organizationId, supplierId, data);
    await invalidate();
  }

  async function updateLink(linkId: string, data: UpdateStationSupplierInput) {
    if (!organizationId) return;
    await updateStationSupplier(organizationId, linkId, data);
    await invalidate();
  }

  async function attachFiles(linkId: string, files: File[]) {
    if (!organizationId || files.length === 0) return;
    for (const file of files) {
      const uploaded = await uploadFile(organizationId, file);
      await createDocument(organizationId, {
        storageReference: uploaded.storageReference,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType ?? undefined,
        linkedEntityType: STATION_SUPPLIER_ENTITY_TYPE,
        linkedEntityId: linkId,
      });
    }
    await invalidate();
  }

  async function listFiles(linkId: string): Promise<ZyloDocument[]> {
    if (!organizationId) return [];
    return listDocumentsByEntity(organizationId, STATION_SUPPLIER_ENTITY_TYPE, linkId);
  }

  async function removeFile(linkId: string, fileId: string) {
    if (!organizationId) return;
    await deleteDocument(organizationId, fileId);
    await invalidate();
  }

  async function downloadFile(fileId: string): Promise<string> {
    if (!organizationId) return "";
    const { url } = await getDocumentDownloadUrl(organizationId, fileId);
    return resolveStorageUrl(url);
  }

  /** Historique de CE lien station-fournisseur précis (jamais tout
   * l'historique de la station) : le journal d'audit générique est
   * interrogé par préfixe d'action + portée station, puis filtré ici sur
   * l'entité exacte — l'API `/audit` ne filtre pas encore par entityId. */
  async function listHistory(linkId: string): Promise<AuditLogEntry[]> {
    if (!organizationId) return [];
    const page = await listAuditLogs(organizationId, { actionPrefix: "zyloLiquid.stationSupplier", scopeResourceType: "station", scopeResourceId: stationId, limit: 100 });
    return page.data.filter((entry) => entry.entityId === linkId);
  }

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    suppliers: query.data?.suppliers ?? [],
    links: query.data?.links ?? [],
    fileCounts: query.data?.fileCounts ?? {},
    createSupplierAndLink,
    updateSupplierInfo,
    updateLink,
    attachFiles,
    listFiles,
    removeFile,
    downloadFile,
    listHistory,
    reload: invalidate,
  };
}
