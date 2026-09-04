export function ProductVolumeLine({ volumeLabel, capacityLabel }: { volumeLabel: string; capacityLabel: string }) {
  return (
    <div className="mt-0.5 flex items-baseline gap-2">
      <span className="font-mono font-semibold tabular-nums text-text">{volumeLabel}</span>
      <span className="font-mono text-caption tabular-nums text-text-muted">/ {capacityLabel}</span>
    </div>
  );
}
