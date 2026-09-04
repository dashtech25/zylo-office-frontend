"use client";

import { AlertTriangle, Droplet, MoreVertical, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { deactivateStation, reactivateStation, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { ActivityRow, Alert, Badge, Button, Card, CardSectionHeader, DropdownMenu, DropdownMenuItem, EmptyState, PageHeader, Stack } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { CreateStationModal } from "@/modules/zylo-liquid/components/CreateStationModal";
import { AddTankModal } from "./AddTankModal";
import { CalibrationModal } from "@/modules/zylo-liquid/components/CalibrationModal";
import { TankCard } from "./TankCard";
import { useStationDetail } from "./useStationDetail";

const STATUS_TONE = { critical: "error", alert: "warning", offline: "neutral", online: "success" } as const;

/** Reconstruit la page détail d'une station selon la spécification détaillée
 * fournie par le commanditaire (ZoneA-D).
 *
 * Deux écarts assumés avec la spécification, documentés plutôt que
 * masqués : le champ "Gérant" (ligne d'info secondaire, modal Modifier)
 * n'existe sur aucune colonne de `Station` — omis, jamais inventé. La
 * colonne Livraisons ne montre pas de "Livreur" : aucune entité fournisseur
 * n'existe au Niveau 1 (déjà noté sur la page Livraisons/PR #24). */
export default function StationDetailScreen() {
  const params = useParams<{ stationId: string }>();
  const stationId = params.stationId;
  const t = useTranslations("zyloLiquid.stationDetail");
  const tAlerts = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useStationDetail(currentOrganization?.id ?? null, stationId);

  const [editOpen, setEditOpen] = useState(false);
  const [addTankOpen, setAddTankOpen] = useState(false);
  const [calibrationTank, setCalibrationTank] = useState<Tank | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function formatVolume(liters: number): string {
    return `${formatLiters(liters)} L`;
  }
  function formatTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function minutesAgo(iso: string): number {
    // Math.max(0, ...) : une mesure horodatée dans le futur par rapport à
    // l'horloge du navigateur (dérive d'horloge du simulateur de démo,
    // donnée réelle mais non fiable pour un calcul de fraîcheur) ne doit
    // jamais s'afficher comme un nombre de minutes négatif — traitée comme
    // "à l'instant" plutôt que dans un sens ou l'autre.
    return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleToggleStatus() {
    if (!currentOrganization || !data.station) return;
    setMenuOpen(false);
    setStatusActionError(null);
    try {
      if (data.station.status === "active") {
        if (!window.confirm(t("confirmDeactivate"))) return;
        await deactivateStation(currentOrganization.id, data.station.id);
      } else {
        if (!window.confirm(t("confirmReactivate"))) return;
        await reactivateStation(currentOrganization.id, data.station.id);
      }
      data.reload();
    } catch (err) {
      setStatusActionError(err instanceof Error ? err.message : tCommon("states.error"));
    }
  }

  if (data.loading) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }
  if (!data.station) {
    return <EmptyState icon={AlertTriangle} title={tCommon("states.error")} description={data.error ?? undefined} />;
  }

  const { station } = data;
  const activeTanks = data.tanks.filter((tank) => tank.active);
  const city = station.cityId ? data.cities.find((c) => c.id === station.cityId) : null;

  const tankStates = activeTanks.map((tank) => data.tankStateById.get(tank.id)).filter((s): s is NonNullable<typeof s> => !!s);
  const stationOnline = tankStates.some((s) => s.sensorStatus === "online");
  const criticalAlert = data.alerts.some((a) => a.type === "leak" || a.type === "level_high");
  const stationState: "offline" | "critical" | "alert" | "online" = !stationOnline ? "offline" : criticalAlert ? "critical" : data.alerts.length > 0 ? "alert" : "online";

  const lastStationSync = tankStates.reduce<string | null>((latest, s) => {
    if (!s.lastMeasurementAt) return latest;
    return !latest || s.lastMeasurementAt > latest ? s.lastMeasurementAt : latest;
  }, null);

  const activeLeakAlerts = data.alerts.filter((a) => a.type === "leak");
  const anomalyLeaksByTank = new Map<string, (typeof data.leakEvents)[number]>();
  for (const leak of data.leakEvents.filter((l) => l.result === "anomaly")) {
    const existing = anomalyLeaksByTank.get(leak.tankId);
    if (!existing || leak.endTime > existing.endTime) anomalyLeaksByTank.set(leak.tankId, leak);
  }

  return (
    <Stack>
      <PageHeader
        breadcrumbs={[{ label: t("backLink"), href: "/zylo-liquid/stations" }, { label: station.name }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {station.name}
            <Badge tone={STATUS_TONE[stationState]} dot>
              {t(`status.${stationState}`)}
            </Badge>
          </span>
        }
        description={`${city ? city.name : "—"} · ${lastStationSync ? t("sync", { minutes: minutesAgo(lastStationSync) }) : t("syncNever")}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 no-print">
            <Button variant="outline" size="sm" onClick={() => scrollTo("deliveries-column")}>
              <Truck className="size-4" aria-hidden />
              {t("actions.deliveries")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => scrollTo("leaks-column")}>
              <Droplet className="size-4" aria-hidden />
              {t("actions.leaks")}
            </Button>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              {t("actions.edit")}
            </Button>
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
                <MoreVertical className="size-4" aria-hidden />
              </Button>
              <DropdownMenu open={menuOpen} menuRef={menuRef}>
                <DropdownMenuItem onClick={handleToggleStatus}>{station.status === "active" ? t("actions.deactivate") : t("actions.reactivate")}</DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        }
      />

      {statusActionError && <Alert tone="error">{statusActionError}</Alert>}

      {data.alerts.length > 0 && (
        <Alert tone={criticalAlert ? "error" : "warning"} title={t("alertsBanner.count", { count: data.alerts.length })}>
          {data.alerts
            .slice(0, 4)
            .map((a) => {
              const tank = data.tanks.find((tk) => tk.id === a.tankId);
              return `${tAlerts(`types.${a.type}`)} · ${tank?.displayName ?? "?"}`;
            })
            .join(" | ")}{" "}
          <button type="button" onClick={() => scrollTo("alerts-column")} className="font-medium text-primary hover:underline">
            {t("alertsBanner.viewAll")}
          </button>
        </Alert>
      )}

      <Card>
        <CardSectionHeader
          title={t("tanksSection.title")}
          action={
            <Button variant="outline" size="sm" onClick={() => setAddTankOpen(true)}>
              {t("tanksSection.addTank")}
            </Button>
          }
        />
        <p className="-mt-1 mb-3 text-body-sm text-text-muted">{t("tanksSection.activeCount", { count: activeTanks.length })}</p>

        {activeTanks.length === 0 ? (
          <EmptyState title={t("tanksSection.empty")} />
        ) : (
          <Stack gap="sm">
            {activeTanks.map((tank) => (
              <TankCard
                key={tank.id}
                tank={tank}
                state={data.tankStateById.get(tank.id) ?? null}
                fuelProduct={data.fuelProductById.get(tank.fuelProductId) ?? null}
                calibrationPoints={data.calibrationByTank[tank.id] ?? []}
                stationAlerts={data.alerts}
                stationId={stationId}
                onOpenCalibration={() => setCalibrationTank(tank)}
              />
            ))}
          </Stack>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card id="alerts-column">
          <CardSectionHeader
            title={t("columns.alerts.title", { count: data.alerts.length })}
            action={
              <Link href={`/zylo-liquid/alerts?station=${stationId}`} className="text-caption font-medium text-primary hover:underline">
                {t("columns.viewAll")}
              </Link>
            }
          />
          {data.alerts.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("columns.alerts.empty")}</p>
          ) : (
            data.alerts.map((a) => {
              const tank = data.tanks.find((tk) => tk.id === a.tankId);
              const critical = a.type === "leak" || a.type === "level_high";
              return (
                <ActivityRow
                  key={a.id}
                  icon={AlertTriangle}
                  iconTone={critical ? "error" : "warning"}
                  title={tAlerts(`types.${a.type}`)}
                  meta={tank?.displayName ?? "?"}
                  trailing={<span className="text-caption text-text-muted">{minutesAgo(a.triggeredAt)} min</span>}
                />
              );
            })
          )}
        </Card>

        <Card id="deliveries-column">
          <CardSectionHeader
            title={t("columns.deliveries.title", { count: data.deliveries.length })}
            action={
              <Link href={`/zylo-liquid/livraisons?station=${stationId}`} className="text-caption font-medium text-primary hover:underline">
                {t("columns.viewAll")}
              </Link>
            }
          />
          {data.deliveries.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("columns.deliveries.empty")}</p>
          ) : (
            data.deliveries.map((d) => {
              const tank = data.tanks.find((tk) => tk.id === d.tankId);
              const product = tank ? data.fuelProductById.get(tank.fuelProductId) : null;
              return (
                <ActivityRow
                  key={d.id}
                  icon={Truck}
                  iconTone="success"
                  title={`${(product?.name ?? "?").toUpperCase()} · ${tank?.displayName ?? "?"}`}
                  meta={`+${formatVolume(d.volumeLiters ?? 0)}`}
                  trailing={<span className="text-caption text-text-muted">{formatTime(d.endTime)}</span>}
                />
              );
            })
          )}
        </Card>

        <Card id="leaks-column">
          <CardSectionHeader
            title={<span className={activeLeakAlerts.length > 0 ? "text-error" : undefined}>{t("columns.leaks.title", { count: activeLeakAlerts.length })}</span>}
            action={
              <Link href={`/zylo-liquid/fuites?station=${stationId}`} className="text-caption font-medium text-primary hover:underline">
                {t("columns.viewAll")}
              </Link>
            }
          />
          {activeLeakAlerts.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("columns.leaks.empty")}</p>
          ) : (
            activeLeakAlerts.map((a) => {
              const tank = data.tanks.find((tk) => tk.id === a.tankId);
              const product = tank ? data.fuelProductById.get(tank.fuelProductId) : null;
              const rate = anomalyLeaksByTank.get(a.tankId)?.leakRateLph;
              return (
                <ActivityRow
                  key={a.id}
                  icon={Droplet}
                  iconTone="error"
                  title={`${tank?.displayName ?? "?"} ${product?.name ?? ""}`}
                  meta={
                    <>
                      {rate != null && <span className="text-error">{t("columns.leaks.rate", { rate: format.number(rate, { maximumFractionDigits: 1 }) })} · </span>}
                      {formatTime(a.triggeredAt)}
                    </>
                  }
                  trailing={
                    <Badge tone="error" dot>
                      {t("columns.leaks.status")}
                    </Badge>
                  }
                />
              );
            })
          )}
        </Card>
      </div>

      {currentOrganization && (
        <>
          <CreateStationModal organizationId={currentOrganization.id} open={editOpen} onOpenChange={setEditOpen} onCreated={data.reload} station={station} />
          <AddTankModal
            organizationId={currentOrganization.id}
            stationId={stationId}
            fuelProducts={data.fuelProducts}
            existingTankNumbers={data.tanks.map((tk) => tk.tankNumber)}
            open={addTankOpen}
            onOpenChange={setAddTankOpen}
            onCreated={data.reload}
          />
          {calibrationTank && (
            <CalibrationModal
              organizationId={currentOrganization.id}
              tank={calibrationTank}
              open={!!calibrationTank}
              onOpenChange={(open) => !open && setCalibrationTank(null)}
              onUpdated={data.reload}
            />
          )}
        </>
      )}
    </Stack>
  );
}
