"use client";

import { useFormatter, useTranslations } from "next-intl";

import { Modal } from "@/shared/ui";

import { DeliveryDetailContent } from "./DeliveryDetailContent";
import type { DeliveryRow } from "./useDeliveriesList";

/** Modale plein écran (Modal size="full", déjà utilisée par la création de
 * station) — détails clés de la livraison confirmée + chaque mesure réelle
 * de la sonde pendant sa fenêtre de détection. Le contenu est factorisé dans
 * `DeliveryDetailContent`, réutilisé tel quel par les modales maître/détail
 * ouvertes depuis une station ou une cuve. Pour une livraison encore en
 * cours, voir `DeliveryInProgressDetailModal` (même section de mesures,
 * réutilisée). */
export function DeliveryDetailModal({ organizationId, row, onClose }: { organizationId: string; row: DeliveryRow; onClose: () => void }) {
  const t = useTranslations("zyloLiquid.deliveries");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { delivery, station } = row;

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
      description={t("detail.period", { start: formatDateTime(delivery.startTime), end: formatDateTime(delivery.endTime) })}
    >
      <DeliveryDetailContent organizationId={organizationId} row={row} />
    </Modal>
  );
}
