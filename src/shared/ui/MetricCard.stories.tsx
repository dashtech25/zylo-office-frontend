import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Clock, Droplet, Gauge, Thermometer } from "lucide-react";
import { MetricCard } from "./MetricCard";

const meta: Meta<typeof MetricCard> = {
  title: "Shared UI/MetricCard",
  component: MetricCard,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof MetricCard>;

export const Default: Story = { args: { icon: Droplet, label: "Mesure actuelle (eau)", value: "42 mm" } };

export const Grille: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard icon={Droplet} label="Mesure actuelle (eau)" value="42 mm" />
      <MetricCard icon={Gauge} label="Seuil configuré" value="20 mm" />
      <MetricCard icon={Thermometer} label="Température" value="28 °C" />
      <MetricCard icon={Clock} label="Dernière mesure" value="10 sept. 2026 · 10:12" />
    </div>
  ),
};
