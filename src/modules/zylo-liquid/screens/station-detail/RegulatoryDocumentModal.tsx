"use client";

import { File, FileImage, FileText, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import type { OrganizationMember } from "@/core/api/rbac";
import type { RegulatoryDocument, UpdateRegulatoryDocumentInput, ZyloDocument } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, FormField, Input, Modal, Select, Textarea } from "@/shared/ui";

const STATUS_TONE = { valid: "success", renew_soon: "warning", expired: "error", unknown: "neutral" } as const;
const CERTAINTY_TONE = { high: "success", medium: "warning", low: "neutral" } as const;

function fileGroup(mimeType: string | null): "images" | "pdf" | "docx" | "other" {
  if (mimeType?.startsWith("image/")) return "images";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType?.includes("word") || mimeType?.includes("officedocument.wordprocessingml")) return "docx";
  return "other";
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  const group = fileGroup(mimeType);
  if (group === "images") return <FileImage className="size-8 text-primary" aria-hidden />;
  if (group === "pdf") return <FileText className="size-8 text-error" aria-hidden />;
  return <File className="size-8 text-text-muted" aria-hidden />;
}

/** Détail d'une déclaration réglementaire + gestion de ses pièces jointes
 * (maquette "modal de reglementation.jpeg", amelioration/reglementation) —
 * réutilise directement le mécanisme Document/DocumentLink déjà backend
 * (Phase 5 §6, `linkedEntityType="RegulatoryDocument"`), pas un stockage
 * propre à cet écran. */
