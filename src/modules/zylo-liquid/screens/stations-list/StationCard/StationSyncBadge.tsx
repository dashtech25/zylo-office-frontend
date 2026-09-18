import type { FreshnessTone } from "@/shared/lib/formatDateTime";
import { Badge } from "@/shared/ui";

const TONE_BY_FRESHNESS = { ok: "success", late: "warning", old: "error", never: "error" } as const;

export function StationSyncBadge({ freshness, label }: { freshness: FreshnessTone; label: string }) {
  return (
    <Badge tone={TONE_BY_FRESHNESS[freshness]} dot size="sm">
      {label}
    </Badge>
  );
}
