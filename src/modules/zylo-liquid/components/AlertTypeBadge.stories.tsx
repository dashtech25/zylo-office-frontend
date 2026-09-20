import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertTypeBadge } from "./AlertTypeBadge";
import type { AlertType } from "@/modules/zylo-liquid/services/zyloLiquidApi";

const meta: Meta<typeof AlertTypeBadge> = {
  title: "Zylo Liquid/AlertTypeBadge",
  component: AlertTypeBadge,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof AlertTypeBadge>;

export const Eau: Story = { args: { type: "water" } };
export const StationHorsLigne: Story = { args: { type: "station_offline" } };

const ALL_TYPES: AlertType[] = [
  "level_high", "level_high_pre_alarm", "level_low", "water", "leak", "sensor_offline",
  "delivery_discrepancy", "delivery_undeclared", "delivery_declaration_pending",
  "price_missing", "sensor_mapping_missing", "calibration_missing",
  "truck_stop_unqualified", "station_offline", "stock_declared_discrepancy",
];

export const Les15Types: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {ALL_TYPES.map((type) => (
        <AlertTypeBadge key={type} type={type} />
      ))}
    </div>
  ),
};
