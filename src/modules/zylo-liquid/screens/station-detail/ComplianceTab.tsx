"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { listRegulatoryDeclarations, listRegulatoryDocuments } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, Card, CardSectionHeader, EmptyState, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "./PartState";

// Mêmes maps de tons que `ReglementaireScreen.tsx` (répétées ici comme ce
// fichier les répète lui-même, pour que les deux rendus restent identiques).
const STATUS_TONE = { valid: "success", renew_soon: "warning", expired: "error", unknown: "neutral" } as const;
const CERTAINTY_TONE = { high: "success", medium: "warning", low: "neutral" } as const;

/** Onglet « Conformité » (prototype) réalisé avec les données réglementaires
 * réelles scopées à la station (documents + déclarations), même rendu et
 * mêmes clés i18n que l'écran réseau Réglementaire — types affichés en
 * texte brut (vocabulaire libre réel), statuts calculés par le backend sur
 * l'échéance réelle. La gestion (ajout, renouvellement, production) reste
 * sur l'écran Réglementaire du réseau. */
export function ComplianceTab({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationDetail.complianceTab");
  const tReg = useTranslations("zyloLiquid.reglementaireScreen");

  const loadDocuments = useCallback(
    () => listRegulatoryDocuments(organizationId, { stationId, limit: 100 }).then((p) => p.data),
    [organizationId, stationId]
  );
  const documents = usePartData(loadDocuments);

  const loadDeclarations = useCallback(
    () => listRegulatoryDeclarations(organizationId, { stationId, limit: 100 }).then((p) => p.data),
    [organizationId, stationId]
  );
  const declarations = usePartData(loadDeclarations);

  return (
    <Stack>
      <Card>
        <CardSectionHeader title={t("documentsTitle")} />
        <p className="-mt-3 mb-1 text-body-sm text-text-muted">{t("note")}</p>
        <PartStateBox state={documents}>
          {documents.status === "ready" &&
            (documents.data.length === 0 ? (
              <EmptyState icon={FileText} title={tReg("documents.empty")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{tReg("documents.table.type")}</TableHeaderCell>
                    <TableHeaderCell>{tReg("documents.table.authority")}</TableHeaderCell>
                    <TableHeaderCell>{tReg("documents.table.expiresAt")}</TableHeaderCell>
                    <TableHeaderCell>{tReg("documents.table.status")}</TableHeaderCell>
                    <TableHeaderCell>{tReg("documents.table.certainty")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.data.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.documentType}</TableCell>
                      <TableCell>{doc.authority ?? "—"}</TableCell>
                      <TableCell>{doc.expiresAt ?? "—"}</TableCell>
                      <TableCell>
                        <Badge tone={STATUS_TONE[doc.computedStatus]}>{tReg(`documents.status.${doc.computedStatus}`)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge tone={CERTAINTY_TONE[doc.certaintyLevel]}>{tReg(`documents.certainty.${doc.certaintyLevel}`)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}
        </PartStateBox>
      </Card>

      <Card>
        <CardSectionHeader title={t("declarationsTitle")} />
        <PartStateBox state={declarations}>
          {declarations.status === "ready" &&
            (declarations.data.length === 0 ? (
              <EmptyState icon={FileText} title={tReg("declarations.empty")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{tReg("declarations.table.type")}</TableHeaderCell>
                    <TableHeaderCell>{tReg("declarations.table.authority")}</TableHeaderCell>
                    <TableHeaderCell>{tReg("declarations.table.status")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {declarations.data.map((dec) => (
                    <TableRow key={dec.id}>
                      <TableCell className="font-medium">{dec.type}</TableCell>
                      <TableCell>{dec.authority ?? "—"}</TableCell>
                      <TableCell>
                        <Badge tone={dec.status === "produced" ? "success" : "warning"}>{tReg(`declarations.status.${dec.status}`)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}
        </PartStateBox>
      </Card>
    </Stack>
  );
}
