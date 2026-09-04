import type { StationRow } from "../useStationsList";
import { StatusBadge } from "./StatusBadge";

export function StationStatusCell({ state, label }: { state: StationRow["state"]; label: string }) {
  return (
    <div className="w-[10%] pr-2">
      <StatusBadge state={state} label={label} />
    </div>
  );
}
