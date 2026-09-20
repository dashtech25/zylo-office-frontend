"use client";

import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  Cable,
  CalendarClock,
  Clock,
  Droplet,
  Droplets,
  Fuel,
  Gauge,
  History,
  LineChart,
  Radio,
  Tag,
  Thermometer,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { AlertSeverity, AlertStatus, AlertType } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { AlertFiltersPanel, type AlertTypeGroupOption } from "./AlertFiltersPanel";
import { AlertList, type AlertListItem, type AlertListSort } from "./AlertList";
import { AlertDetailPanel, type AlertDetailQuickAction, type AlertDetailInfoRow, type AlertDetailKeyMetric } from "./AlertDetailPanel";
import { AlertCenterSummaryHeader } from "./AlertCenterSummaryHeader";

interface FullAlert extends AlertListItem {
  summaryMessage: string;
  keyMetrics: AlertDetailKeyMetric[];
  generalInfo: AlertDetailInfoRow[];
  causeIntro: string;
  causes: string[];
  impactMessage: string;
  quickActions: AlertDetailQuickAction[];
  autoResolveHint: string;
}

const TYPE_GROUPS: AlertTypeGroupOption[] = [
  { key: "levelThresholds", label: "Seuils de niveau", count: 9 },
  { key: "sensorsAvailability", label: "Capteurs / disponibilité", count: 5 },
  { key: "leakTest", label: "Test d'étanchéité", count: 1 },
  { key: "missingConfiguration", label: "Configuration manquante", count: 7 },
  { key: "deliveries", label: "Livraisons", count: 4 },
  { key: "salesCash", label: "Ventes / caisse", count: 1 },
  { key: "transport", label: "Transport", count: 1 },
];

