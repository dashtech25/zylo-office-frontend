import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { AlertList, type AlertListItem, type AlertListSort } from "./AlertList";

const ITEMS: AlertListItem[] = [
  { id: "1", type: "water", severity: "critical", title: "Présence d'eau détectée", location: "Station Akwa · Cuve 1", timeAgo: "Il y a 12 min" },
  { id: "2", type: "station_offline", severity: "high", title: "Station hors ligne", location: "Station Bonabéri", timeAgo: "Il y a 28 min" },
  { id: "3", type: "price_missing", severity: "medium", title: "Prix de vente non configuré", location: "Station Douala · Super", timeAgo: "Il y a 1 h" },
  { id: "4", type: "calibration_missing", severity: "medium", title: "Configuration cuve manquante", location: "Station Douala · Cuve 3", timeAgo: "Il y a 3 h" },
  { id: "5", type: "sensor_mapping_missing", severity: "high", title: "Synchronisation Holykell en échec", location: "Station Bafia", timeAgo: "Il y a 4 h" },
  { id: "6", type: "delivery_declaration_pending", severity: "low", title: "Déclaration en attente", location: "Station Kribi · Gazole", timeAgo: "Il y a 5 h" },
];

const meta: Meta<typeof AlertList> = {
  title: "Centre d'alertes/Liste des alertes",
  component: AlertList,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="h-[520px] w-96">{Story()}</div>],
};
export default meta;
type Story = StoryObj<typeof AlertList>;

export const Default: Story = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>("1");
    const [sort, setSort] = useState<AlertListSort>("mostRecent");
    return <AlertList items={ITEMS} selectedId={selectedId} onSelect={setSelectedId} sort={sort} onSortChange={setSort} />;
  },
};

export const Vide: Story = {
  render: () => {
    const [sort, setSort] = useState<AlertListSort>("mostRecent");
    return <AlertList items={[]} selectedId={null} onSelect={() => {}} sort={sort} onSortChange={setSort} />;
  },
};
