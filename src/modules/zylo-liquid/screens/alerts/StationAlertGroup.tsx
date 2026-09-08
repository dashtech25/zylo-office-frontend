"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge, Card, Stack } from "@/shared/ui";

import { AlertRow } from "./AlertRow";
import type { AlertStationGroup } from "./useAlertsList";

/** Un composant par station repliable, colocalisé ici (même pattern que
 * `StationDeliveryGroup` côté livraisons — aucun autre écran n'a besoin de
 * ce pattern pour l'instant, pas de promotion prématurée vers un
 * composant générique "Accordion" du module). Le clic déplie la liste de
 * ses alertes dans la même page, sans navigation. */
export function StationAlertGroup({
  group,
  resolvingId,
  onResolve,
}: {
  group: AlertStationGroup;
  resolvingId: string | null;
  onResolve: (alertId: string) => void;
}) {
  const t = useTranslations("zyloLiquid.alerts");
  const [open, setOpen] = useState(false);

  return (
    <Card padding="none">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-2 font-semibold text-text">
          {open ? <ChevronDown className="size-4 text-text-muted" aria-hidden /> : <ChevronRight className="size-4 text-text-muted" aria-hidden />}
          {group.station.name}
        </span>
        <span className="flex items-center gap-3 text-body-sm text-text-muted">
          {group.activeCount > 0 && (
            <Badge tone="error" dot>
              {t("stationGroup.active", { count: group.activeCount })}
            </Badge>
          )}
          <span>{t("stationGroup.count", { count: group.count })}</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-border-subtle p-4">
          <Stack gap="sm">
            {group.rows.map((row) => (
              <AlertRow key={row.alert.id} row={row} resolvingId={resolvingId} onResolve={onResolve} />
            ))}
          </Stack>
        </div>
      )}
    </Card>
  );
}
