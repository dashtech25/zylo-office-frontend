"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { exportTable } from "@/core/api/exportTable";
import { parseXlsxFile } from "@/core/api/importTable";
import { ApiError } from "@/core/api/client";
import { listTankCalibrationPoints, replaceTankCalibrationPoints, type CalibrationPoint, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { downloadCsv } from "@/modules/zylo-liquid/utils/downloadCsv";
import { Alert, Button, DropdownMenu, DropdownMenuItem, Input, Modal, Skeleton } from "@/shared/ui";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";

function parseCalibrationCsv(text: string): CalibrationPoint[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [heightMm, volumeLiters] = line.split(/[;,]/).map((v) => Number(v.trim()));
      return { heightMm, volumeLiters };
    })
    .filter((p) => Number.isFinite(p.heightMm) && Number.isFinite(p.volumeLiters));
}

// Une ligne d'en-tête ("Hauteur", "mm", etc.) donne un NaN sur les deux
// colonnes une fois converti en nombre — filtrée exactement comme les
// lignes invalides, sans heuristique de détection d'en-tête séparée.
function parseCalibrationRows(rows: string[][]): CalibrationPoint[] {
  return rows
    .map((row) => ({ heightMm: Number(row[0]), volumeLiters: Number(row[1]) }))
    .filter((p) => Number.isFinite(p.heightMm) && Number.isFinite(p.volumeLiters));
}

interface EditRow {
  heightMm: string;
  volumeLiters: string;
}

