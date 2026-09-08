"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Truck } from "lucide-react";

import { DeliveryDetailContent } from "@/modules/zylo-liquid/screens/deliveries/DeliveryDetailContent";
import { DeliveriesTable } from "@/modules/zylo-liquid/screens/deliveries/DeliveriesTable";
import { useDeliveriesList, type DeliveryRow } from "@/modules/zylo-liquid/screens/deliveries/useDeliveriesList";
import { Button, EmptyState, Input, Modal, Stack } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

/** Modale maître/détail des livraisons d'une station OU d'une cuve (l'un ou
 * l'autre, jamais les deux) — ouverte depuis `StationDetailScreen` et
 * `TankDetailScreen` (2 écrans, d'où la promotion en composant module au
 * lieu d'une colocalisation dans `screens/deliveries/`). Réutilise
 * intégralement `useDeliveriesList`, `DeliveriesTable` et
 * `DeliveryDetailContent` — jamais une deuxième implémentation de la liste
 * ou du détail des livraisons. Remplace la redirection vers la page globale
 * `/zylo-liquid/livraisons` : l'utilisateur reste dans le contexte de la
 * station/cuve qu'il consultait (parcours raccourci, cf. demande produit). */
export function DeliveriesBrowserModal({
  organizationId,
  open,
  onOpenChange,
  title,
  stationId,
  tankId,
  initialDeliveryId,
}: {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  stationId?: string;
  tankId?: string;
  /** Ouvre directement sur le détail de cette livraison (clic depuis la
   * ligne "récente" de la station/cuve) — jamais un objet `DeliveryRow`
   * pré-construit à la main : la valorisation (prix en vigueur) ne serait
   * pas chargée, on retrouve la ligne complète par id une fois
   * `useDeliveriesList` chargé plutôt que d'afficher une valeur tronquée. */
  initialDeliveryId?: string | null;
}) {
  const t = useTranslations("zyloLiquid.deliveries");
  const tCommon = useTranslations("common");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialDeliveryId ?? null);

  const filters = useMemo(
    () => ({
      stationId,
      tankId,
      fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDate: toDate ? new Date(toDate).toISOString() : undefined,
    }),
    [stationId, tankId, fromDate, toDate]
  );
  const data = useDeliveriesList(organizationId, filters);

  // La modale reste montée en permanence — sans cet effet, cliquer sur une
  // 2e livraison différente depuis la station/cuve ne changerait jamais la
  // sélection (`useState` ne se ré-initialise qu'au montage).
  useEffect(() => {
    if (open) setSelectedId(initialDeliveryId ?? null);
  }, [open, initialDeliveryId]);

  const selected: DeliveryRow | null = selectedId ? data.rows.find((row) => row.delivery.id === selectedId) ?? null : null;

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedId(null);
    onOpenChange(next);
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      size="full"
      closeLabel={tCommon("actions.close")}
      title={selected ? t("detail.title", { station: selected.station?.name ?? "—" }) : title}
    >
      {selected ? (
        <Stack>
          <Button variant="link" size="inline" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="size-4" aria-hidden />
            {tCommon("actions.back")}
          </Button>
          <DeliveryDetailContent organizationId={organizationId} row={selected} />
        </Stack>
      ) : (
        <Stack>
          <div className="flex flex-wrap gap-3">
            <div className="w-full sm:w-44">
              <Input type="date" aria-label={t("filters.fromDate")} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="w-full sm:w-44">
              <Input type="date" aria-label={t("filters.toDate")} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          {data.loading ? (
            <PageSpinner label={tCommon("states.loading")} />
          ) : data.rows.length === 0 ? (
            <EmptyState icon={Truck} title={t("empty")} />
          ) : (
            <DeliveriesTable rows={data.rows} onRowClick={(row) => setSelectedId(row.delivery.id)} />
          )}
        </Stack>
      )}
    </Modal>
  );
}
