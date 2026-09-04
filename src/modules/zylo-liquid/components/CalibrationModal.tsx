"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/core/api/client";
import { listTankCalibrationPoints, replaceTankCalibrationPoints, type CalibrationPoint, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, Modal } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

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

export interface CalibrationModalProps {
  organizationId: string;
  tank: Tank;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

/** Consultation et remplacement de la table de calibration d'une cuve déjà
 * créée — endpoint 5, déjà en production, jusqu'ici seulement utilisé à la
 * création (AddTankModal). PUT remplace toujours la table entière (jamais
 * une fusion partielle), conforme au contrat de l'endpoint. */
export function CalibrationModal({ organizationId, tank, open, onOpenChange, onUpdated }: CalibrationModalProps) {
  const t = useTranslations("zyloLiquid.stationDetail.calibrationModal");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<CalibrationPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listTankCalibrationPoints(organizationId, tank.id)
      .then(setPoints)
      .catch((err) => setError(err instanceof ApiError ? err.message : tCommon("states.error")))
      .finally(() => setLoading(false));
  }, [open, organizationId, tank.id, tCommon]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCalibrationCsv(text);
    if (parsed.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await replaceTankCalibrationPoints(organizationId, tank.id, parsed);
      setPoints(parsed);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  const maxHeight = points.length > 0 ? Math.max(...points.map((p) => p.heightMm)) : 0;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("title", { tank: tank.displayName })} closeLabel={tCommon("actions.close")}>
      {error && <Alert tone="error">{error}</Alert>}
      {loading ? (
        <PageSpinner label={tCommon("states.loading")} />
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
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="outline" loading={submitting} onClick={() => fileInputRef.current?.click()}>
          {points.length > 0 ? t("replace") : t("upload")}
        </Button>
      </div>
    </Modal>
  );
}
