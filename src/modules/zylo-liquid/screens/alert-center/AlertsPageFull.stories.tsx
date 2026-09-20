import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertsPageFull } from "./AlertsPageFull";

const meta: Meta<typeof AlertsPageFull> = {
  title: "Centre d'alertes/Page complète",
  component: AlertsPageFull,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof AlertsPageFull>;

export const Default: Story = {};
