"use client";

import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { resolveStorageUrl, uploadFile } from "@/core/api/storage";
import { createDocument, deleteDocument, getDocumentDownloadUrl, listDocumentsByEntity } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, CardSectionHeader, EmptyState, FormField, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

/** Domaine « Documents » du Centre administratif — centre documentaire de la
 * station, basé sur le mécanisme `Document`/`DocumentLink` déjà backend
 * (Phase 5 §6) et sur le service de stockage générique Zylo Office
 * (`app/shared/storage.py`, upload réel — filesystem local en dev, S3/MinIO
 * en prod) : le fichier est d'abord uploadé (`POST /storage/upload`), la
 * référence renvoyée est ensuite enregistrée comme `Document`. Aucune
 * référence externe saisie à la main. */
export function DocumentsSection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationAdmin.documents");
  const tCommon = useTranslations("common");
  const [reloadKey, setReloadKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    () => listDocumentsByEntity(organizationId, "Station", stationId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organizationId, stationId, reloadKey]
  );
  const state = usePartData(["zylo-liquid", "station-admin", "documents", organizationId, stationId, reloadKey], load);

  const [sensitivityLevel, setSensitivityLevel] = useState<"normal" | "restreint">("normal");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFile(organizationId, file);
      await createDocument(organizationId, {
        fileName: uploaded.fileName,
        storageReference: uploaded.storageReference,
        mimeType: uploaded.mimeType ?? undefined,
        sensitivityLevel,
        linkedEntityType: "Station",
        linkedEntityId: stationId,
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(documentId: string) {
    await deleteDocument(organizationId, documentId);
    setReloadKey((k) => k + 1);
  }

  async function handleDownload(documentId: string) {
    try {
      const { url } = await getDocumentDownloadUrl(organizationId, documentId);
      window.open(resolveStorageUrl(url), "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        <CardSectionHeader title={t("form.title")} />
        <p className="-mt-3 mb-3 text-body-sm text-text-muted">{t("form.hint")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <FormField label={t("form.sensitivityLevel")}>
            {() => (
              <Select
                aria-label={t("form.sensitivityLevel")}
                value={sensitivityLevel}
                onValueChange={(v) => setSensitivityLevel(v as "normal" | "restreint")}
                options={[
                  { value: "normal", label: t("sensitivity.normal") },
                  { value: "restreint", label: t("sensitivity.restreint") },
                ]}
              />
            )}
          </FormField>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
            }}
          />
          <Button size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" aria-hidden />
            {t("form.submit")}
          </Button>
        </div>
      </Card>

      <Card padding="none">
        <PartStateBox state={state}>
          {state.status === "ready" &&
            (state.data.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={FileText} title={t("empty")} />
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("table.fileName")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.sensitivityLevel")}</TableHeaderCell>
                    <TableHeaderCell></TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.data.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.fileName}</TableCell>
                      <TableCell>
                        <Badge tone={doc.sensitivityLevel === "restreint" ? "warning" : "neutral"}>{t(`sensitivity.${doc.sensitivityLevel}`)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label={t("table.download")} onClick={() => handleDownload(doc.id)}>
                            <Download className="size-4 text-text-muted hover:text-primary" aria-hidden />
                          </button>
                          <button type="button" aria-label={t("table.delete")} onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="size-4 text-text-muted hover:text-error" aria-hidden />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}
        </PartStateBox>
      </Card>
    </div>
  );
}