export function RegulatoryDocumentModal({
  open,
  onOpenChange,
  document: doc,
  members,
  onRenew,
  onUpdate,
  listFiles,
  attachFiles,
  removeFile,
  downloadFile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: RegulatoryDocument | null;
  members: OrganizationMember[];
  onRenew: (documentId: string, expiresAt: string) => Promise<void>;
  onUpdate: (documentId: string, data: UpdateRegulatoryDocumentInput) => Promise<void>;
  listFiles: (documentId: string) => Promise<ZyloDocument[]>;
  attachFiles: (documentId: string, files: File[]) => Promise<void>;
  removeFile: (documentId: string, fileId: string) => Promise<void>;
  downloadFile: (fileId: string) => Promise<string>;
}) {
  const t = useTranslations("zyloLiquid.stationDetail.regulationTab");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<ZyloDocument[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editAuthority, setEditAuthority] = useState("");
  const [editSourceReference, setEditSourceReference] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editResponsibleId, setEditResponsibleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [renewExpiresAt, setRenewExpiresAt] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const reloadFiles = useCallback(async () => {
    if (!doc) return;
    setLoadingFiles(true);
    try {
      setFiles(await listFiles(doc.id));
    } finally {
      setLoadingFiles(false);
    }
  }, [doc, listFiles]);

  useEffect(() => {
    if (!open || !doc) return;
    reloadFiles();
    setEditing(false);
    setEditAuthority(doc.authority ?? "");
    setEditSourceReference(doc.sourceReference ?? "");
    setEditNotes(doc.notes ?? "");
    setEditResponsibleId(doc.responsibleUserId ?? "");
    setRenewing(false);
    setRenewExpiresAt("");
    setError(null);
  }, [open, doc, reloadFiles]);

  if (!doc) return null;

  async function handleFiles(fileList: FileList | File[]) {
    const list = Array.from(fileList);
    if (list.length === 0 || !doc) return;
    setUploading(true);
    setError(null);
    try {
      await attachFiles(doc.id, list);
      await reloadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveFile(fileId: string) {
    if (!doc) return;
    await removeFile(doc.id, fileId);
    await reloadFiles();
  }

  async function handleDownload(fileId: string) {
    const url = await downloadFile(fileId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSaveEdit() {
    if (!doc) return;
    setSaving(true);
    setError(null);
    try {
      await onUpdate(doc.id, {
        authority: editAuthority || undefined,
        sourceReference: editSourceReference || undefined,
        notes: editNotes || undefined,
        responsibleUserId: editResponsibleId || null,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmRenew() {
    if (!doc || !renewExpiresAt) return;
    setSaving(true);
    setError(null);
    try {
      await onRenew(doc.id, renewExpiresAt);
      setRenewing(false);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSaving(false);
    }
  }

  const grouped = {
    images: files.filter((f) => fileGroup(f.mimeType) === "images"),
    pdf: files.filter((f) => fileGroup(f.mimeType) === "pdf"),
    docx: files.filter((f) => fileGroup(f.mimeType) === "docx"),
    other: files.filter((f) => fileGroup(f.mimeType) === "other"),
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("modal.title")}
      closeLabel={tCommon("actions.close")}
      size="xl"
      footer={
        <>
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                {tCommon("actions.cancel")}
              </Button>
              <Button size="sm" loading={saving} onClick={handleSaveEdit}>
                {tCommon("actions.save")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                {t("modal.editButton")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} loading={uploading}>
                <Upload className="size-4" aria-hidden />
                {t("modal.addFileButton")}
              </Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                {tCommon("actions.close")}
              </Button>
            </>
          )}
        </>
      }
    >
      {error && <Alert tone="error">{error}</Alert>}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Panneau Informations */}
        <div className="flex flex-col gap-3">
          <h3 className="text-caption font-semibold uppercase tracking-wide text-text-muted">{t("modal.infoTitle")}</h3>

          <div className="flex flex-col gap-2 text-body-sm">
            <InfoLine label={t("modal.type")} value={doc.documentType} />
            {editing ? (
              <FormField label={t("modal.authority")}>{(f) => <Input {...f} value={editAuthority} onChange={(e) => setEditAuthority(e.target.value)} />}</FormField>
            ) : (
              <InfoLine label={t("modal.authority")} value={doc.authority ?? "—"} />
            )}
            <InfoLine label={t("modal.issuedAt")} value={doc.issuedAt ?? "—"} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-muted">{t("modal.expiresAt")}</span>
              <span className="flex items-center gap-2 font-medium text-text">
                {doc.expiresAt ?? "—"}
                <Badge tone={STATUS_TONE[doc.computedStatus]}>{t(`status.${doc.computedStatus}`)}</Badge>
              </span>
            </div>
            <InfoLine label={t("modal.certainty")}>
              <Badge tone={CERTAINTY_TONE[doc.certaintyLevel]}>{t(`certainty.${doc.certaintyLevel}`)}</Badge>
            </InfoLine>
            {editing ? (
              <FormField label={t("modal.responsible")}>
                {() => (
                  <Select
                    aria-label={t("modal.responsible")}
                    value={editResponsibleId || undefined}
                    onValueChange={setEditResponsibleId}
                    placeholder={t("modal.noResponsible")}
                    options={members.map((m) => ({ value: m.userId, label: `${m.fullName} (${m.email})` }))}
                  />
                )}
              </FormField>
            ) : (
              <InfoLine label={t("modal.responsible")} value={doc.responsibleUserName ? `${doc.responsibleUserName} (${doc.responsibleUserEmail})` : "—"} />
            )}
            {editing ? (
              <FormField label={t("modal.sourceReference")}>{(f) => <Input {...f} value={editSourceReference} onChange={(e) => setEditSourceReference(e.target.value)} />}</FormField>
            ) : (
              <InfoLine label={t("modal.sourceReference")} value={doc.sourceReference ?? "—"} />
            )}
            {editing ? (
              <FormField label={t("modal.notes")}>{(f) => <Textarea {...f} rows={4} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />}</FormField>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-text-muted">{t("modal.notes")}</span>
                <p className="whitespace-pre-wrap rounded-input border border-border-subtle bg-surface-muted p-2 text-text">{doc.notes || "—"}</p>
              </div>
            )}
          </div>

          {!doc.supersededByDocumentId && (
            <div className="mt-2 border-t border-border-subtle pt-3">
              {renewing ? (
                <div className="flex items-end gap-2">
                  <FormField label={t("modal.newExpiresAt")}>{(f) => <Input {...f} type="date" value={renewExpiresAt} onChange={(e) => setRenewExpiresAt(e.target.value)} />}</FormField>
                  <Button size="sm" loading={saving} onClick={handleConfirmRenew} disabled={!renewExpiresAt}>
                    {t("modal.confirmRenew")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRenewing(false)}>
                    {tCommon("actions.cancel")}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setRenewing(true)}>
                  {t("modal.renewButton")}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Panneau Fichiers associés */}
        <div className="flex flex-col gap-3">
          <h3 className="text-caption font-semibold uppercase tracking-wide text-text-muted">{t("modal.filesTitle", { count: files.length })}</h3>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-card border-2 border-dashed p-4 text-center text-body-sm text-text-muted transition-colors ${dragOver ? "border-primary bg-primary-muted" : "border-border-subtle"}`}
          >
            <Upload className="size-5" aria-hidden />
            {t("modal.dropZone")}
          </div>

          {loadingFiles ? (
            <p className="text-body-sm text-text-muted">{tCommon("states.loading")}</p>
          ) : files.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("modal.noFiles")}</p>
          ) : (
            <div className="flex max-h-80 flex-col gap-4 overflow-y-auto">
              {(
                [
                  ["images", grouped.images, t("modal.groupImages", { count: grouped.images.length })],
                  ["pdf", grouped.pdf, t("modal.groupPdf", { count: grouped.pdf.length })],
                  ["docx", grouped.docx, t("modal.groupDocx", { count: grouped.docx.length })],
                  ["other", grouped.other, t("modal.groupOther", { count: grouped.other.length })],
                ] as const
              ).map(
                ([key, groupFiles, label]) =>
                  groupFiles.length > 0 && (
                    <div key={key}>
                      <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-muted">{label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {groupFiles.map((f) => (
                          <div key={f.id} className="flex flex-col items-center gap-1 rounded-card border border-border-subtle p-2">
                            <FileIcon mimeType={f.mimeType} />
                            <span className="w-full truncate text-center text-caption text-text" title={f.fileName}>
                              {f.fileName}
                            </span>
                            <div className="flex items-center gap-2">
                              <button type="button" className="text-caption text-primary hover:underline" onClick={() => handleDownload(f.id)}>
                                {t("modal.preview")}
                              </button>
                              <button type="button" aria-label={tCommon("actions.delete")} onClick={() => handleRemoveFile(f.id)}>
                                <Trash2 className="size-3.5 text-text-muted hover:text-error" aria-hidden />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function InfoLine({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-text-muted">{label}</span>
      {children ?? <span className="font-medium text-text">{value}</span>}
    </div>
  );
}