const ALERTS: FullAlert[] = [
  {
    id: "1",
    type: "water",
    severity: "critical",
    title: "Présence d'eau détectée",
    location: "Station Akwa · Cuve 1",
    timeAgo: "Il y a 12 min",
    summaryMessage:
      "De l'eau a été détectée dans la cuve. Cette situation peut impacter la qualité du carburant et endommager les équipements.",
    keyMetrics: [
      { icon: Droplet, label: "Mesure actuelle (eau)", value: "42 mm" },
      { icon: Gauge, label: "Seuil configuré", value: "20 mm" },
      { icon: Thermometer, label: "Température", value: "28 °C" },
      { icon: Clock, label: "Dernière mesure", value: "10 sept. 2026 · 10:12" },
    ],
    generalInfo: [
      { icon: AlertTriangle, label: "Type d'alerte", value: "Anomalie" },
      { icon: AlertOctagon, label: "Gravité", value: "Critique", valueClassName: "text-error" },
      { icon: Building2, label: "Station", value: "Akwa (Douala)" },
      { icon: Gauge, label: "Cuve", value: "Cuve 1" },
      { icon: Fuel, label: "Produit", value: "Gasoil" },
      { icon: CalendarClock, label: "Détectée le", value: "10 sept. 2026 · 10:12" },
    ],
    causeIntro: "Le niveau d'eau dans la cuve dépasse le seuil configuré. Cela peut être dû à :",
    causes: ["Condensation", "Infiltration", "Problème de sonde"],
    impactMessage: "Risque de dégradation du carburant, arrêt de la pompe et fausse lecture du niveau.",
    quickActions: [
      { icon: LineChart, label: "Voir les mesures détaillées" },
      { icon: Radio, label: "Vérifier la sonde" },
      { icon: History, label: "Consulter l'historique" },
      { icon: Droplets, label: "Lancer la procédure de vidange", highlighted: true },
    ],
    autoResolveHint: "La résolution sera confirmée automatiquement lorsque le niveau d'eau repassera sous le seuil configuré pendant au moins 30 minutes.",
  },
  {
    id: "2",
    type: "station_offline",
    severity: "high",
    title: "Station hors ligne",
    location: "Station Bonabéri",
    timeAgo: "Il y a 28 min",
    summaryMessage: "Aucune cuve de cette station ne transmet plus de mesure — toute la station échappe à la supervision.",
    keyMetrics: [
      { icon: Wifi, label: "Cuves configurées", value: "3" },
      { icon: Wifi, label: "Cuves en ligne", value: "0" },
      { icon: Clock, label: "Silence depuis", value: "28 min" },
      { icon: Clock, label: "Dernière mesure", value: "10 sept. 2026 · 09:56" },
    ],
    generalInfo: [
      { icon: AlertTriangle, label: "Type d'alerte", value: "Disponibilité" },
      { icon: AlertOctagon, label: "Gravité", value: "Élevée", valueClassName: "text-warning" },
      { icon: Building2, label: "Station", value: "Bonabéri (Douala)" },
      { icon: CalendarClock, label: "Détectée le", value: "10 sept. 2026 · 09:56" },
    ],
    causeIntro: "Aucune des cuves configurées ne transmet. Cela peut être dû à :",
    causes: ["Coupure secteur à la station", "Panne du boîtier de communication", "Coupure réseau/GSM locale"],
    impactMessage: "Aucune donnée de niveau, aucune alerte de seuil ne pourra se déclencher tant que le silence persiste.",
    quickActions: [
      { icon: History, label: "Consulter l'historique" },
      { icon: Radio, label: "Contacter la station", highlighted: true },
    ],
    autoResolveHint: "La résolution sera confirmée automatiquement dès qu'au moins une cuve de la station transmettra de nouveau.",
  },
  {
    id: "3",
    type: "price_missing",
    severity: "medium",
    title: "Prix de vente non configuré",
    location: "Station Douala · Super",
    timeAgo: "Il y a 1 h",
    summaryMessage: "Le produit Super est activement vendu à cette station mais n'a aucun prix résolvable — sa valeur de stock est incalculable.",
    keyMetrics: [
      { icon: Tag, label: "Produit concerné", value: "Super" },
      { icon: Building2, label: "Station", value: "Douala" },
      { icon: Clock, label: "Détectée depuis", value: "1 h" },
      { icon: CalendarClock, label: "Détectée le", value: "10 sept. 2026 · 09:24" },
    ],
    generalInfo: [
      { icon: AlertTriangle, label: "Type d'alerte", value: "Configuration" },
      { icon: AlertOctagon, label: "Gravité", value: "Moyenne", valueClassName: "text-info" },
      { icon: Building2, label: "Station", value: "Douala" },
      { icon: Fuel, label: "Produit", value: "Super" },
      { icon: CalendarClock, label: "Détectée le", value: "10 sept. 2026 · 09:24" },
    ],
    causeIntro: "Ni un prix spécifique à la station, ni un prix réseau par défaut n'a été trouvé. Cela peut être dû à :",
    causes: ["Prix jamais saisi pour ce produit", "Prix réseau par défaut expiré ou absent"],
    impactMessage: "La valeur monétaire du stock de ce produit ne peut pas être calculée tant qu'aucun prix n'est configuré.",
    quickActions: [{ icon: Tag, label: "Configurer le prix", highlighted: true }],
    autoResolveHint: "La résolution sera confirmée automatiquement dès qu'un prix redevient résolvable pour ce produit.",
  },
  {
    id: "4",
    type: "sensor_mapping_missing",
    severity: "high",
    title: "Synchronisation Holykell en échec",
    location: "Station Bafia",
    timeAgo: "Il y a 4 h",
    summaryMessage: "Une cuve pilotée par capteur n'a aucun mapping de sonde actif — sa télémétrie ne peut pas être exploitée.",
    keyMetrics: [
      { icon: Cable, label: "Cuve concernée", value: "Cuve 2" },
      { icon: Building2, label: "Station", value: "Bafia" },
      { icon: Clock, label: "Détectée depuis", value: "4 h" },
      { icon: CalendarClock, label: "Détectée le", value: "10 sept. 2026 · 06:40" },
    ],
    generalInfo: [
      { icon: AlertTriangle, label: "Type d'alerte", value: "Configuration" },
      { icon: AlertOctagon, label: "Gravité", value: "Élevée", valueClassName: "text-warning" },
      { icon: Building2, label: "Station", value: "Bafia" },
      { icon: Gauge, label: "Cuve", value: "Cuve 2" },
      { icon: CalendarClock, label: "Détectée le", value: "10 sept. 2026 · 06:40" },
    ],
    causeIntro: "Aucun capteur de niveau actif n'est associé à cette cuve. Cela peut être dû à :",
    causes: ["Capteur jamais associé après l'installation", "Association supprimée par erreur"],
    impactMessage: "Aucune mesure de niveau ne sera reçue pour cette cuve tant qu'un capteur n'est pas associé.",
    quickActions: [{ icon: Cable, label: "Associer un capteur", highlighted: true }],
    autoResolveHint: "La résolution sera confirmée automatiquement dès qu'un mapping de capteur actif existera pour cette cuve.",
  },
];

