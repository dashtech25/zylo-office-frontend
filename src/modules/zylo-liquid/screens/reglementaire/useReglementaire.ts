"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createRegulatoryDeclaration,
  createRegulatoryDocument,
  listRegulatoryDeclarations,
  listRegulatoryDocuments,
  listStations,
  renewRegulatoryDocument,
  type CreateRegulatoryDeclarationRequest,
  type CreateRegulatoryDocumentInput,
  type RegulatoryDeclaration,
  type RegulatoryDocument,
  type Station,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Documents et déclarations réglementaires (Bloc 7 de la mission
 * « vente-maintenant-reglementation ») — statut calculé côté serveur depuis
 * l'échéance, jamais saisi ; vue par défaut = documents nécessitant une
 * action (Phase 4 §3.1 du plan de mission), pas la liste exhaustive. */
export function useReglementaire(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [documents, setDocuments] = useState<RegulatoryDocument[]>([]);
  const [declarations, setDeclarations] = useState<RegulatoryDeclaration[]>([]);
  const [needsActionOnly, setNeedsActionOnly] = useState(true);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [stationsPage, documentsPage, declarationsPage] = await Promise.all([
        listStations(organizationId),
        listRegulatoryDocuments(organizationId, { limit: 100, needsActionOnly }),
        listRegulatoryDeclarations(organizationId, { limit: 100 }),
      ]);
      setStations(stationsPage.data);
      setDocuments(documentsPage.data);
      setDeclarations(declarationsPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId, needsActionOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function addDocument(data: CreateRegulatoryDocumentInput) {
    if (!organizationId) return;
    await createRegulatoryDocument(organizationId, data);
    await load();
  }

  async function renew(documentId: string, data: CreateRegulatoryDocumentInput) {
    if (!organizationId) return;
    await renewRegulatoryDocument(organizationId, documentId, data);
    await load();
  }

  async function addDeclaration(data: CreateRegulatoryDeclarationRequest) {
    if (!organizationId) return;
    await createRegulatoryDeclaration(organizationId, data);
    await load();
  }

  return { loading, error, stations, documents, declarations, needsActionOnly, setNeedsActionOnly, addDocument, renew, addDeclaration, reload: load };
}
