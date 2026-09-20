import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertTriangle, Scale } from "lucide-react";
import { DiscrepancyListItem } from "./DiscrepancyListItem";

const meta: Meta<typeof DiscrepancyListItem> = {
  title: "Zylo Liquid/DiscrepancyListItem",
  component: DiscrepancyListItem,
  tags: ["autodocs"],
  args: {
    href: "/zylo-liquid/reconciliation",
    icon: AlertTriangle,
    label: "Station Akwa — Cuve 1 (Super)",
    value: "-42.50 L",
    timeLabel: "20/09 14:30",
  },
  decorators: [(Story) => <div className="w-80">{Story()}</div>],
};
export default meta;
type Story = StoryObj<typeof DiscrepancyListItem>;

export const EcartStock: Story = {};

export const EcartCaisse: Story = {
  args: {
    href: "/zylo-liquid/caisse-ecarts",
    icon: Scale,
    label: "Livraison déclarée",
    value: "-120.00 L",
  },
};

export const Liste: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-1">
      <DiscrepancyListItem href="/zylo-liquid/reconciliation" icon={AlertTriangle} label="Station Akwa — Cuve 1 (Super)" value="-42.50 L" timeLabel="20/09 14:30" />
      <DiscrepancyListItem href="/zylo-liquid/reconciliation" icon={AlertTriangle} label="Station Bonabéri — Cuve 3 (Gazole)" value="+18.00 L" timeLabel="20/09 09:12" />
      <DiscrepancyListItem href="/zylo-liquid/caisse-ecarts" icon={Scale} label="Livraison déclarée" value="-120.00 L" timeLabel="19/09 17:45" />
      <DiscrepancyListItem href="/zylo-liquid/caisse-ecarts" icon={Scale} label="Jaugeage manuel" value="8.20 mm" timeLabel="19/09 08:00" />
    </div>
  ),
};
