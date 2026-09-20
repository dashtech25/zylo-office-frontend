"use client";

import { useTranslations } from "next-intl";

import type { Alert } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge } from "@/shared/ui";
import { SEVERITY_TONE } from "./SeverityBadge";

/** Sévérité d'affichage pour choisir l'alerte à montrer quand plusieurs sont
 * actives sur la même cuve — reprend le seul enum réel `Alert.type` déjà en
 * base (models.py), jamais une catégorie inventée. */
const SEVERITY_ORDER: Alert["type"][] = ["leak", "level_high", "water", "level_low", "level_high_pre_alarm", "sensor_offline"];

function mostSevereAlert(alerts: Alert[]): Alert | null {
  for (const type of SEVERITY_ORDER) {
    const found = alerts.find((a) => a.type === type);
    if (found) return found;
  }
  return null;
}

export interface TankStatusBadgeProps {
  alerts: Alert[];
  offline: boolean;
  variant: "icon" | "text";
}

/** Statut réel d'une cuve, dérivé uniquement des alertes actives déjà en
 * base et de l'état du capteur — jamais un texte "Niveau bas" générique
 * inventé : le libellé vient toujours du type de l'alerte réellement
 * déclenchée (zyloLiquid.alerts.types.*, déjà traduit fr/en). */
export function TankStatusBadge({ alerts, offline, variant }: TankStatusBadgeProps) {
  const t = useTranslations("zyloLiquid.alerts.types");
  const tCard = useTranslations("zyloLiquid.stationDetail.tankCard");
  const alert = mostSevereAlert(alerts);

  if (variant === "icon") {
    if (!alert) return null;
    return (
      <span title={t(alert.type)} className="text-body-sm" aria-label={t(alert.type)}>
        ⚠️
      </span>
    );
  }

  if (offline) {
    return (
      <Badge tone="error" dot>
        {tCard("sensorDisconnected")}
      </Badge>
    );
  }

  if (alert) {
    // Réutilise le même mapping sévérité→ton que le Centre d'alertes —
    // jamais un "warning" générique fixe quelle que soit la vraie gravité
    // de l'alerte (refonte 2026-09-20).
    return (
      <Badge tone={SEVERITY_TONE[alert.severity]} dot>
        {t(alert.type)}
      </Badge>
    );
  }

  return (
    <Badge tone="success" dot>
      {tCard("sensorConnected")}
    </Badge>
  );
}