export interface CalibrationModalProps {
  organizationId: string;
  tank: Tank;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

/** Consultation et remplacement de la table de calibration d'une cuve déjà
 * créée. PUT remplace toujours la table entière (jamais une fusion
 * partielle), conforme au contrat de l'endpoint. Trois façons de la
 * modifier (P1-7, audit module Stations 2026-09-16 : jusqu'ici limité à
 * l'import CSV) : saisie manuelle directe, import CSV (inchangé), import
 * XLSX (nouveau, via le parseur générique backend) — plus un export
 * CSV/XLSX de la table courante. */
export function CalibrationModal({ organizationId, tank, open, onOpenChange, onUpdated }: CalibrationModalProps) {
  const t = useTranslations("zyloLiquid.stationDetail.calibrationModal");
  const tCommon = useTranslations("common");
  const csvInputRef = useRef<HTMLInputElement>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  const queryKey = ["zylo-liquid", "tank-detail", "calibration", organizationId, tank.id];
  const query = useQuery({
    queryKey,
    queryFn: () => listTankCalibrationPoints(organizationId, tank.id),
    enabled: open,
  });
  const loading = open && query.isPending;
  const points = query.data ?? [];
  const fetchError = query.error ? (query.error instanceof ApiError ? query.error.message : tCommon("states.error")) : null;

  async function savePoints(parsed: CalibrationPoint[]) {
    if (parsed.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await replaceTankCalibrationPoints(organizationId, tank.id, parsed);
      queryClient.setQueryData(queryKey, parsed);
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCsvFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await savePoints(parseCalibrationCsv(await file.text()));
  }

  async function handleXlsxFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const rows = await parseXlsxFile(file, organizationId);
      await savePoints(parseCalibrationRows(rows));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("states.error"));
      setSubmitting(false);
    }
  }

  function startEditing() {
    setEditRows(
      [...points]
        .sort((a, b) => a.heightMm - b.heightMm)
        .map((p) => ({ heightMm: String(p.heightMm), volumeLiters: String(p.volumeLiters) }))
    );
    setEditing(true);
  }

  async function handleSaveManual() {
    const parsed = editRows
      .map((r) => ({ heightMm: Number(r.heightMm), volumeLiters: Number(r.volumeLiters) }))
      .filter((p) => Number.isFinite(p.heightMm) && Number.isFinite(p.volumeLiters));
    await savePoints(parsed);
  }

  async function handleExport(format: "csv" | "xlsx") {
    setExportMenuOpen(false);
    const headers = [t("height"), t("volume")];
    const rows = [...points].sort((a, b) => a.heightMm - b.heightMm).map((p) => [String(p.heightMm), String(p.volumeLiters)]);
    if (format === "csv") {
      downloadCsv(`calibration-${tank.displayName}.csv`, [headers, ...rows]);
      return;
    }
    await exportTable("xlsx", `calibration-${tank.displayName}`, headers, rows, organizationId);
  }

  const maxHeight = points.length > 0 ? Math.max(...points.map((p) => p.heightMm)) : 0;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("title", { tank: tank.displayName })} closeLabel={tCommon("actions.close")}>
      {(error || fetchError) && <Alert tone="error">{error ?? fetchError}</Alert>}
      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12 justify-self-end" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12 justify-self-end" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12 justify-self-end" />
          </div>
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      ) : editing ? (
        <div className="flex flex-col gap-3">
          <div className="max-h-64 overflow-y-auto rounded-card border border-border-subtle p-2">
            <div className="flex flex-col gap-2">
              {editRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    aria-label={t("height")}
                    value={row.heightMm}
                    onChange={(e) => setEditRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, heightMm: e.target.value } : r)))}
                    className="w-28"
                  />
                  <Input
                    type="number"
                    aria-label={t("volume")}
                    value={row.volumeLiters}
                    onChange={(e) => setEditRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, volumeLiters: e.target.value } : r)))}
                    className="w-28"
                  />
                  <button
                    type="button"
                    aria-label={t("removeRow")}
                    onClick={() => setEditRows((rows) => rows.filter((_, idx) => idx !== i))}
                    className="text-text-muted hover:text-error"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => setEditRows((rows) => [...rows, { heightMm: "", volumeLiters: "" }])}>
            <Plus className="size-4" aria-hidden />
            {t("addRow")}
          </Button>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setEditing(false)}>
              {tCommon("actions.cancel")}
            </Button>
            <Button size="sm" type="button" loading={submitting} onClick={handleSaveManual}>
              {tCommon("actions.save")}
            </Button>
          </div>
        </div>
      ) : points.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-body-sm text-text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-2 gap-2 text-body-sm">
            <dt className="text-text-muted">{t("pointCount")}</dt>
            <dd className="text-right font-semibold tabular-nums text-text">{points.length}</dd>
            <dt className="text-text-muted">{t("maxHeight")}</dt>
            <dd className="text-right font-semibold tabular-nums text-text">{Math.round(maxHeight)} mm</dd>
            <dt className="text-text-muted">{t("tankHeight")}</dt>
            <dd className="text-right font-semibold tabular-nums text-text">{tank.tankHeightMm ? Math.round(tank.tankHeightMm) : "—"} mm</dd>
          </dl>
          <div className="max-h-48 overflow-y-auto rounded-card border border-border-subtle">
            <table className="w-full text-caption">
              <thead>
                <tr className="border-b border-border-subtle text-text-muted">
                  <th className="p-2 text-left">{t("height")}</th>
                  <th className="p-2 text-right">{t("volume")}</th>
                </tr>
              </thead>
              <tbody>
                {points
                  .sort((a, b) => a.heightMm - b.heightMm)
                  .map((p, i) => (
                    <tr key={i} className="border-b border-border-subtle/60">
                      <td className="p-2">{p.heightMm} mm</td>
                      <td className="p-2 text-right tabular-nums">{formatLiters(p.volumeLiters)} L</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!editing && (
        <>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFileChange} />
          <input
            ref={xlsxInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleXlsxFileChange}
          />
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            {points.length > 0 && (
              <div className="relative">
                <Button variant="outline" size="sm" type="button" onClick={() => setExportMenuOpen((v) => !v)}>
                  {t("export")}
                </Button>
                <DropdownMenu open={exportMenuOpen}>
                  <DropdownMenuItem onClick={() => handleExport("csv")}>CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
                </DropdownMenu>
              </div>
            )}
            <Button size="sm" variant="outline" type="button" onClick={startEditing}>
              {t("editManually")}
            </Button>
            <Button size="sm" variant="outline" loading={submitting} onClick={() => csvInputRef.current?.click()}>
              {points.length > 0 ? t("replace") : t("upload")}
            </Button>
            <Button size="sm" variant="outline" loading={submitting} onClick={() => xlsxInputRef.current?.click()}>
              {t("importXlsx")}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
