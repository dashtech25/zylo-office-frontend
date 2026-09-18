"use client";

import Link from "next/link";
import { FileWarning } from "lucide-react";
import { useFormatter } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { listRegulatoryDocuments, type RegulatoryDocument, type Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Card } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

const MAX_VISIBLE = 5;

async function fetchRegulatoryDocumentsNeedingAction(organizationId: string) {
  const page = await listRegulatoryDocuments(organizationId, { needsActionOnly: true, limit: 100 });
  return page.data;
}

function compareByExpiresAtAsc(a: RegulatoryDocument, b: RegulatoryDocument): number {
  if (a.expiresAt === null && b.expiresAt === null) return 0;
  if (a.expiresAt === null) return 1;
  if (b.expiresAt === null) return -1;
  return a.expiresAt < b.expiresAt ? -1 : a.expiresAt > b.expiresAt ? 1 : 0;
}

/** Widget « Documents réglementaires à traiter » du tableau de bord —
 * réutilise `/regulatory-documents` avec `needsActionOnly: true` (filtre
 * serveur sur renew_soon/expired, on ne re-filtre pas côté client) et lie
 * vers la page complète `/zylo-liquid/reglementaire` (jamais de modale).
 * La prop `stations` est reçue déjà chargée par le dashboard et utilisée
 * uniquement pour résoudre `stationId` -> nom de station, à l'identique des
 * autres widgets (ex. DashboardDeliveriesWidget). */
export function DashboardRegulatoryDocumentsWidget({
  organizationId,
  stations,
}: {
  organizationId: string;
  stations: Station[];
}) {
  const format = useFormatter();

  const query = useQuery({
    queryKey: ["zylo-liquid", "regulatory-documents-needs-action", organizationId],
    queryFn: () => fetchRegulatoryDocumentsNeedingAction(organizationId),
    enabled: !!organizationId,
  });

  const records = (query.data ?? []).slice().sort(compareByExpiresAtAsc);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-h3 font-semibold text-text">Documents réglementaires à traiter</h3>
        <span className="text-body-sm font-medium text-text-muted">{records.length}</span>
      </div>
      {records.length === 0 ? (
        <p className="text-body-sm text-text-muted">Aucun document à traiter</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {records.slice(0, MAX_VISIBLE).map((doc) => (
            <li key={doc.id}>
              <Link
                href="/zylo-liquid/reglementaire"
                className={cn("flex w-full items-start gap-2 rounded-card px-1 py-2 text-left transition-colors hover:bg-surface-muted")}
              >
                <FileWarning
                  className={cn("mt-0.5 size-4 shrink-0", doc.computedStatus === "expired" ? "text-error" : "text-warning")}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-text">{doc.documentType}</p>
                  <p className="truncate text-caption text-text-muted">{stations.find((s) => s.id === doc.stationId)?.name ?? doc.stationId}</p>
                </div>
                <span className="shrink-0 text-caption text-text-muted">
                  {doc.expiresAt !== null ? format.dateTime(new Date(doc.expiresAt), { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
