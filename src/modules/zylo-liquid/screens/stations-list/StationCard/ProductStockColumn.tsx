import { useTranslations } from "next-intl";

import type { StationProductBreakdown } from "../useStationsList";
import { ProductBar } from "./ProductBar";
import { ProductHeader } from "./ProductHeader";
import { ProductPriceLine } from "./ProductPriceLine";
import { ProductVolumeLine } from "./ProductVolumeLine";

export function ProductStockColumn({
  product,
  formatVolume,
  formatMoney,
  formatUnitPrice,
}: {
  product: StationProductBreakdown;
  formatVolume: (liters: number) => string;
  formatMoney: (value: number, currencyCode: string) => string | null;
  formatUnitPrice: (value: number) => string;
}) {
  const t = useTranslations("zyloLiquid.stations");

  const percent = product.capacityLiters > 0 ? (product.volumeLiters / product.capacityLiters) * 100 : 0;
  const unitPrice = product.monetaryValue !== null && product.volumeLiters > 0 ? product.monetaryValue / product.volumeLiters : null;
  const moneyDisplay = product.monetaryValue !== null && product.currencyCode ? formatMoney(product.monetaryValue, product.currencyCode) : null;

  return (
    <div className="min-w-[170px] flex-none basis-[170px]">
      <ProductHeader color={product.displayColor} name={product.fuelProductName} tankLabel={t("list.row.tankCount", { count: product.tankCount })} />
      <ProductVolumeLine volumeLabel={formatVolume(product.volumeLiters)} capacityLabel={formatVolume(product.capacityLiters)} />
      <ProductBar percent={percent} color={product.displayColor} lowStock={product.belowLowThreshold} lowStockLabel={t("list.row.lowStock")} />
      <ProductPriceLine
        unitPriceLabel={unitPrice === null ? null : `${formatUnitPrice(unitPrice)} ${product.currencyCode}/L`}
        priceUndefinedLabel={t("list.row.priceUndefined")}
        hasMonetaryValue={product.monetaryValue !== null}
        moneyDisplay={moneyDisplay}
        valueNotCalculableLabel={t("list.row.valueNotCalculable")}
        conversionUnavailableLabel={t("list.row.conversionUnavailable")}
      />
    </div>
  );
}
