import { Card, ProgressBar } from "@/shared/ui";

export interface NetworkSummaryProduct {
  name: string;
  color: string | null;
  volume: number;
  capacity: number;
}

/** Placé avant le tableau (pas en pied de page discret) : c'est l'un des
 * premiers repères que l'œil doit trouver, donc texte foncé et grande taille
 * pour la valeur totale, cohérent avec la politique de lisibilité de la page
 * (toute l'information compte — seule la taille distingue la hiérarchie). */
export function NetworkSummaryBar({
  products,
  formatVolume,
  formatPercent,
  totalLabel,
  totalDisplay,
}: {
  products: NetworkSummaryProduct[];
  formatVolume: (liters: number) => string;
  formatPercent: (percent: number) => string;
  totalLabel: string;
  totalDisplay: string;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-6">
        <span className="shrink-0 text-body-sm font-semibold text-text">{totalLabel}</span>

        <div className="flex flex-1 flex-wrap gap-6">
          {products.map((p) => {
            const pct = p.capacity > 0 ? (p.volume / p.capacity) * 100 : 0;
            return (
              <div key={p.name} className="flex items-center gap-2">
                <span className="text-body-sm font-semibold" style={{ color: p.color ?? "var(--color-text)" }}>
                  {p.name.toUpperCase()}
                </span>
                <span className="font-mono font-semibold tabular-nums text-text">{formatVolume(p.volume)}</span>
                <span className="font-mono text-caption tabular-nums text-text-muted">/ {formatVolume(p.capacity)}</span>
                <span className="font-mono text-caption tabular-nums text-text-muted">{formatPercent(pct)}%</span>
                <div className="w-[90px]">
                  <ProgressBar percent={pct} color={p.color ?? undefined} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 font-mono text-h4 font-semibold tabular-nums text-text">{totalDisplay}</div>
      </div>
    </Card>
  );
}
