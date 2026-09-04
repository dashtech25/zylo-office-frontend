import type { StationProductBreakdown } from "../useStationsList";
import { ProductStockColumn } from "./ProductStockColumn";

/** Colonnes produit côte à côte (et non empilées) pour rester compact,
 * conformément à la maquette de référence. */
export function ProductStockGrid({
  products,
  emptyLabel,
  formatVolume,
  formatMoney,
  formatUnitPrice,
}: {
  products: StationProductBreakdown[];
  emptyLabel: string;
  formatVolume: (liters: number) => string;
  formatMoney: (value: number, currencyCode: string) => string | null;
  formatUnitPrice: (value: number) => string;
}) {
  if (products.length === 0) {
    return <span className="text-caption text-text-muted">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap items-start gap-5">
      {[...products]
        .sort((a, b) => b.volumeLiters - a.volumeLiters)
        .map((product) => (
          <ProductStockColumn key={product.fuelProductId} product={product} formatVolume={formatVolume} formatMoney={formatMoney} formatUnitPrice={formatUnitPrice} />
        ))}
    </div>
  );
}
