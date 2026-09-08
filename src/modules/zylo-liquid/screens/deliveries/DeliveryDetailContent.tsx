"use client";

import { useFormatter, useTranslations } from "next-intl";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatMoney } from "@/modules/zylo-liquid/utils/formatMoney";
import { InfoRow } from "@/shared/ui";

import { DeliveryMeasurementsSection } from "./DeliveryMeasurementsSection";
import { useDeliveryMeasurements } from "./useDeliveryMeasurements";
import type { DeliveryRow } from "./useDeliveriesList";

/** Contenu du détail d'une livraison confirmée — extrait de
 * `DeliveryDetailModal` pour être réutilisé tel quel par les modales
 * maître/détail ouvertes depuis une station ou une cuve (jamais une
 * deuxième définition de ce détail). `DeliveryDetailModal` reste le seul
 * endroit qui l'enveloppe dans une `Modal` de premier niveau. */
export function DeliveryDetailContent({ organizationId, row }: { organizationId: string; row: DeliveryRow }) {
  const t = useTranslations("zyloLiquid.deliveries");
  const format = useFormatter();
  const { delivery, tank, station, fuelProduct, valueAmount, currencyCode } = row;
  const { loading, measurements } = useDeliveryMeasurements(organizationId, delivery.tankId, delivery.startTime, delivery.endTime);

  const durationMinutes = Math.round((new Date(delivery.endTime).getTime() - new Date(delivery.startTime).getTime()) / 60000);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-x-8 rounded-card border border-border-subtle p-4 sm:grid-cols-2">
        <InfoRow label={t("table.station")} value={station?.name ?? "—"} />
        <InfoRow label={t("table.tank")} value={`${tank?.displayName ?? "—"} · ${fuelProduct?.name ?? "—"}`} />
        <InfoRow label={t("detail.duration")} value={`${durationMinutes} min`} mono />
        <InfoRow label={t("detail.heightBefore")} value={`${format.number(delivery.startHeightMm)} mm`} mono />
        <InfoRow label={t("detail.heightAfter")} value={`${format.number(delivery.endHeightMm)} mm`} mono />
        <InfoRow label={t("detail.volume")} value={delivery.volumeLiters === null ? "—" : `${formatLiters(delivery.volumeLiters)} L`} mono />
        <InfoRow
          label={t("detail.value")}
          value={valueAmount !== null && currencyCode ? formatMoney(format, valueAmount, currencyCode) : t("summary.valueNotCalculable")}
          mono
        />
      </div>
      {valueAmount !== null && <p className="text-caption text-text-muted">{t("detail.valueHint")}</p>}

      <DeliveryMeasurementsSection loading={loading} measurements={measurements} />
    </div>
  );
}
