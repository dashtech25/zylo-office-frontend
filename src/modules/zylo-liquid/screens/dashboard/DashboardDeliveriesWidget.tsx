"use client";

import { Truck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listDeliveryDeclarations, type DeliveryDeclaration, type FuelProduct, type Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, Card, Modal } from "@/shared/ui";

import { DeliveryDetailModal } from "../deliveries/DeliveryDetailModal";
import { useDeliveriesList, type DeliveryRow } from "../deliveries/useDeliveriesList";

const MAX_VISIBLE = 5;

type MergedRow =
  | { kind: "detected"; at: string; row: DeliveryRow }
  | { kind: "declared"; at: string; declaration: DeliveryDeclaration };

/** Widget « livraisons » du tableau de bord — fusionne les livraisons
 * détectées automatiquement (`useDeliveriesList`, déjà résolu
 * station/cuve/produit/valorisation, réutilisé tel quel) et les livraisons
 * déclarées (`listDeliveryDeclarations`, réseau entier, pas d'équivalent
 * hook existant donc requête directe ici) en une seule liste triée par date
 * décroissante. Le clic ouvre toujours une modale (jamais de redirection
 * vers /zylo-liquid/livraisons) — `DeliveryDetailModal` (avec mesures) pour
 * une livraison détectée, une modale déclarative plus simple (pas de mesure
 * télémétrique associée à une simple déclaration) pour une déclarée. */
export function DashboardDeliveriesWidget({ organizationId, stations, fuelProducts }: { organizationId: string; stations: Station[]; fuelProducts: FuelProduct[] }) {
  const t = useTranslations("zyloLiquid.deliveriesWidget");
  const tDeliveries = useTranslations("zyloLiquid.stationAdmin.deliveries");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const detected = useDeliveriesList(organizationId, {});
  const declaredQuery = useQuery({
    queryKey: ["zylo-liquid", "dashboard-declared-deliveries", organizationId],
    queryFn: () => listDeliveryDeclarations(organizationId, { limit: 10 }),
    enabled: !!organizationId,
  });
  const declared = declaredQuery.data?.data ?? [];

  const [selectedDetectedId, setSelectedDetectedId] = useState<string | null>(null);
  const [selectedDeclaredId, setSelectedDeclaredId] = useState<string | null>(null);

  const merged: MergedRow[] = [
    ...detected.rows.slice(0, 10).map((row): MergedRow => ({ kind: "detected", at: row.delivery.endTime, row })),
    ...declared.map((d): MergedRow => ({ kind: "declared", at: d.eventAt, declaration: d })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, MAX_VISIBLE);

  const loading = detected.loading || declaredQuery.isPending;

  const selectedDetectedRow = detected.rows.find((r) => r.delivery.id === selectedDetectedId) ?? null;
  const selectedDeclaration = declared.find((d) => d.id === selectedDeclaredId) ?? null;

  function formatRelativeTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Card>
      <h3 className="mb-3 text-h3 font-semibold text-text">{t("title")}</h3>
      {loading ? (
        <p className="text-body-sm text-text-muted">{t("loading")}</p>
      ) : merged.length === 0 ? (
        <p className="text-body-sm text-text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {merged.map((item) => {
            const station = item.kind === "detected" ? item.row.station : stations.find((s) => s.id === item.declaration.stationId);
            const volume = item.kind === "detected" ? item.row.delivery.volumeLiters : item.declaration.declaredVolumeLiters;
            return (
              <li key={`${item.kind}-${item.kind === "detected" ? item.row.delivery.id : item.declaration.id}`}>
                <button
                  type="button"
                  onClick={() => (item.kind === "detected" ? setSelectedDetectedId(item.row.delivery.id) : setSelectedDeclaredId(item.declaration.id))}
                  className="flex w-full items-start gap-2 rounded-card px-1 py-2 text-left transition-colors hover:bg-surface-muted"
                >
                  <Truck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-text">{station?.name ?? "—"}</p>
                    <p className="text-caption text-text-muted">{volume != null ? `${Math.round(volume).toLocaleString()} L` : "—"}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={item.kind === "detected" ? "success" : "info"}>{t(`type.${item.kind}`)}</Badge>
                    <span className="text-caption text-text-muted">{formatRelativeTime(item.at)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedDetectedRow && <DeliveryDetailModal organizationId={organizationId} row={selectedDetectedRow} onClose={() => setSelectedDetectedId(null)} />}

      {selectedDeclaration && (
        <Modal open onOpenChange={(next) => !next && setSelectedDeclaredId(null)} title={tDeliveries("detail.title")} size="lg" closeLabel={tCommon("actions.close")}>
          <div className="flex flex-col gap-5">
            <Badge tone={selectedDeclaration.lifecycleStatus === "locked" ? "neutral" : "info"}>{tDeliveries(`lifecycle.${selectedDeclaration.lifecycleStatus}`)}</Badge>
            <dl className="grid grid-cols-1 gap-3 text-body-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted">{tDeliveries("detail.fuelProduct")}</dt>
                <dd className="text-text">{fuelProducts.find((p) => p.id === selectedDeclaration.fuelProductId)?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">{tDeliveries("detail.supplier")}</dt>
                <dd className="text-text">{selectedDeclaration.supplierName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">{tDeliveries("detail.eventAt")}</dt>
                <dd className="text-text">{format.dateTime(new Date(selectedDeclaration.eventAt), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</dd>
              </div>
              <div>
                <dt className="text-text-muted">{tDeliveries("detail.declaredVolume")}</dt>
                <dd className="tabular-nums text-text">{selectedDeclaration.declaredVolumeLiters.toLocaleString()} L</dd>
              </div>
              <div>
                <dt className="text-text-muted">{tDeliveries("detail.noteReference")}</dt>
                <dd className="text-text">{selectedDeclaration.deliveryNoteReference ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">{t("station")}</dt>
                <dd className="text-text">{stations.find((s) => s.id === selectedDeclaration.stationId)?.name ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </Modal>
      )}
    </Card>
  );
}
