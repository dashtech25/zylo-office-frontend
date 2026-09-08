"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { Card } from "@/shared/ui";

import { DeliveriesTable } from "./DeliveriesTable";
import type { DeliveryRow, DeliveryStationGroup } from "./useDeliveriesList";

/** Un composant par station repliable, colocalisé ici (aucun autre écran
 * n'a besoin de ce pattern pour l'instant — pas de promotion prématurée
 * vers un composant générique "Accordion" du module). Le clic déplie la
 * liste de ses livraisons dans la même page, sans navigation. */
export function StationDeliveryGroup({ group, onRowClick }: { group: DeliveryStationGroup; onRowClick: (row: DeliveryRow) => void }) {
  const t = useTranslations("zyloLiquid.deliveries");
  const [open, setOpen] = useState(false);

  return (
    <Card padding="none">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-2 font-semibold text-text">
          {open ? <ChevronDown className="size-4 text-text-muted" aria-hidden /> : <ChevronRight className="size-4 text-text-muted" aria-hidden />}
          {group.station.name}
        </span>
        <span className="flex items-center gap-4 text-body-sm text-text-muted">
          <span>{t("stationGroup.count", { count: group.count })}</span>
          <span>{t("stationGroup.volume", { volume: `${formatLiters(group.volumeLiters)} L` })}</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-border-subtle p-4">
          <DeliveriesTable rows={group.rows} onRowClick={onRowClick} />
        </div>
      )}
    </Card>
  );
}
