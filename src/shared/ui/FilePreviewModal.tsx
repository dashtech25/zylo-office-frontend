"use client";

import { Download, FileWarning } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";

export interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  mimeType: string | null;
  /** URL déjà résolue (via `resolveStorageUrl`), directement fetchable. */
  fileUrl: string;
  downloadLabel: string;
  closeLabel: string;
  unavailableLabel: string;
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function kindFor(mimeType: string | null, fileName: string): "image" | "pdf" | "docx" | "other" {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === DOCX_MIME || fileName.toLowerCase().endsWith(".docx")) return "docx";
  return "other";
}

/** Aperçu générique de fichier sans téléchargement préalable (mission
 * « bon de commande + aperçu/partage », 2026-09-10) — image et PDF rendus
 * nativement par le navigateur, DOCX rendu côté client via `docx-preview`
 * (léger, pas de conversion serveur). Le téléchargement reste toujours
 * proposé en secours, y compris pour les types sans aperçu possible. */
export function FilePreviewModal({ open, onOpenChange, fileName, mimeType, fileUrl, downloadLabel, closeLabel, unavailableLabel }: FilePreviewModalProps) {
  const kind = kindFor(mimeType, fileName);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [docxError, setDocxError] = useState(false);

  useEffect(() => {
    if (!open || kind !== "docx") return;
    let cancelled = false;
    setDocxError(false);
    (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (cancelled || !docxContainerRef.current) return;
        docxContainerRef.current.innerHTML = "";
        await renderAsync(buffer, docxContainerRef.current);
      } catch {
        if (!cancelled) setDocxError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, fileUrl, kind]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={fileName} size="full" closeLabel={closeLabel}>
      <div className="flex h-full flex-col gap-3">
        <div className="min-h-0 flex-1 overflow-auto rounded-card border border-border-subtle bg-surface-muted">
          {kind === "image" && (
            <div className="flex h-full items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl} alt={fileName} className="max-h-full max-w-full object-contain" />
            </div>
          )}
          {kind === "pdf" && <iframe src={fileUrl} title={fileName} className="h-full w-full" />}
          {kind === "docx" && !docxError && <div ref={docxContainerRef} className="bg-white p-4" />}
          {(kind === "other" || docxError) && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-text-muted">
              <FileWarning className="size-8" aria-hidden />
              <p className="text-body-sm">{unavailableLabel}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")}>
            <Download className="size-4" aria-hidden />
            {downloadLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
