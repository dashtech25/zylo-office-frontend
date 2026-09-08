"use client";

import { FileText, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import type { RegulatoryCertaintyLevel, RegulatoryDocument } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, PageHeader, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Tabs, Textarea } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useReglementaire } from "./useReglementaire";

const CERTAINTY_LEVELS: RegulatoryCertaintyLevel[] = ["high", "medium", "low"];
const STATUS_TONE = { valid: "success", renew_soon: "warning", expired: "error", unknown: "neutral" } as const;
const CERTAINTY_TONE = { high: "success", medium: "warning", low: "neutral" } as const;

/** Réglementation (Bloc 7 de la mission « vente-maintenant-reglementation »)
 * — reprend le bandeau de réserve déjà présent dans le prototype validé
 * (Phase 1 §0 du plan de mission) : aucune obligation n'est présentée
 * comme également certaine. */
export default function ReglementaireScreen() {
  const t = useTranslations("zyloLiquid.reglementaireScreen");
  const tCommon = useTranslations("common");
  const { currentOrganization } = useOrganization();
  const data = useReglementaire(currentOrganization?.id ?? null);

  const [docStationId, setDocStationId] = useState("");
  const [docType, setDocType] = useState("");
  const [docAuthority, setDocAuthority] = useState("");
  const [docExpiresAt, setDocExpiresAt] = useState("");
  const [docCertainty, setDocCertainty] = useState<RegulatoryCertaintyLevel>("medium");
  const [docCreating, setDocCreating] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [renewExpiresAt, setRenewExpiresAt] = useState("");

  const [decStationId, setDecStationId] = useState("");
  const [decType, setDecType] = useState("");
  const [decAuthority, setDecAuthority] = useState("");
  const [decReserve, setDecReserve] = useState("");
  const [decCreating, setDecCreating] = useState(false);
  const [decError, setDecError] = useState<string | null>(null);

  async function handleCreateDocument() {
    if (!docStationId || !docType) {
      setDocError(t("documents.form.required"));
      return;
    }
    setDocCreating(true);
    setDocError(null);
    try {
      await data.addDocument({ stationId: docStationId, documentType: docType, authority: docAuthority || undefined, expiresAt: docExpiresAt || undefined, certaintyLevel: docCertainty });
      setDocType("");
      setDocAuthority("");
      setDocExpiresAt("");
    } catch (err) {
      setDocError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setDocCreating(false);
    }
  }

  async function handleRenew(doc: RegulatoryDocument) {
    if (!renewExpiresAt) return;
    await data.renew(doc.id, { stationId: doc.stationId, documentType: doc.documentType, authority: doc.authority ?? undefined, expiresAt: renewExpiresAt, certaintyLevel: doc.certaintyLevel });
    setRenewingId(null);
    setRenewExpiresAt("");
  }

  async function handleCreateDeclaration() {
    if (!decStationId || !decType) {
      setDecError(t("declarations.form.required"));
      return;
    }
    setDecCreating(true);
    setDecError(null);
    try {
      await data.addDeclaration({ stationId: decStationId, type: decType, authority: decAuthority || undefined, reserve: decReserve || undefined });
      setDecType("");
      setDecAuthority("");
      setDecReserve("");
    } catch (err) {
      setDecError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setDecCreating(false);
    }
  }

  const documentsTab = (
    <Stack>
      {docError && <Alert tone="error">{docError}</Alert>}
      <div className="flex gap-2">
        <Button variant={data.needsActionOnly ? "primary" : "secondary"} onClick={() => data.setNeedsActionOnly(true)}>
          {t("filterNeedsAction")}
        </Button>
        <Button variant={!data.needsActionOnly ? "primary" : "secondary"} onClick={() => data.setNeedsActionOnly(false)}>
          {t("filterAll")}
        </Button>
      </div>
      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("documents.form.title")}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("documents.form.station")}>
            {() => <Select aria-label={t("documents.form.station")} value={docStationId || undefined} onValueChange={setDocStationId} placeholder={t("documents.form.selectStation")} options={data.stations.map((s) => ({ value: s.id, label: s.name }))} />}
          </FormField>
          <FormField label={t("documents.form.type")}>
            {(field) => <Input {...field} value={docType} onChange={(e) => setDocType(e.target.value)} />}
          </FormField>
          <FormField label={t("documents.form.authority")}>
            {(field) => <Input {...field} value={docAuthority} onChange={(e) => setDocAuthority(e.target.value)} />}
          </FormField>
          <FormField label={t("documents.form.expiresAt")}>
            {(field) => <Input {...field} type="date" value={docExpiresAt} onChange={(e) => setDocExpiresAt(e.target.value)} />}
          </FormField>
          <FormField label={t("documents.form.certaintyLevel")}>
            {() => <Select aria-label={t("documents.form.certaintyLevel")} value={docCertainty} onValueChange={(v) => setDocCertainty(v as RegulatoryCertaintyLevel)} options={CERTAINTY_LEVELS.map((c) => ({ value: c, label: t(`documents.certainty.${c}`) }))} />}
          </FormField>
        </div>
        <Button className="mt-4" onClick={handleCreateDocument} loading={docCreating}>
          <Plus className="size-4" aria-hidden />
          {t("documents.form.submit")}
        </Button>
      </Card>

      {data.documents.length === 0 ? (
        <EmptyState icon={FileText} title={t("documents.empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("documents.table.station")}</TableHeaderCell>
              <TableHeaderCell>{t("documents.table.type")}</TableHeaderCell>
              <TableHeaderCell>{t("documents.table.authority")}</TableHeaderCell>
              <TableHeaderCell>{t("documents.table.expiresAt")}</TableHeaderCell>
              <TableHeaderCell>{t("documents.table.status")}</TableHeaderCell>
              <TableHeaderCell>{t("documents.table.certainty")}</TableHeaderCell>
              <TableHeaderCell>{t("documents.table.actions")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.documents.map((doc) => {
              const station = data.stations.find((s) => s.id === doc.stationId);
              return (
                <TableRow key={doc.id}>
                  <TableCell>{station?.name ?? "—"}</TableCell>
                  <TableCell>{doc.documentType}</TableCell>
                  <TableCell>{doc.authority ?? "—"}</TableCell>
                  <TableCell>{doc.expiresAt ?? "—"}</TableCell>
                  <TableCell>
                    <Badge tone={STATUS_TONE[doc.computedStatus]}>{t(`documents.status.${doc.computedStatus}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge tone={CERTAINTY_TONE[doc.certaintyLevel]}>{t(`documents.certainty.${doc.certaintyLevel}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    {renewingId === doc.id ? (
                      <Stack className="w-48">
                        <Input type="date" value={renewExpiresAt} onChange={(e) => setRenewExpiresAt(e.target.value)} />
                        <Button onClick={() => handleRenew(doc)}>{t("documents.renew")}</Button>
                      </Stack>
                    ) : (
                      !doc.supersededByDocumentId && (
                        <Button variant="secondary" onClick={() => setRenewingId(doc.id)}>
                          {t("documents.renew")}
                        </Button>
                      )
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Stack>
  );

  const declarationsTab = (
    <Stack>
      {decError && <Alert tone="error">{decError}</Alert>}
      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("declarations.form.title")}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("declarations.form.station")}>
            {() => <Select aria-label={t("declarations.form.station")} value={decStationId || undefined} onValueChange={setDecStationId} placeholder={t("declarations.form.selectStation")} options={data.stations.map((s) => ({ value: s.id, label: s.name }))} />}
          </FormField>
          <FormField label={t("declarations.form.type")}>
            {(field) => <Input {...field} value={decType} onChange={(e) => setDecType(e.target.value)} />}
          </FormField>
          <FormField label={t("declarations.form.authority")}>
            {(field) => <Input {...field} value={decAuthority} onChange={(e) => setDecAuthority(e.target.value)} />}
          </FormField>
          <div className="sm:col-span-3">
            <FormField label={t("declarations.form.reserve")}>
              {(field) => <Textarea {...field} value={decReserve} onChange={(e) => setDecReserve(e.target.value)} />}
            </FormField>
          </div>
        </div>
        <Button className="mt-4" onClick={handleCreateDeclaration} loading={decCreating}>
          <Plus className="size-4" aria-hidden />
          {t("declarations.form.submit")}
        </Button>
      </Card>

      {data.declarations.length === 0 ? (
        <EmptyState icon={FileText} title={t("declarations.empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("declarations.table.station")}</TableHeaderCell>
              <TableHeaderCell>{t("declarations.table.type")}</TableHeaderCell>
              <TableHeaderCell>{t("declarations.table.authority")}</TableHeaderCell>
              <TableHeaderCell>{t("declarations.table.status")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.declarations.map((dec) => {
              const station = data.stations.find((s) => s.id === dec.stationId);
              return (
                <TableRow key={dec.id}>
                  <TableCell>{station?.name ?? "—"}</TableCell>
                  <TableCell>{dec.type}</TableCell>
                  <TableCell>{dec.authority ?? "—"}</TableCell>
                  <TableCell>
                    <Badge tone={dec.status === "produced" ? "success" : "warning"}>{t(`declarations.status.${dec.status}`)}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Stack>
  );

  return (
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />
      <Alert tone="info">{t("banner")}</Alert>
      {data.error && <Alert tone="error">{data.error}</Alert>}
      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : (
        <Tabs
          items={[
            { value: "documents", label: t("tabs.documents"), content: documentsTab },
            { value: "declarations", label: t("tabs.declarations"), content: declarationsTab },
          ]}
        />
      )}
    </Stack>
  );
}
