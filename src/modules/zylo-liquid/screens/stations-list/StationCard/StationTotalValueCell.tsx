export function StationTotalValueCell({
  totalValue,
  totalCurrencyCode,
  moneyDisplay,
  isPartial,
  partialLabel,
  valueNotCalculableLabel,
  conversionUnavailableLabel,
}: {
  totalValue: number | null;
  totalCurrencyCode: string | null;
  moneyDisplay: string | null;
  isPartial: boolean;
  partialLabel: string;
  valueNotCalculableLabel: string;
  conversionUnavailableLabel: string;
}) {
  if (totalValue === null || !totalCurrencyCode) {
    return (
      <div className="w-[15%] pr-2 text-right">
        <span className="text-body-sm italic text-text-muted">{valueNotCalculableLabel}</span>
      </div>
    );
  }

  return (
    <div className="w-[15%] pr-2 text-right">
      <div className="font-mono font-semibold tabular-nums text-text">
        {moneyDisplay ?? conversionUnavailableLabel}
        {isPartial && <span className="text-caption text-text-muted"> {partialLabel}</span>}
      </div>
      <div className="text-caption text-text-muted">{totalCurrencyCode}</div>
    </div>
  );
}
