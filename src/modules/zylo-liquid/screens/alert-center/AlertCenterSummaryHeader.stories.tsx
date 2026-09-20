import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertCenterSummaryHeader } from "./AlertCenterSummaryHeader";

const meta: Meta<typeof AlertCenterSummaryHeader> = {
  title: "Centre d'alertes/En-tête + résumé",
  component: AlertCenterSummaryHeader,
  tags: ["autodocs"],
  args: {
    counts: { active: 12, toHandle: 5, informational: 8, resolved24h: 3 },
    onMarkAllAsRead: () => alert("Marquer tout comme lu"),
    onOpenFilters: () => alert("Ouvrir les filtres"),
    onCardClick: (card) => alert(`Filtrer sur : ${card}`),
  },
};
export default meta;
type Story = StoryObj<typeof AlertCenterSummaryHeader>;

export const Default: Story = {};

export const ReseauCalme: Story = {
  args: { counts: { active: 0, toHandle: 0, informational: 2, resolved24h: 6 } },
};

export const ReseauEnCrise: Story = {
  args: { counts: { active: 34, toHandle: 19, informational: 11, resolved24h: 1 } },
};
