"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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

interface ReglementaireData {
  stations: Station[];
  documents: RegulatoryDocument[];
  declarations: RegulatoryDeclaration[];
}

async function fetchReglementaireData(organizationId: string, needsActionOnly: boolean): Promise<ReglementaireData> {
  const [stationsPage, documentsPage, declarationsPage] = await Promise.all([
    listStations(organizationId),
    listRegulatoryDocuments(organizationId, { limit: 100, needsActionOnly }),
    listRegulatoryDeclarations(organizationId, { limit: 100 }),
  ]);
  return { stations: stationsPage.data, documents: documentsPage.data, declarations: declarationsPage.data };
}

/** Documents et déclarations réglementaires (Bloc 7 de la mission
 * « vente-maintenant-reglementation ») — statut calculé côté serveur depuis
 * l'échéance, jamais saisi ; vue par défaut = documents nécessitant une
 * action (Phase 4 §3.1 du plan de mission), pas la liste exhaustive.
 *
 * Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * revenir sur cet écran après l'avoir quitté affiche instantanément la
 * dernière donnée connue au lieu de tout recharger ; `needsActionOnly` fait
 * partie de la clé de requête, chaque valeur du filtre garde son propre
 * cache. */
export function useReglementaire(organizationId: string | null) {
  const [needsActionOnly, setNeedsActionOnly] = useState(true);

  const query = useQuery({
    queryKey: ["zylo-liquid", "reglementaire", organizationId, needsActionOnly],
    queryFn: () => fetchReglementaireData(organizationId as string, needsActionOnly),
    enabled: !!organizationId,
  });

  const stations = query.data?.stations ?? [];
  const documents = query.data?.documents ?? [];
  const declarations = query.data?.declarations ?? [];
  const loading = !!organizationId && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

  async function addDocument(data: CreateRegulatoryDocumentInput) {
    if (!organizationId) return;
    await createRegulatoryDocument(organizationId, data);
    await query.refetch();
  }

  async function renew(documentId: string, data: CreateRegulatoryDocumentInput) {
    if (!organizationId) return;
    await renewRegulatoryDocument(organizationId, documentId, data);
    await query.refetch();
  }

  async function addDeclaration(data: CreateRegulatoryDeclarationRequest) {
    if (!organizationId) return;
    await createRegulatoryDeclaration(organizationId, data);
    await query.refetch();
  }

  return {
    loading,
    error,
    stations,
    documents,
    declarations,
    needsActionOnly,
    setNeedsActionOnly,
    addDocument,
    renew,
    addDeclaration,
    reload: async () => {
      await query.refetch();
    },
  };
}
