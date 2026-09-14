"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { getSystemDefaults } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert } from "@/shared/ui";
import { Skeleton } from "@/shared/ui/Skeleton";

import { SettingsSectionCard } from "./SettingsSectionCard";

function ReadOnlyValue({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-body-sm font-medium text-text">{label}</span>
      <span className="text-h4 font-mono font-semibold text-text">{value}</span>
      <span className="text-caption text-text-muted">{hint}</span>
    </div>
  );
}

function ReadOnlyValueSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/** Lecture seule : ces valeurs sont des constantes Python de
 * `algorithms.py` (GET /zylo-liquid/system-defaults), pas des réglages
 * persistés — aucune organisation ne peut aujourd'hui les changer. Les
 * deux sections de la maquette sans équivalent réel (sonde déconnectée,
 * tolérance livraison) sont volontairement absentes.
 *
 * Migré vers React Query : `staleTime: Infinity` car ce sont des constantes
 * serveur qui ne changent jamais en cours de session (pas de réglage
 * persisté à invalider) — inutile de les refetch à chaque montage de
 * l'onglet. Skeleton plutôt que `return null` pendant le chargement, pour
 * éviter le flash à blanc qu'avait l'ancienne version. */
export function SystemeTab({ organizationId }: { organizationId: string }) {
  const t = useTranslations("zyloLiquid.settingsPage");
  const { data: defaults, isPending } = useQuery({
    queryKey: ["zylo-liquid", "system-defaults", organizationId],
    queryFn: () => getSystemDefaults(organizationId),
    staleTime: Infinity,
  });

  if (isPending || !defaults) {
    return (
      <div className="flex flex-col gap-4">
        <SettingsSectionCard title={t("systeme.leakSectionTitle")}>
          <ReadOnlyValueSkeleton />
        </SettingsSectionCard>

        <SettingsSectionCard title={t("systeme.deliverySectionTitle")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnlyValueSkeleton />
            <ReadOnlyValueSkeleton />
          </div>
        </SettingsSectionCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSectionCard title={t("systeme.leakSectionTitle")}>
        <ReadOnlyValue label={t("systeme.leakThreshold")} value={`${defaults.leakThresholdLph} L/H`} hint={t("systeme.leakThresholdHint")} />
      </SettingsSectionCard>

      <SettingsSectionCard title={t("systeme.deliverySectionTitle")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyValue label={t("systeme.deliveryRiseThreshold")} value={`${defaults.deliveryRiseThresholdMm} mm`} hint={t("systeme.deliveryRiseThresholdHint")} />
          <ReadOnlyValue label={t("systeme.deliveryStabilization")} value={`${defaults.deliveryStabilizationMinutes} min`} hint={t("systeme.deliveryStabilizationHint")} />
        </div>
      </SettingsSectionCard>

      <Alert tone="info">{t("systeme.readOnlyNote")}</Alert>
      <p className="text-caption text-text-muted">{t("systeme.unavailableNote")}</p>
    </div>
  );
}
