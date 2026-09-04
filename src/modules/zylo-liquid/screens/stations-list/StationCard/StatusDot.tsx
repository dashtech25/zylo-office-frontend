import { cn } from "@/shared/lib/cn";

import type { StationRow } from "../useStationsList";

const DOT_CLASS_BY_STATE: Record<StationRow["state"], string> = {
  critical: "bg-error",
  alert: "bg-warning",
  offline: "bg-text-disabled",
  online: "bg-success",
};

export function StatusDot({ state, className }: { state: StationRow["state"]; className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full", DOT_CLASS_BY_STATE[state], className)} />;
}
