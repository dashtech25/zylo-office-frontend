"use client";

import { FileText, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import {
  createRegulatoryDeclaration,
  createRegulatoryDocument,
  listRegulatoryDeclarations,
  listRegulatoryDocuments,
  type RegulatoryCertaintyLevel,
  type RegulatoryDeclaration,
  type RegulatoryDocument,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, CardSectionHeader, EmptyState, FormField, Input, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Textarea } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

const STATUS_TONE = { valid: "success", renew_soon: "warning", expired: "error", unknown: "neutral" } as const;
const CERTAINTY_TONE = { high: "success", medium: "warning", low: "neutral" } as const;
const CERTAINTY_LEVELS: RegulatoryCertaintyLevel[] = ["high", "medium", "low"];

/** Domaine « Réglementation » du Centre administratif — étend `ComplianceTab`
 * (lecture seule, toujours utilisée dans la Vue d'ensemble) avec les actions
 * de création déjà exposées par l'API mais jusqu'ici réservées à l'écran
 * réseau Réglementaire. */
export function RegulatorySection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.reglementaireScreen");
  const tCommon = useTranslations("common");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const [documentsPage, declarationsPage] = await Promise.all([
      listRegulatoryDocuments(organizationId, { stationId, limit: 100 }),
      listRegulatoryDeclarations(organizationId, { stationId, limit: 100 }),
    ]);
    return { documents: documentsPage.data, declarations: declarationsPage.data };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, stationId, reloadKey]);
  const state = usePartData(load);

  const [docType, setDocType] = useState("");
  const [docAuthority, setDocAuthority] = useState("");
  const [docExpiresAt, setDocExpiresAt] = useState("");
  const [docCertainty, setDocCertainty] = useState<RegulatoryCertaintyLevel>("medium");
  const [docCreating, setDocCreating] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [decType, setDecType] = useState("");
  const [decAuthority, setDecAuthority] = useState("");
  const [decReserve, setDecReserve] = useState("");
  const [decCreating, setDecCreating] = useState(false);
  const [decError, setDecError] = useState<string | null>(null);

  async function handleCreateDocument() {
    if (!docType) {
      setDocError(t("documents.form.required"));
      return;
    }
    setDocCreating(true);
    setDocError(null);
    try {
      await createRegulatoryDocument(organizationId, { stationId, documentType: docType, authority: docAuthority || undefined, expiresAt: docExpiresAt || undefined, certaintyLevel: docCertainty });
      setDocType("");
      setDocAuthority("");
      setDocExpiresAt("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setDocCreating(false);
    }
  }

  async function handleCreateDeclaration() {
    if (!decType) {
      setDecError(t("declarations.form.required"));
      return;
    }
    setDecCreating(true);
    setDecError(null);
    try {
      await createRegulatoryDeclaration(organizationId, { stationId, type: decType, authority: decAuthority || undefined, reserve: decReserve || undefined });
      setDecType("");
      setDecAuthority("");
      setDecReserve("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setDecError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setDecCreating(false);
    }
  }

  return (
    <PartStateBox state={state}>
      {state.status === "ready" && (() => {
        const { documents, declarations }: { documents: RegulatoryDocument[]; declarations: RegulatoryDeclaration[] } = state.data;
        return (
          <Stack>
            {docError && <Alert tone="error">{docError}</Alert>}
            <Card>
              <CardSectionHeader title={t("documents.form.title")} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField label={t("documents.form.type")}>{(field) => <Input {...field} value={docType} onChange={(e) => setDocType(e.target.value)} />}</FormField>
                <FormField label={t("documents.form.authority")}>{(field) => <Input {...field} value={docAuthority} onChange={(e) => setDocAuthority(e.target.value)} />}</FormField>
                <FormField label={t("documents.form.expiresAt")}>{(field) => <Input {...field} type="date" value={docExpiresAt} onChange={(e) => setDocExpiresAt(e.target.value)} />}</FormField>
                <FormField label={t("documents.form.certaintyLevel")}>
                  {() => <Select aria-label={t("documents.form.certaintyLevel")} value={docCertainty} onValueChange={(v) => setDocCertainty(v as RegulatoryCertaintyLevel)} options={CERTAINTY_LEVELS.map((c) => ({ value: c, label: t(`documents.certainty.${c}`) }))} />}
                </FormField>
              </div>
              <Button className="mt-4" size="sm" onClick={handleCreateDocument} loading={docCreating}>
                <Plus className="size-4" aria-hidden />
                {t("documents.form.submit")}
              </Button>
            </Card>

            {documents.length === 0 ? (
              <EmptyState icon={FileText} title={t("documents.empty")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("documents.table.type")}</TableHeaderCell>
                    <TableHeaderCell>{t("documents.table.authority")}</TableHeaderCell>
                    <TableHeaderCell>{t("documents.table.expiresAt")}</TableHeaderCell>
                    <TableHeaderCell>{t("documents.table.status")}</TableHeaderCell>
                    <TableHeaderCell>{t("documents.table.certainty")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.documentType}</TableCell>
                      <TableCell>{doc.authority ?? "—"}</TableCell>
                      <TableCell>{doc.expiresAt ?? "—"}</TableCell>
                      <TableCell><Badge tone={STATUS_TONE[doc.computedStatus]}>{t(`documents.status.${doc.computedStatus}`)}</Badge></TableCell>
                      <TableCell><Badge tone={CERTAINTY_TONE[doc.certaintyLevel]}>{t(`documents.certainty.${doc.certaintyLevel}`)}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {decError && <Alert tone="error">{decError}</Alert>}
            <Card>
              <CardSectionHeader title={t("declarations.form.title")} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField label={t("declarations.form.type")}>{(field) => <Input {...field} value={decType} onChange={(e) => setDecType(e.target.value)} />}</FormField>
                <FormField label={t("declarations.form.authority")}>{(field) => <Input {...field} value={decAuthority} onChange={(e) => setDecAuthority(e.target.value)} />}</FormField>
                <div className="sm:col-span-3">
                  <FormField label={t("declarations.form.reserve")}>{(field) => <Textarea {...field} value={decReserve} onChange={(e) => setDecReserve(e.target.value)} />}</FormField>
                </div>
              </div>
              <Button className="mt-4" size="sm" onClick={handleCreateDeclaration} loading={decCreating}>
                <Plus className="size-4" aria-hidden />
                {t("declarations.form.submit")}
              </Button>
            </Card>

            {declarations.length === 0 ? (
              <EmptyState icon={FileText} title={t("declarations.empty")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("declarations.table.type")}</TableHeaderCell>
                    <TableHeaderCell>{t("declarations.table.authority")}</TableHeaderCell>
                    <TableHeaderCell>{t("declarations.table.status")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {declarations.map((dec) => (
                    <TableRow key={dec.id}>
                      <TableCell className="font-medium">{dec.type}</TableCell>
                      <TableCell>{dec.authority ?? "—"}</TableCell>
                      <TableCell><Badge tone={dec.status === "produced" ? "success" : "warning"}>{t(`declarations.status.${dec.status}`)}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        );
      })()}
    </PartStateBox>
  );
}
