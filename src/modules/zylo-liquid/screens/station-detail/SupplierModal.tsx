"use client";

import { File, FileImage, FileText, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AuditLogEntry } from "@/core/api/audit";
import type { Supplier, StationSupplier, ZyloDocument } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, Button, Modal, Tabs } from "@/shared/ui";

const CONTRACT_STATUS_TONE = { valid: "success", renew_soon: "warning", expired: "error", unknown: "neutral" } as const;
const CATEGORY_TONE = { carburant: "info", equipement: "primary", maintenance: "warning", securite: "error", service: "neutral", autre: "neutral" } as const;

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

function InfoLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

/** Détail d'un fournisseur rattaché à la station (maquette Fournisseurs,
 * amelioration/reglementation) — 5 onglets : Informations (référentiel
 * réseau `Supplier`), Contrat + Services & Équipements (propres à CE lien
 * `StationSupplier`), Documents (Document/DocumentLink générique) et
 * Historique (journal d'audit générique, filtré sur ce lien précis). */
export function SupplierModal({
  open,
  onOpenChange,
  supplier,
  link,
  onEdit,
  listFiles,
  attachFiles,
  removeFile,
  downloadFile,
  listHistory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  link: StationSupplier | null;
  onEdit: () => void;
  listFiles: (linkId: string) => Promise<ZyloDocument[]>;
  attachFiles: (linkId: string, files: File[]) => Promise<void>;
  removeFile: (linkId: string, fileId: string) => Promise<void>;
  downloadFile: (fileId: string) => Promise<string>;
  listHistory: (linkId: string) => Promise<AuditLogEntry[]>;
}) {
  const t = useTranslations("zyloLiquid.stationDetail.suppliersTab.modal");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState("info");
  const [files, setFiles] = useState<ZyloDocument[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadFiles = useCallback(async () => {
    if (!link) return;
    setLoadingFiles(true);
    try {
      setFiles(await listFiles(link.id));
    } finally {
      setLoadingFiles(false);
    }
  }, [link, listFiles]);

  const reloadHistory = useCallback(async () => {
    if (!link) return;
    setLoadingHistory(true);
    try {
      setHistory(await listHistory(link.id));
    } finally {
      setLoadingHistory(false);
    }
  }, [link, listHistory]);

  useEffect(() => {
    if (!open || !link) return;
    setTab("info");
    setError(null);
    reloadFiles();
    reloadHistory();
  }, [open, link, reloadFiles, reloadHistory]);

  if (!supplier || !link) return null;

  async function handleFiles(fileList: FileList | File[]) {
    const list = Array.from(fileList);
    if (list.length === 0 || !link) return;
    setUploading(true);
    setError(null);
    try {
      await attachFiles(link.id, list);
      await reloadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveFile(fileId: string) {
    if (!link) return;
    await removeFile(link.id, fileId);
    await reloadFiles();
  }

  async function handleDownload(fileId: string) {
    const url = await downloadFile(fileId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const equipmentTags = link.equipmentTags ? link.equipmentTags.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const grouped = {
    images: files.filter((f) => fileGroup(f.mimeType) === "images"),
    pdf: files.filter((f) => fileGroup(f.mimeType) === "pdf"),
    docx: files.filter((f) => fileGroup(f.mimeType) === "docx"),
    other: files.filter((f) => fileGroup(f.mimeType) === "other"),
  };

  const infoTab = (
    <div className="flex flex-col gap-2 py-3 text-body-sm">
      <InfoLine label={t("name")} value={supplier.name} />
      <InfoLine label={t("categoryLabel")} value={supplier.category ? <Badge tone={CATEGORY_TONE[supplier.category]}>{t(`category.${supplier.category}`)}</Badge> : "—"} />
      <InfoLine label={t("type")} value={supplier.type ?? "—"} />
      <InfoLine label={t("status")} value={<Badge tone={supplier.active ? "success" : "neutral"}>{supplier.active ? t("active") : t("inactive")}</Badge>} />
      <div className="mt-2 border-t border-border-subtle pt-2">
        <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-text-muted">{t("contactTitle")}</p>
        <InfoLine label={t("contactName")} value={supplier.contactName ?? "—"} />
        <InfoLine label={t("contactRole")} value={supplier.contactRole ?? "—"} />
        <InfoLine label={t("contactPhone")} value={supplier.contactPhone ?? "—"} />
        <InfoLine label={t("contactEmail")} value={supplier.contactEmail ?? "—"} />
        <InfoLine label={t("website")} value={supplier.website ?? "—"} />
        <InfoLine label={t("address")} value={supplier.address ?? "—"} />
        <InfoLine label={t("taxId")} value={supplier.taxId ?? "—"} />
      </div>
      {link.notes && (
        <div className="mt-2 border-t border-border-subtle pt-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-text-muted">{t("notes")}</p>
          <p className="whitespace-pre-wrap text-text">{link.notes}</p>
        </div>
      )}
    </div>
  );

  const contractTab = (
    <div className="flex flex-col gap-2 py-3 text-body-sm">
      <InfoLine label={t("contractReference")} value={link.contractReference ?? "—"} />
      <InfoLine label={t("contractType")} value={link.contractType ?? "—"} />
      <InfoLine label={t("contractStartDate")} value={link.contractStartDate ?? "—"} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-text-muted">{t("contractEndDate")}</span>
        <span className="flex items-center gap-2 font-medium text-text">
          {link.contractEndDate ?? "—"}
          <Badge tone={CONTRACT_STATUS_TONE[link.contractStatus]}>{t(`contractStatus.${link.contractStatus}`)}</Badge>
        </span>
      </div>
    </div>
  );

  const equipmentTab = (
    <div className="py-3">
      {equipmentTags.length === 0 ? (
        <p className="text-body-sm text-text-muted">{t("noEquipment")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {equipmentTags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  const documentsTab = (
    <div className="flex flex-col gap-3 py-3">
      {error && <p className="text-body-sm text-error">{error}</p>}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
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
        {uploading ? tCommon("states.loading") : t("dropZone")}
      </div>

      {loadingFiles ? (
        <p className="text-body-sm text-text-muted">{tCommon("states.loading")}</p>
      ) : files.length === 0 ? (
        <p className="text-body-sm text-text-muted">{t("noFiles")}</p>
      ) : (
        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {[...grouped.images, ...grouped.pdf, ...grouped.docx, ...grouped.other].map((f) => (
            <div key={f.id} className="flex flex-col items-center gap-1 rounded-card border border-border-subtle p-2">
              <FileIcon mimeType={f.mimeType} />
              <span className="w-full truncate text-center text-caption text-text" title={f.fileName}>
                {f.fileName}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className="text-caption text-primary hover:underline" onClick={() => handleDownload(f.id)}>
                  {t("preview")}
                </button>
                <button type="button" aria-label={tCommon("actions.delete")} onClick={() => handleRemoveFile(f.id)}>
                  <Trash2 className="size-3.5 text-text-muted hover:text-error" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const historyTab = (
    <div className="py-3">
      {loadingHistory ? (
        <p className="text-body-sm text-text-muted">{tCommon("states.loading")}</p>
      ) : history.length === 0 ? (
        <p className="text-body-sm text-text-muted">{t("noHistory")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {history.map((entry) => (
            <li key={entry.id} className="flex gap-3 border-l-2 border-border-subtle pl-3">
              <div className="flex flex-col">
                <span className="text-caption text-text-muted">{new Date(entry.createdAt).toLocaleString()}</span>
                <span className="text-body-sm text-text">{entry.summary}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={supplier.name}
      description={t("subtitle")}
      closeLabel={tCommon("actions.close")}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onEdit}>
            {t("editButton")}
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            {tCommon("actions.close")}
          </Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "info", label: t("tabs.info"), content: infoTab },
          { value: "contract", label: t("tabs.contract"), content: contractTab },
          { value: "equipment", label: t("tabs.equipment"), content: equipmentTab },
          { value: "documents", label: t("tabs.documents", { count: files.length }), content: documentsTab },
          { value: "history", label: t("tabs.history"), content: historyTab },
        ]}
      />
    </Modal>
  );
}
