"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CreateStationModal } from "@/modules/zylo-liquid/components/CreateStationModal";
import { StationsMap } from "@/modules/zylo-liquid/components/StationsMap";
import { deactivateStation, reactivateStation, type City, type Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, CardSectionHeader, InfoRow } from "@/shared/ui";

const OPERATIONAL_STATUS_TONE = { active: "success", maintenance: "warning", inactive: "neutral" } as const;

/** Centre d'administration de la station (mission « amélioration zylo
 * liquid », page de station.docx : « ça doit être un véritable centre
 * d'administration ») — regroupe, à un seul endroit accessible directement
 * depuis la fiche station, toute la configuration déjà exposée ailleurs
 * (modal Modifier) + l'action ouvrir/fermer + une carte de position, plutôt
 * que de dupliquer le formulaire complet. La modification elle-même passe
 * par le même modal que le bouton « Modifier » du header (source unique de
 * vérité, mêmes appels `updateStation`). */
export function AdministrationTab({
  organizationId,
  station,
  city,
  onReload,
}: {
  organizationId: string;
  station: Station;
  city: City | null;
  onReload: () => void;
}) {
  const t = useTranslations("zyloLiquid.stationDetail.administrationTab");
  const tDetail = useTranslations("zyloLiquid.stationDetail");
  const tCommon = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  const closedWeekdayLabels = (station.closedWeekdays ?? "")
    .split(",")
    .filter((d) => d.trim() !== "")
    .map((d) => t(`weekdayShort.${d}` as const));

  async function handleToggleStatus() {
    setStatusActionError(null);
    const confirmMessage = station.status === "active" ? tDetail("confirmDeactivate") : tDetail("confirmReactivate");
    if (!window.confirm(confirmMessage)) return;
    setStatusActionLoading(true);
    try {
      if (station.status === "active") {
        await deactivateStation(organizationId, station.id);
      } else {
        await reactivateStation(organizationId, station.id);
      }
      onReload();
    } catch (err) {
      setStatusActionError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setStatusActionLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {statusActionError && <Alert tone="error">{statusActionError}</Alert>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardSectionHeader title={t("infoTitle")} action={<Button size="sm" onClick={() => setEditOpen(true)}>{tDetail("actions.edit")}</Button>} />
          <InfoRow label={t("fields.name")} value={station.name} />
          <InfoRow label={t("fields.code")} value={station.code} mono />
          <InfoRow label={t("fields.location")} value={city ? `${city.name}` : t("fields.noCity")} />
          <InfoRow label={t("fields.address")} value={station.address ?? t("fields.notSet")} />
          <InfoRow label={t("fields.phone")} value={station.phone ?? t("fields.notSet")} />
          <InfoRow label={t("fields.email")} value={station.email ?? t("fields.notSet")} />
          <InfoRow
            label={t("fields.hours")}
            value={station.is24h ? t("fields.hours24h") : `${station.openingTime} – ${station.closingTime}`}
          />
          <InfoRow
            label={t("fields.closedWeekdays")}
            value={closedWeekdayLabels.length > 0 ? closedWeekdayLabels.join(", ") : t("fields.closedWeekdaysNone")}
          />
          <InfoRow label={t("fields.notes")} value={station.notes ?? t("fields.notSet")} />

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-text-muted">{t("fields.operationalStatus")}</span>
              <Badge tone={OPERATIONAL_STATUS_TONE[station.status]} dot>
                {tDetail(`operationalStatus.${station.status}`)}
              </Badge>
            </div>
            <Button variant="outline" size="sm" loading={statusActionLoading} onClick={handleToggleStatus}>
              {station.status === "active" ? tDetail("actions.deactivate") : tDetail("actions.reactivate")}
            </Button>
          </div>
        </Card>

        <Card>
          <CardSectionHeader title={t("mapTitle")} />
          {station.latitude !== null && station.longitude !== null ? (
            <StationsMap
              stations={[
                {
                  id: station.id,
                  name: station.name,
                  latitude: station.latitude,
                  longitude: station.longitude,
                  status: station.status === "active" ? "online" : "offline",
                },
              ]}
              height={280}
            />
          ) : (
            <p className="text-body-sm text-text-muted">{t("mapNoPosition")}</p>
          )}
        </Card>
      </div>

      <CreateStationModal organizationId={organizationId} open={editOpen} onOpenChange={setEditOpen} onCreated={onReload} station={station} />
    </div>
  );
}
