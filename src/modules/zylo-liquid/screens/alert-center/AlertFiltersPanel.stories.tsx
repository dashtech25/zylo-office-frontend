import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { AlertFiltersPanel, type AlertTypeGroupOption } from "./AlertFiltersPanel";
import type { AlertSeverity, AlertStatus } from "@/modules/zylo-liquid/services/zyloLiquidApi";

const TYPE_GROUPS: AlertTypeGroupOption[] = [
  { key: "levelThresholds", label: "Seuils de niveau", count: 9 },
  { key: "sensorsAvailability", label: "Capteurs / disponibilité", count: 5 },
  { key: "leakTest", label: "Test d'étanchéité", count: 1 },
  { key: "missingConfiguration", label: "Configuration manquante", count: 7 },
  { key: "deliveries", label: "Livraisons", count: 4 },
  { key: "salesCash", label: "Ventes / caisse", count: 1 },
  { key: "transport", label: "Transport", count: 1 },
];

const meta: Meta<typeof AlertFiltersPanel> = {
  title: "Centre d'alertes/Panneau de filtres",
  component: AlertFiltersPanel,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="w-72">{Story()}</div>],
};
export default meta;
type Story = StoryObj<typeof AlertFiltersPanel>;

export const Default: Story = {
  render: () => {
    const [selectedGroups, setSelectedGroups] = useState<string[]>(TYPE_GROUPS.map((g) => g.key));
    const [selectedSeverities, setSelectedSeverities] = useState<AlertSeverity[]>(["critical", "high", "medium", "low"]);
    const [selectedStatuses, setSelectedStatuses] = useState<AlertStatus[]>(["active", "acknowledged", "resolved"]);

    return (
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
    );
  },
};
