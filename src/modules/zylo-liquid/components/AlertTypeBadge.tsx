"use client";

import {
  Building2,
  Cable,
  Droplet,
  Droplets,
  MapPin,
  Radio,
  Scale,
  SlidersHorizontal,
  Tag,
  TrendingDown,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import type { AlertType } from "@/modules/zylo-liquid/services/zyloLiquidApi";

type Tone = "error" | "warning" | "info" | "low" | "secondary" | "maintenance";

const TONE_BG: Record<Tone, string> = {
  error: "bg-error",
  warning: "bg-warning",
  info: "bg-info",
  low: "bg-low",
  secondary: "bg-secondary",
  maintenance: "bg-severity-maintenance",
};

/** Icône + ton par type d'alerte — seule source de cette association pour
 * tout le Centre d'alertes (2026-09-20). Couvre les 15 types réels du
 * backend (voir `app/alerts/models.py` côté serveur) : jamais une icône
 * générique par défaut qui masquerait un type non couvert. */
const ALERT_TYPE_CONFIG: Record<AlertType, { icon: LucideIcon; tone: Tone }> = {
  level_high: { icon: TrendingUp, tone: "error" },
  level_high_pre_alarm: { icon: TrendingUp, tone: "warning" },
  level_low: { icon: TrendingDown, tone: "low" },
  water: { icon: Droplet, tone: "info" },
  leak: { icon: Droplets, tone: "error" },
  sensor_offline: { icon: Radio, tone: "secondary" },
  station_offline: { icon: Building2, tone: "error" },
  price_missing: { icon: Tag, tone: "info" },
  sensor_mapping_missing: { icon: Cable, tone: "maintenance" },
  calibration_missing: { icon: SlidersHorizontal, tone: "maintenance" },
  delivery_discrepancy: { icon: Truck, tone: "error" },
  delivery_undeclared: { icon: Truck, tone: "warning" },
  delivery_declaration_pending: { icon: Truck, tone: "low" },
  stock_declared_discrepancy: { icon: Scale, tone: "warning" },
  truck_stop_unqualified: { icon: MapPin, tone: "secondary" },
};

/** Groupe de filtre (panneau de filtres du Centre d'alertes) par type —
 * seule source de cette association, jamais redéfinie dans
 * `AlertCenterScreen`. Les clés correspondent à
 * `zyloLiquid.alertCenter.filters.groups.*`. */
export const ALERT_TYPE_GROUP: Record<AlertType, string> = {
  level_high: "levelThresholds",
  level_high_pre_alarm: "levelThresholds",
  level_low: "levelThresholds",
  water: "levelThresholds",
  sensor_offline: "sensorsAvailability",
  station_offline: "sensorsAvailability",
  leak: "leakTest",
  price_missing: "missingConfiguration",
  sensor_mapping_missing: "missingConfiguration",
  calibration_missing: "missingConfiguration",
  delivery_discrepancy: "deliveries",
  delivery_undeclared: "deliveries",
  delivery_declaration_pending: "deliveries",
  stock_declared_discrepancy: "salesCash",
  truck_stop_unqualified: "transport",
};

/** Types pouvant être résolus manuellement (`PATCH /alerts/{id}`, note de
 * résolution obligatoire) — exactement le complément de
 * `AUTO_VERIFIABLE_ALERT_TYPES` côté backend (`app/alerts/service.py`) :
 * jamais recalculé ici, recopié tel quel pour ne proposer un bouton
 * "Résoudre" que quand le backend l'accepterait réellement (sinon 422). */
export const MANUALLY_RESOLVABLE_TYPES = new Set<AlertType>([
  "price_missing",
  "sensor_mapping_missing",
  "calibration_missing",
  "station_offline",
  "truck_stop_unqualified",
]);

export interface AlertTypeBadgeProps {
  type: AlertType;
  size?: "sm" | "md";
  className?: string;
}

/** Icône ronde colorée représentant le type d'une alerte (eau, station,
 * capteur, configuration, livraison…) — utilisée par `AlertCard` (liste) et
 * l'en-tête du panneau de détail, jamais recomposée localement à chaque
 * endroit. Réutilise les libellés déjà traduits
 * (`zyloLiquid.alerts.types.*`), jamais un second jeu de clés. */
export function AlertTypeBadge({ type, size = "md", className }: AlertTypeBadgeProps) {
  const t = useTranslations("zyloLiquid.alerts.types");
  const { icon: Icon, tone } = ALERT_TYPE_CONFIG[type];
  const label = t(type);

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-white",
        TONE_BG[tone],
        size === "sm" ? "size-7" : "size-9",
        className
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
    </span>
  );
}
