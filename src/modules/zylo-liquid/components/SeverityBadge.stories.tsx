import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SeverityBadge } from "./SeverityBadge";

const meta: Meta<typeof SeverityBadge> = {
  title: "Zylo Liquid/SeverityBadge",
  component: SeverityBadge,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof SeverityBadge>;

export const Critical: Story = { args: { severity: "critical" } };
export const High: Story = { args: { severity: "high" } };
export const Medium: Story = { args: { severity: "medium" } };
export const Low: Story = { args: { severity: "low" } };

export const LesQuatre: Story = {
  render: () => (
    <div className="flex gap-2">
      <SeverityBadge severity="critical" />
      <SeverityBadge severity="high" />
      <SeverityBadge severity="medium" />
      <SeverityBadge severity="low" />
    </div>
  ),
};
