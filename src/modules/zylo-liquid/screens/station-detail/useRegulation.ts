"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { resolveStorageUrl, uploadFile } from "@/core/api/storage";
import { listMembers, type OrganizationMember } from "@/core/api/rbac";
import {
  countDocumentsByEntity,
  createDocument,
  createRegulatoryDeclaration,
  createRegulatoryDocument,
  deleteDocument,
  getDocumentDownloadUrl,
  listDocumentsByEntity,
  listRegulatoryDeclarations,
  listRegulatoryDocuments,
  renewRegulatoryDocument,
  updateRegulatoryDocument,
  type CreateRegulatoryDeclarationRequest,
  type CreateRegulatoryDocumentInput,
  type RegulatoryDocument,
  type UpdateRegulatoryDocumentInput,
  type ZyloDocument,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

const REGULATORY_DOCUMENT_ENTITY_TYPE = "RegulatoryDocument";

async function fetchRegulation(organizationId: string, stationId: string) {
  const [documentsPage, declarationsPage, membersList] = await Promise.all([
    listRegulatoryDocuments(organizationId, { stationId, limit: 100 }),
    listRegulatoryDeclarations(organizationId, { stationId, limit: 100 }),
    listMembers(organizationId).catch(() => [] as OrganizationMember[]),
  ]);
  // Un seul appel réseau pour tous les compteurs de pièces jointes (audit
  // performance — remplaçait un appel par ligne, cause directe de lenteur
  // sur une base distante).
  const fileCounts = await countDocumentsByEntity(
    organizationId,
    REGULATORY_DOCUMENT_ENTITY_TYPE,
    documentsPage.data.map((d) => d.id)
  ).catch(() => ({}) as Record<string, number>);

  return { documents: documentsPage.data, declarations: declarationsPage.data, members: membersList, fileCounts };
}

/** Refonte de l'onglet Réglementation de la page station (amelioration/
 * reglementation, maquettes fournies) — même backend qu'avant
 * (`RegulatoryDocument`, déjà utilisé par l'écran réseau Réglementaire),
 * mais gestion complète directement depuis la station (création,
 * renouvellement, correction de métadonnées, pièces jointes) au lieu
 * d'une simple lecture seule renvoyant vers l'écran réseau. Les pièces
 * jointes réutilisent le mécanisme Document/DocumentLink déjà backend
 * (Phase 5 §6) : un fichier est d'abord uploadé via le service de
 * stockage générique, puis rattaché au `RegulatoryDocument` via
 * `linkedEntityType="RegulatoryDocument"` — jamais un stockage propre à
 * cet écran.
 *
 * Migré vers React Query (audit performance/cache, cf. `QueryProvider`) :
 * revenir sur cet onglet après l'avoir quitté affiche instantanément la
 * dernière donnée connue au lieu de tout recharger. */
export function useRegulation(organizationId: string | null, stationId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["zylo-liquid", "regulation", organizationId, stationId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchRegulation(organizationId as string, stationId),
    enabled: !!organizationId,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  async function createDeclarationDocument(data: Omit<CreateRegulatoryDocumentInput, "stationId">, files: File[]): Promise<RegulatoryDocument | null> {
    if (!organizationId) return null;
    const document = await createRegulatoryDocument(organizationId, { ...data, stationId });
    await attachFiles(document.id, files);
    await invalidate();
    return document;
  }

  async function renew(documentId: string, data: Omit<CreateRegulatoryDocumentInput, "stationId">) {
    if (!organizationId) return;
    await renewRegulatoryDocument(organizationId, documentId, { ...data, stationId });
    await invalidate();
  }

  async function updateDocument(documentId: string, data: UpdateRegulatoryDocumentInput) {
    if (!organizationId) return;
    await updateRegulatoryDocument(organizationId, documentId, data);
    await invalidate();
  }

  async function attachFiles(documentId: string, files: File[]) {
    if (!organizationId || files.length === 0) return;
    for (const file of files) {
      const uploaded = await uploadFile(organizationId, file);
      await createDocument(organizationId, {
        storageReference: uploaded.storageReference,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType ?? undefined,
        linkedEntityType: REGULATORY_DOCUMENT_ENTITY_TYPE,
        linkedEntityId: documentId,
      });
    }
    await invalidate();
  }

  async function listFiles(documentId: string): Promise<ZyloDocument[]> {
    if (!organizationId) return [];
    return listDocumentsByEntity(organizationId, REGULATORY_DOCUMENT_ENTITY_TYPE, documentId);
  }

  async function removeFile(documentId: string, fileId: string) {
    if (!organizationId) return;
    await deleteDocument(organizationId, fileId);
    await invalidate();
  }

  async function downloadFile(fileId: string): Promise<string> {
    if (!organizationId) return "";
    const { url } = await getDocumentDownloadUrl(organizationId, fileId);
    return resolveStorageUrl(url);
  }

  async function addDeclaration(data: Omit<CreateRegulatoryDeclarationRequest, "stationId">) {
    if (!organizationId) return;
    await createRegulatoryDeclaration(organizationId, { ...data, stationId });
    await invalidate();
  }

  return {
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    documents: query.data?.documents ?? [],
    declarations: query.data?.declarations ?? [],
    members: query.data?.members ?? [],
    fileCounts: query.data?.fileCounts ?? {},
    createDeclarationDocument,
    renew,
    updateDocument,
    attachFiles,
    listFiles,
    removeFile,
    downloadFile,
    addDeclaration,
    reload: invalidate,
  };
}
