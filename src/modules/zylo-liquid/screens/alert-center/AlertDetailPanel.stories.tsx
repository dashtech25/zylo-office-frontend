import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  CalendarClock,
  Clock,
  Droplet,
  Droplets,
  Fuel,
  Gauge,
  History,
  LineChart,
  Radio,
  Thermometer,
} from "lucide-react";

import { AlertDetailPanel } from "./AlertDetailPanel";

const meta: Meta<typeof AlertDetailPanel> = {
  title: "Centre d'alertes/Panneau de détail",
  component: AlertDetailPanel,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="max-w-3xl">{Story()}</div>],
};
export default meta;
type Story = StoryObj<typeof AlertDetailPanel>;

// Données cohérentes avec la première alerte de la maquette partagée :
// "Présence d'eau détectée" — Station Akwa (Douala), Cuve 1, Gasoil.
export const Default: Story = {
  args: {
    type: "water",
    title: "Présence d'eau détectée",
    severity: "critical",
    triggeredAtLabel: "Il y a 12 min (10:12)",
    location: "Station Akwa · Cuve 1 · Gasoil",
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
    onBack: () => alert("Retour à la liste"),
    onClose: () => alert("Fermer le panneau"),
  },
};

export const SeveriteFaible: Story = {
  args: {
    ...Default.args,
    type: "delivery_declaration_pending",
    severity: "low",
    title: "Déclaration de livraison en attente",
    summaryMessage: "Une déclaration de livraison reste en attente d'appariement avec la télémétrie depuis plus de 4 heures.",
  },
};