const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  level_high: "Anomalie", level_high_pre_alarm: "Anomalie", level_low: "Anomalie", water: "Anomalie", leak: "Anomalie",
  sensor_offline: "Disponibilité", station_offline: "Disponibilité",
  price_missing: "Configuration", sensor_mapping_missing: "Configuration", calibration_missing: "Configuration",
  delivery_discrepancy: "Livraison", delivery_undeclared: "Livraison", delivery_declaration_pending: "Livraison",
  stock_declared_discrepancy: "Métier", truck_stop_unqualified: "Transport",
  manual_gauging_discrepancy: "Métier", quality_check_discrepancy: "Métier",
};

/** Assemblage complet de la page "Gestion des alertes" — filtres + liste +
 * panneau de détail côte à côte, exactement les blocs de l'étape 2, jamais
 * une réimplémentation locale. Données simulées, une alerte présélectionnée
 * (la première de la liste) pour montrer l'interaction liste ↔ détail dès
 * l'ouverture de la story. */
export function AlertsPageFull() {
  const [selectedId, setSelectedId] = useState<string>(ALERTS[0].id);
  const [sort, setSort] = useState<AlertListSort>("mostRecent");
  const [selectedGroups, setSelectedGroups] = useState<string[]>(TYPE_GROUPS.map((g) => g.key));
  const [selectedSeverities, setSelectedSeverities] = useState<AlertSeverity[]>(["critical", "high", "medium", "low"]);
  const [selectedStatuses, setSelectedStatuses] = useState<AlertStatus[]>(["active", "acknowledged", "resolved"]);

  const selectedAlert = useMemo(() => ALERTS.find((a) => a.id === selectedId) ?? ALERTS[0], [selectedId]);

  return (
    <div className="flex flex-col gap-6 bg-surface-muted p-6">
      <AlertCenterSummaryHeader
        counts={{ active: 12, toHandle: 5, informational: 8, resolved24h: 3 }}
        onCardClick={() => {}}
      />

      {/* Trois colonnes à largeurs fixes (filtres/liste) + détail flexible —
          en style inline plutôt qu'une classe Tailwind arbitraire
          `grid-cols-[...]` : cette syntaxe s'est révélée non fiable avec le
          JIT de ce projet (même symptôme déjà rencontré avec
          `bg-low`/`bg-severity-maintenance`, qui nécessitait un
          redémarrage complet du serveur pour apparaître) — un style inline
          garantit le rendu sans dépendre du scan Tailwind. */}
      <div className="grid items-start gap-4" style={{ gridTemplateColumns: "280px 380px 1fr" }}>
        <AlertFiltersPanel
          typeGroups={TYPE_GROUPS}
          totalTypeCount={TYPE_GROUPS.reduce((sum, g) => sum + g.count, 0)}
          allTypesSelected={selectedGroups.length === TYPE_GROUPS.length}
          onToggleAllTypes={() =>
            setSelectedGroups((prev) => (prev.length === TYPE_GROUPS.length ? [] : TYPE_GROUPS.map((g) => g.key)))
          }
          selectedTypeGroupKeys={selectedGroups}
          onToggleTypeGroup={(key) =>
            setSelectedGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
          }
          severityCounts={{ critical: 6, high: 8, medium: 9, low: 5 }}
          selectedSeverities={selectedSeverities}
          onToggleSeverity={(severity) =>
            setSelectedSeverities((prev) => (prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]))
          }
          statusCounts={{ active: 25, acknowledged: 7, resolved: 3 }}
          selectedStatuses={selectedStatuses}
          onToggleStatus={(status) =>
            setSelectedStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]))
          }
          systemStatusLabel="Système opérationnel"
          systemStatusTimestamp="10 sept. 2026 · 10:24"
        />

        <AlertList items={ALERTS} selectedId={selectedId} onSelect={setSelectedId} sort={sort} onSortChange={setSort} />

        <AlertDetailPanel
          type={selectedAlert.type}
          title={selectedAlert.title}
          severity={selectedAlert.severity}
          triggeredAtLabel={selectedAlert.timeAgo}
          location={`${selectedAlert.location} (${ALERT_TYPE_LABEL[selectedAlert.type]})`}
          summaryMessage={selectedAlert.summaryMessage}
          keyMetrics={selectedAlert.keyMetrics}
          generalInfo={selectedAlert.generalInfo}
          causeIntro={selectedAlert.causeIntro}
          causes={selectedAlert.causes}
          impactMessage={selectedAlert.impactMessage}
          quickActions={selectedAlert.quickActions}
          autoResolveHint={selectedAlert.autoResolveHint}
        />
      </div>
    </div>
  );
}
