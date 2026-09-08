"use client";

import { useFormatter, useTranslations } from "next-intl";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { InfoRow, Modal } from "@/shared/ui";

import { DeliveryMeasurementsSection } from "./DeliveryMeasurementsSection";
import { useDeliveryMeasurements } from "./useDeliveryMeasurements";
import type { DeliveryInProgressRow } from "./useDeliveriesInProgress";

/** Symétrique de `DeliveryDetailModal`, pour une hausse encore en cours
 * (pas de `toDate` : les mesures vont jusqu'à l'instant présent, pas
 * jusqu'à une fin qui n'existe pas encore côté base — rien de persisté
 * n'est lu ni créé ici). */
export function DeliveryInProgressDetailModal({ organizationId, row, onClose }: { organizationId: string; row: DeliveryInProgressRow; onClose: () => void }) {
  const t = useTranslations("zyloLiquid.deliveries");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { delivery, tank, station, fuelProduct, volumeSoFarLiters } = row;
  const { loading, measurements } = useDeliveryMeasurements(organizationId, delivery.tankId, delivery.startTime, null);

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      size="full"
      closeLabel={tCommon("actions.close")}
      title={t("detail.title", { station: station?.name ?? "—" })}
      description={t("inProgress.detailPeriod", { start: formatDateTime(delivery.startTime) })}
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-x-8 rounded-card border border-border-subtle p-4 sm:grid-cols-2">
          <InfoRow label={t("table.tank")} value={`${tank?.displayName ?? "—"} · ${fuelProduct?.name ?? "—"}`} />
          <InfoRow label={t("inProgress.heightBefore")} value={`${format.number(delivery.startHeightMm)} mm`} mono />
          <InfoRow label={t("inProgress.heightNow")} value={`${format.number(delivery.currentHeightMm)} mm`} mono />
          <InfoRow
            label={t("inProgress.volumeSoFar")}
            value={volumeSoFarLiters === null ? "—" : `+${formatLiters(volumeSoFarLiters)} L`}
            mono
          />
        </div>
        <p className="text-caption text-text-muted">{t("inProgress.subtitle")}</p>

        <DeliveryMeasurementsSection loading={loading} measurements={measurements} />
      </div>
    </Modal>
  );
}
