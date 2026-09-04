import { Badge } from "@/shared/ui";

const TONE_BY_FRESHNESS = { ok: "success", late: "warning", old: "error" } as const;

export function StationSyncBadge({ freshness, label }: { freshness: "ok" | "late" | "old"; label: string }) {
  return (
    <Badge tone={TONE_BY_FRESHNESS[freshness]} dot size="sm">
      {label}
    </Badge>
  );
}
