"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { updateStation, type Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, Card, CardSectionHeader, FormField, Input } from "@/shared/ui";

/** Domaine « Infrastructure » du Centre administratif — nbPistes/
 * surfaceTotaleM2, déjà en base (`Station`) mais jamais exposés dans une UI
 * avant cette mission. Les cuves elles-mêmes restent un lien vers la page
 * station (Vue d'ensemble), jamais dupliquées ici. */
export function InfrastructureSection({ organizationId, station, onReload }: { organizationId: string; station: Station; onReload: () => void }) {
  const t = useTranslations("zyloLiquid.stationAdmin.infrastructure");
  const tCommon = useTranslations("common");

  const [nbPistes, setNbPistes] = useState(station.nbPistes !== null ? String(station.nbPistes) : "");
  const [surfaceTotaleM2, setSurfaceTotaleM2] = useState(station.surfaceTotaleM2 !== null ? String(station.surfaceTotaleM2) : "");
  const [exploitationType, setExploitationType] = useState(station.exploitationType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateStation(organizationId, station.id, {
        nbPistes: nbPistes ? Number(nbPistes) : undefined,
        surfaceTotaleM2: surfaceTotaleM2 ? Number(surfaceTotaleM2) : undefined,
        exploitationType: exploitationType || undefined,
      });
      onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardSectionHeader title={t("title")} action={<Button size="sm" loading={saving} onClick={handleSave}>{tCommon("actions.save")}</Button>} />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label={t("nbPistes")}>{(field) => <Input {...field} type="number" min={0} value={nbPistes} onChange={(e) => setNbPistes(e.target.value)} />}</FormField>
        <FormField label={t("surfaceTotaleM2")}>{(field) => <Input {...field} type="number" step="any" value={surfaceTotaleM2} onChange={(e) => setSurfaceTotaleM2(e.target.value)} />}</FormField>
        <FormField label={t("exploitationType")} hint={t("exploitationTypeHint")}>
          {(field) => <Input {...field} value={exploitationType} onChange={(e) => setExploitationType(e.target.value)} maxLength={20} />}
        </FormField>
      </div>
    </Card>
  );
}
