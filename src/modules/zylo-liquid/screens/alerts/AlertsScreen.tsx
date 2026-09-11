"use client";

import { AlertTriangle, DollarSign, Droplet, Gauge, Printer, Ruler, Truck, Waves, Wifi, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import type { AlertType } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, Card, EmptyState, Kpi, PageHeader, Select, Stack, Tabs } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { AlertRow } from "./AlertRow";
import { StationAlertGroup } from "./StationAlertGroup";
import { useAlertsList, type AlertStatusFilter } from "./useAlertsList";

const STATUS_VALUES: AlertStatusFilter[] = ["all", "active", "acknowledged", "resolved"];
const COUNTABLE_TYPES: AlertType[] = ["leak", "level_low", "level_high", "water", "sensor_offline"];

/** Centre d'alertes réseau : affiche par défaut l'historique complet
 * (actives + résolues) de toutes les stations — le filtre de statut
 * "Actives" seul masquait toute alerte dès qu'elle était résolue, ce qui
 * rendait la page vide dès que le réseau n'avait aucune alerte active au
 * moment présent (cas réel constaté : 13 alertes existantes, toutes
 * résolues). Deux vues sur les mêmes données réelles : liste plate triée
 * par ancienneté, ou groupée par station (repli/dépli dans la même page,
 * sans navigation) — même pattern que la page Livraisons. Les tuiles de
 * compteur par type servent aussi de filtre rapide (cliquables). Le
 * prototype affiche en plus une répartition par gravité et un catalogue de
 * traitement (délai attendu, action attendue, responsable, escalade) —
 * aucun des deux n'existe dans le modèle Alert réel du Niveau 1
 * (type/status/triggeredValue/thresholdValue seulement) : cette page se
 * limite aux champs réellement enregistrés plutôt que d'inventer une
 * classification. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md
 * (item #16, "catalogue de traitement" classé PRÉSENTER MAIS DÉSACTIVER). */
export default function AlertsScreen() {
  const t = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const { currentOrganization } = useOrganization();
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<AlertType | null>(null);
  const data = useAlertsList(currentOrganization?.id ?? null, statusFilter, typeFilter);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  async function handleAcknowledge(alertId: string) {
    setAcknowledgingId(alertId);
    try {
      await data.acknowledge(alertId);
    } finally {
      setAcknowledgingId(null);
    }
  }

  const countByType = (type: AlertType) => data.rows.filter((r) => r.alert.type === type).length;

  function toggleTypeFilter(type: AlertType) {
    setTypeFilter((current) => (current === type ? null : type));
  }

  const typeIcon: Record<AlertType, typeof AlertTriangle> = {
    leak: Droplet,
    level_low: AlertTriangle,
    level_high: AlertTriangle,
    level_high_pre_alarm: AlertTriangle,
    water: Waves,
    sensor_offline: Wifi,
    delivery_discrepancy: Truck,
    delivery_undeclared: Truck,
    delivery_declaration_pending: Truck,
    // D5 (refonte alertes) : types ajoutés au schéma, pas encore détectés
    // automatiquement — icônes prêtes pour la prochaine incrémentation.
    price_missing: DollarSign,
    sensor_mapping_missing: Gauge,
    calibration_missing: Ruler,
  };
  const typeTone: Record<AlertType, "error" | "warning" | "info" | "neutral"> = {
    leak: "error",
    level_low: "warning",
    level_high: "warning",
    level_high_pre_alarm: "warning",
    water: "info",
    sensor_offline: "neutral",
    delivery_discrepancy: "error",
    delivery_undeclared: "error",
    // Alerte "plus légère" (décision du commanditaire) — jamais confondue
    // avec un écart avéré, seule des 3 nouvelles alertes en "warning".
    delivery_declaration_pending: "warning",
    price_missing: "warning",
    sensor_mapping_missing: "warning",
    calibration_missing: "warning",
  };

  return (
    <Stack>
      <PageHeader
        title={t("page.title")}
        description={t("page.subtitle", { count: data.rows.length })}
        actions={
          <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
            <Printer className="size-4" aria-hidden />
            {t("page.print")}
          </Button>
        }
      />

      {data.error && <Alert tone="error">{data.error}</Alert>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {COUNTABLE_TYPES.map((type) => {
          const Icon = typeIcon[type];
          const active = typeFilter === type;
          return (
            <button key={type} type="button" onClick={() => toggleTypeFilter(type)} className="text-left">
              <Kpi icon={Icon} label={t(`types.${type}`)} value={countByType(type)} tone={typeTone[type]} className={active ? "ring-2 ring-primary" : undefined} />
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full max-w-xs">
            <Select
              aria-label={t("page.filterStatus")}
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as AlertStatusFilter)}
              options={STATUS_VALUES.map((value) => ({ value, label: value === "all" ? t("page.status.all") : t(`page.status.${value}`) }))}
            />
          </div>
          {typeFilter && (
            <Button variant="ghost" size="sm" onClick={() => setTypeFilter(null)}>
              <X className="size-4" aria-hidden />
              {t("types." + typeFilter)} — {t("clearTypeFilter")}
            </Button>
          )}
        </div>
      </Card>

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : data.rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={t("empty")} />
      ) : (
        <Tabs
          items={[
            {
              value: "all",
              label: t("views.all"),
              content: (
                <Stack gap="sm">
                  {data.rows.map((row) => (
                    <AlertRow key={row.alert.id} row={row} acknowledgingId={acknowledgingId} onAcknowledge={handleAcknowledge} />
                  ))}
                </Stack>
              ),
            },
            {
              value: "byStation",
              label: t("views.byStation"),
              content: (
                <Stack gap="sm">
                  {data.stationGroups.map((group) => (
                    <StationAlertGroup key={group.station.id} group={group} acknowledgingId={acknowledgingId} onAcknowledge={handleAcknowledge} />
                  ))}
                </Stack>
              ),
            },
          ]}
        />
      )}
    </Stack>
  );
}
