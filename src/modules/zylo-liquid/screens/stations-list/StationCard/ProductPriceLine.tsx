export function ProductPriceLine({
  unitPriceLabel,
  priceUndefinedLabel,
  hasMonetaryValue,
  moneyDisplay,
  valueNotCalculableLabel,
  conversionUnavailableLabel,
}: {
  unitPriceLabel: string | null;
  priceUndefinedLabel: string;
  hasMonetaryValue: boolean;
  moneyDisplay: string | null;
  valueNotCalculableLabel: string;
  conversionUnavailableLabel: string;
}) {
  return (
    <div className="mt-0.5 flex items-center gap-2 text-body-sm">
      {unitPriceLabel === null ? <span className="italic text-text-muted">{priceUndefinedLabel}</span> : <span className="font-mono tabular-nums text-text-muted">{unitPriceLabel}</span>}
      {!hasMonetaryValue ? (
        <span className="italic text-text-muted">{valueNotCalculableLabel}</span>
      ) : moneyDisplay === null ? (
        <span className="italic text-text-muted">{conversionUnavailableLabel}</span>
      ) : (
        <span className="font-mono font-semibold tabular-nums text-text">{moneyDisplay}</span>
      )}
    </div>
  );
}
