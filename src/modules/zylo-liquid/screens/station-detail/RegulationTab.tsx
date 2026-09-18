"use client";

import { FileText, Paperclip, Plus, Upload } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import type { RegulatoryCertaintyLevel } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatDueDate } from "@/shared/lib/formatDateTime";
import { Alert, Badge, Button, Card, CardSectionHeader, EmptyState, FormField, Input, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Textarea } from "@/shared/ui";
import { Skeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";

import { RegulatoryDocumentModal } from "./RegulatoryDocumentModal";
import { useRegulation } from "./useRegulation";

const STATUS_TONE = { valid: "success", renew_soon: "warning", expired: "error", unknown: "neutral" } as const;
const CERTAINTY_LEVELS: RegulatoryCertaintyLevel[] = ["high", "medium", "low"];

/** Refonte complète de l'onglet Réglementation (amelioration/reglementation,
 * maquettes fournies) — remplace l'ancien onglet « Conformité » en lecture
 * seule : création, renouvellement, correction de métadonnées et pièces
 * jointes directement depuis la station, sur le même backend
 * `RegulatoryDocument`/`RegulatoryDeclaration` déjà utilisé par l'écran
 * réseau Réglementaire (jamais un second modèle de données). */
export function RegulationTab({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationDetail.regulationTab");
  const format = useFormatter();
  const tCommon = useTranslations("common");
  const data = useRegulation(organizationId, stationId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  const openDocument = data.documents.find((d) => d.id === openDocumentId) ?? null;

  const [type, setType] = useState("");
  const [authority, setAuthority] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [certaintyLevel, setCertaintyLevel] = useState<RegulatoryCertaintyLevel>("medium");
  const [notes, setNotes] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setType("");
    setAuthority("");
    setIssuedAt("");
    setExpiresAt("");
    setCertaintyLevel("medium");
    setNotes("");
    setStagedFiles([]);
  }

  function addStagedFiles(fileList: FileList | File[]) {
    setStagedFiles((prev) => [...prev, ...Array.from(fileList)]);
  }

  async function handleCreate() {
    if (!type.trim()) {
      setError(t("form.typeRequired"));
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await data.createDeclarationDocument(
        {
          documentType: type.trim(),
          authority: authority || undefined,
          issuedAt: issuedAt || undefined,
          expiresAt: expiresAt || undefined,
          certaintyLevel,
          notes: notes || undefined,
        },
        stagedFiles
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreating(false);
    }
  }

  async function handleRenew(documentId: string, newExpiresAt: string) {
    const doc = data.documents.find((d) => d.id === documentId);
    if (!doc) return;
    await data.renew(documentId, {
      documentType: doc.documentType,
      authority: doc.authority ?? undefined,
      issuedAt: doc.issuedAt ?? undefined,
      expiresAt: newExpiresAt,
      certaintyLevel: doc.certaintyLevel,
      notes: doc.notes ?? undefined,
      responsibleUserId: doc.responsibleUserId ?? undefined,
    });
  }

  // Silhouette (tableau + formulaire) plutôt qu'un spinner plein écran —
  // cet onglet est démonté/remonté à chaque bascule du Centre administratif
  // (cf. `StationAdminCenter.tsx`), donc rechargé à chaque ouverture même
  // avec le cache React Query de `useRegulation`.
  if (data.loading) {
    return (
      <Stack>
        <Card padding="none">
          <div className="p-5">
            <table className="w-full">
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={6} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="mt-3 h-20 w-full" />
        </Card>
      </Stack>
    );
  }

  return (
    <Stack>
      {data.error && <Alert tone="error">{data.error}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <Card padding="none">
        <div className="flex items-center justify-between p-5 pb-0">
          <CardSectionHeader title={t("tableTitle")} />
          <Button size="sm" onClick={() => document.getElementById("regulation-create-form")?.scrollIntoView({ behavior: "smooth" })}>
            <Plus className="size-4" aria-hidden />
            {t("newDeclaration")}
          </Button>
        </div>
        <div className="p-5 pt-3">
          {data.documents.length === 0 ? (
            <EmptyState icon={FileText} title={t("empty")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("table.type")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.authority")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.issuedAt")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.expiresAt")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.files")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.documents.map((doc) => (
                  <TableRow key={doc.id} clickable onClick={() => setOpenDocumentId(doc.id)}>
                    <TableCell className="font-medium text-text underline decoration-dotted">{doc.documentType}</TableCell>
                    <TableCell>{doc.authority ?? "—"}</TableCell>
                    <TableCell>{doc.issuedAt ? format.dateTime(new Date(doc.issuedAt), { dateStyle: "long" }) : "—"}</TableCell>
                    <TableCell>
                      {doc.expiresAt ? (
                        <span className="flex flex-col">
                          <span>{formatDueDate(doc.expiresAt, format).date}</span>
                          <span className="text-caption text-text-muted">{formatDueDate(doc.expiresAt, format).relative}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[doc.computedStatus]}>{t(`status.${doc.computedStatus}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-text-muted">
                        <Paperclip className="size-3.5" aria-hidden />
                        {data.fileCounts[doc.id] ?? 0}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <Card id="regulation-create-form">
        <CardSectionHeader title={t("form.title")} />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("form.type")}>{(f) => <Input {...f} value={type} onChange={(e) => setType(e.target.value)} placeholder={t("form.typePlaceholder")} />}</FormField>
          <FormField label={t("form.authority")}>{(f) => <Input {...f} value={authority} onChange={(e) => setAuthority(e.target.value)} />}</FormField>
          <FormField label={t("form.issuedAt")}>{(f) => <Input {...f} type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />}</FormField>
          <FormField label={t("form.expiresAt")}>{(f) => <Input {...f} type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />}</FormField>
          <FormField label={t("form.certaintyLevel")}>
            {() => <Select aria-label={t("form.certaintyLevel")} value={certaintyLevel} onValueChange={(v) => setCertaintyLevel(v as RegulatoryCertaintyLevel)} options={CERTAINTY_LEVELS.map((c) => ({ value: c, label: t(`certainty.${c}`) }))} />}
          </FormField>
        </div>
        <div className="mt-3">
          <FormField label={t("form.notes")}>{(f) => <Textarea {...f} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />}</FormField>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-muted">{t("form.attachments")}</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addStagedFiles(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files) addStagedFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-card border-2 border-dashed p-6 text-center text-body-sm text-text-muted transition-colors ${dragOver ? "border-primary bg-primary-muted" : "border-border-subtle"}`}
          >
            <Upload className="size-5" aria-hidden />
            {t("form.dropZone")}
          </div>
          {stagedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {stagedFiles.map((file, i) => (
                <span key={`${file.name}-${i}`} className="flex items-center gap-1 rounded-pill border border-border-subtle px-2 py-1 text-caption text-text">
                  {file.name}
                  <button type="button" className="text-text-muted hover:text-error" onClick={() => setStagedFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={resetForm} disabled={creating}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" loading={creating} onClick={handleCreate}>
            {t("form.submit")}
          </Button>
        </div>
      </Card>

      {data.declarations.length > 0 && (
        <Card padding="none">
          <div className="p-5 pb-0">
            <CardSectionHeader title={t("declarationsTitle")} />
            <p className="-mt-3 mb-1 text-body-sm text-text-muted">{t("declarationsNote")}</p>
          </div>
          <div className="p-5 pt-3">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("declarationsTable.type")}</TableHeaderCell>
                  <TableHeaderCell>{t("declarationsTable.authority")}</TableHeaderCell>
                  <TableHeaderCell>{t("declarationsTable.status")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.declarations.map((dec) => (
                  <TableRow key={dec.id}>
                    <TableCell className="font-medium">{dec.type}</TableCell>
                    <TableCell>{dec.authority ?? "—"}</TableCell>
                    <TableCell>
                      <Badge tone={dec.status === "produced" ? "success" : "warning"}>{t(`declarationStatus.${dec.status}`)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <RegulatoryDocumentModal
        open={openDocument !== null}
        onOpenChange={(next) => !next && setOpenDocumentId(null)}
        document={openDocument}
        members={data.members}
        onRenew={handleRenew}
        onUpdate={data.updateDocument}
        listFiles={data.listFiles}
        attachFiles={data.attachFiles}
        removeFile={data.removeFile}
        downloadFile={data.downloadFile}
      />
    </Stack>
  );
}
