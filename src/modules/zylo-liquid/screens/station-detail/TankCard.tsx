"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import type { Alert as AlertType, FuelProduct, Tank, TankCurrentState } from "@/modules/zylo-liquid/services/zyloLiquidApi";

import { usePermissions } from "@/core/rbac/PermissionContext";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { TankFigures } from "@/modules/zylo-liquid/components/TankVisual";
import { TankStatusBadge } from "@/modules/zylo-liquid/components/TankStatusBadge";
import { cn } from "@/shared/lib/cn";
import { Button, buttonVariants, Card } from "@/shared/ui";

import { productVisual } from "./tankCardHelpers";
import { TankGaugeColumn, type TankGaugeMode } from "./TankGaugeColumn";

// Même permission que celle qui protège déjà la valorisation monétaire du
// stock au niveau station (StationDetailScreen.tsx) — voir le commentaire
// détaillé là-bas. Reprise ici pour la même ligne "Valeur du stock" au
// niveau d'une cuve individuelle, jamais une nouvelle permission inventée.
const PRICE_HISTORY_READ = "zyloLiquid.priceHistory.read";

function freshnessOf(lastMeasurementAt: string | null): "ok" | "warn" | "off" {
  if (!lastMeasurementAt) return "off";
  const ageMin = Math.max(0, (Date.now() - new Date(lastMeasurementAt).getTime()) / 60000);
  if (ageMin < 15) return "ok";
  if (ageMin <= 60) return "warn";
  return "off";
}

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

const DOT_CLASS = { ok: "bg-success", warn: "bg-warning", off: "bg-error" } as const;

export interface TankCardProps {
  tank: Tank;
  state: TankCurrentState | null;
  fuelProduct: FuelProduct | null;
  stationAlerts: AlertType[];
  stationId: string;
  onOpenCalibration: () => void;
  gaugeMode: TankGaugeMode;
}

/** Vignette verticale (référence validée : grille de vignettes plutôt que
 * ligne pleine largeur) — en-tête (identité + statut), fraîcheur, jauge
 * (mode commutable, délégué à `TankGaugeColumn`/`TankVisual`), figures
 * (`TankFigures`, source unique déjà utilisée par `TanksNetworkScreen.tsx`
 * — réutilisée ici plutôt que dupliquée), puis actions. La légende des
 * seuils (valeurs mm exactes) n'est plus répétée sur chaque vignette : elle
 * reste accessible en un clic via "Détail cuve" (Niveau 3), qui l'affiche
 * déjà en entier — jamais perdue, seulement déplacée au niveau où le
 * prototype la place aussi. */
export function TankCard({ tank, state, fuelProduct, stationAlerts, stationId, onOpenCalibration, gaugeMode }: TankCardProps) {
  const t = useTranslations("zyloLiquid.stationDetail.tankCard");
  const { can } = usePermissions();

  const tankAlerts = stationAlerts.filter((a) => a.tankId === tank.id);
  const hasLeak = tankAlerts.some((a) => a.type === "leak");
  const hasAlert = tankAlerts.length > 0;
  const offline = !state || state.sensorStatus !== "online";

  const capacity = tank.calibratedCapacityLiters ?? tank.capacityLiters;
  const visual = productVisual(fuelProduct?.name ?? "", fuelProduct?.displayColor ?? null);
  const fresh = state ? freshnessOf(state.lastMeasurementAt) : "off";
  const nfL = formatLiters;

  const cardStateClass = hasLeak ? "border-l-4 border-l-error bg-error-muted/40" : hasAlert ? "border-l-4 border-l-warning bg-warning-muted/40" : offline ? "bg-surface-muted/60" : "";

  return (
    <Card className={cn("flex h-full flex-col gap-3", cardStateClass)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-body-md font-semibold text-text">{tank.displayName}</div>
          <div className="truncate text-caption text-text-muted">
            {fuelProduct?.name ?? "?"} · {nfL(capacity)} L
          </div>
        </div>
        <TankStatusBadge alerts={tankAlerts} offline={offline} variant="text" />
      </div>

      <div className="flex items-center gap-1.5 text-caption text-text-muted">
        <span className={cn("size-2 shrink-0 rounded-full", offline ? "bg-text-disabled" : DOT_CLASS[fresh])} />
        {state?.lastMeasurementAt ? t("sync", { minutes: minutesAgo(state.lastMeasurementAt) }) : t("syncOffline")}
      </div>

      <TankGaugeColumn tank={tank} state={state} offline={offline} fuelColor={visual.fill} notCalculableLabel={t("notCalculable")} mode={gaugeMode} />

      {state ? <TankFigures tank={tank} state={state} showValue={can(PRICE_HISTORY_READ)} /> : <p className="text-body-sm text-text-muted">{t("notCalculable")}</p>}

      <div className="mt-auto flex gap-2 border-t border-border-subtle pt-3">
        <Button variant="outline" size="sm" className="flex-1" onClick={onOpenCalibration}>
          {t("calibration")}
        </Button>
        <Link className={cn(buttonVariants({ size: "sm" }), "flex-1")} href={`/zylo-liquid/stations/${stationId}/tanks/${tank.id}`}>
          {t("detail")}
        </Link>
      </div>
    </Card>
  );
}
