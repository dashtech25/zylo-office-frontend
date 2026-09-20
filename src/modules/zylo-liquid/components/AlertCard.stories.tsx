import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { AlertCard } from "./AlertCard";

const meta: Meta<typeof AlertCard> = {
  title: "Zylo Liquid/AlertCard",
  component: AlertCard,
  tags: ["autodocs"],
  args: {
    type: "water",
    severity: "critical",
    title: "Présence d'eau détectée",
    location: "Station Akwa · Cuve 1",
    timeAgo: "Il y a 12 min",
  },
  decorators: [(Story) => <div className="w-80">{Story()}</div>],
};
export default meta;
type Story = StoryObj<typeof AlertCard>;

export const Default: Story = {};
export const Selectionnee: Story = { args: { selected: true } };

export const Liste: Story = {
  render: () => {
    const [selectedId, setSelectedId] = useState("1");
    const items = [
      { id: "1", type: "water" as const, severity: "critical" as const, title: "Présence d'eau détectée", location: "Station Akwa · Cuve 1", timeAgo: "Il y a 12 min" },
      { id: "2", type: "station_offline" as const, severity: "high" as const, title: "Station hors ligne", location: "Station Bonabéri", timeAgo: "Il y a 28 min" },
      { id: "3", type: "price_missing" as const, severity: "medium" as const, title: "Prix de vente non configuré", location: "Station Douala · Super", timeAgo: "Il y a 1 h" },
      { id: "4", type: "delivery_declaration_pending" as const, severity: "low" as const, title: "Déclaration en attente", location: "Station Kribi · Gazole", timeAgo: "Il y a 2 h" },
    ];
    return (
      <div className="flex w-80 flex-col gap-1">
        {items.map((item) => (
          <AlertCard key={item.id} {...item} selected={item.id === selectedId} onClick={() => setSelectedId(item.id)} />
        ))}
      </div>
    );
  },
};
