import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Droplets, History, LineChart, Radio } from "lucide-react";
import { QuickActionButton } from "./QuickActionButton";

const meta: Meta<typeof QuickActionButton> = {
  title: "Shared UI/QuickActionButton",
  component: QuickActionButton,
  tags: ["autodocs"],
  args: { icon: LineChart, children: "Voir les mesures détaillées" },
};
export default meta;
type Story = StoryObj<typeof QuickActionButton>;

export const Secondaire: Story = {};
export const MiseEnAvant: Story = { args: { icon: Droplets, children: "Lancer la procédure de vidange", highlighted: true } };

export const Empilees: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <QuickActionButton icon={LineChart}>Voir les mesures détaillées</QuickActionButton>
      <QuickActionButton icon={Radio}>Vérifier la sonde</QuickActionButton>
      <QuickActionButton icon={History}>Consulter l&apos;historique</QuickActionButton>
      <QuickActionButton icon={Droplets} highlighted>Lancer la procédure de vidange</QuickActionButton>
    </div>
  ),
};
