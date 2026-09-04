import { TriangleAlert } from "lucide-react";

import { Badge, type BadgeProps } from "@/shared/ui";

import type { StationRow } from "../useStationsList";

const TONE_BY_STATE: Record<StationRow["state"], NonNullable<BadgeProps["tone"]>> = {
  critical: "error",
  alert: "warning",
  offline: "neutral",
  online: "success",
};

const USES_WARNING_ICON: Record<StationRow["state"], boolean> = {
  critical: true,
  alert: true,
  offline: false,
  online: false,
};

export function StatusBadge({ state, label }: { state: StationRow["state"]; label: string }) {
  return (
    <Badge tone={TONE_BY_STATE[state]} dot={!USES_WARNING_ICON[state]}>
      {USES_WARNING_ICON[state] && <TriangleAlert className="size-3" aria-hidden />}
      {label}
    </Badge>
  );
}
