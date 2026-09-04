import { TriangleAlert } from "lucide-react";

import { formatPercent } from "@/modules/zylo-liquid/utils/formatPercent";
import { Badge, ProgressBar } from "@/shared/ui";

/** Le rouge est réservé au stock bas (seuil bas de la cuve atteint,
 * cf. Tank.lowAlarmMm côté backend) — jamais utilisé comme couleur de
 * produit, pour que "barre rouge" ne signifie qu'une seule chose. */
export function ProductBar({ percent, color, lowStock, lowStockLabel }: { percent: number; color: string | null; lowStock: boolean; lowStockLabel: string }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="max-w-40 flex-1">
        <ProgressBar percent={percent} color={lowStock ? "var(--color-error)" : (color ?? undefined)} className={lowStock ? "animate-pulse" : undefined} />
      </div>
      <span className={`font-mono text-caption tabular-nums ${lowStock ? "text-error" : "text-text-muted"}`}>{formatPercent(percent)}%</span>
      {lowStock && (
        <Badge tone="error">
          <TriangleAlert className="size-3" aria-hidden />
          {lowStockLabel}
        </Badge>
      )}
    </div>
  );
}
