import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import type { RefObject } from "react";

import type { City } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { cn } from "@/shared/lib/cn";
import { formatFreshness, getFreshnessTone } from "@/shared/lib/formatDateTime";

import type { StationRow } from "../useStationsList";
import { ProductStockGrid } from "./ProductStockGrid";
import { StationActionsCell } from "./StationActionsCell";
import { StationIdentityCell } from "./StationIdentityCell";
import { StationStatusCell } from "./StationStatusCell";
import { StationSyncBadge } from "./StationSyncBadge";
import { StationTotalValueCell } from "./StationTotalValueCell";

const BORDER_CLASS_BY_STATE: Record<StationRow["state"], string> = {
  critical: "border-l-error",
  alert: "border-l-warning",
  offline: "border-l-text-disabled",
  online: "border-l-transparent",
};

export function StationCard({
  row,
  city,
  formatVolume,
  formatMoney,
  formatUnitPrice,
  menuOpen,
  menuRef,
  onToggleMenu,
  onEdit,
  onToggleStatus,
  isLast = false,
}: {
  row: StationRow;
  city: City | null;
  formatVolume: (liters: number) => string;
  formatMoney: (value: number, currencyCode: string) => string | null;
  formatUnitPrice: (value: number) => string;
  menuOpen: boolean;
  menuRef?: RefObject<HTMLDivElement | null>;
  onToggleMenu: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  isLast?: boolean;
}) {
  const t = useTranslations("zyloLiquid.stations");
  const format = useFormatter();
  const router = useRouter();

  const fresh = getFreshnessTone(row.lastMeasurementAt);
  const detailHref = `/zylo-liquid/stations/${row.station.id}`;
  const moneyDisplay = row.totalValue !== null && row.totalCurrencyCode ? formatMoney(row.totalValue, row.totalCurrencyCode) : null;

  return (
    <div
      className={cn(
        "flex min-h-[120px] cursor-pointer items-center border-l-[3px] bg-surface px-4 py-3 transition-colors hover:bg-surface-muted/40",
        BORDER_CLASS_BY_STATE[row.state],
        !isLast && "border-b border-border-subtle"
      )}
      onClick={() => router.push(detailHref)}
    >
      <StationIdentityCell name={row.station.name} href={detailHref} state={row.state} cityName={city?.name ?? null} />

      <StationStatusCell state={row.state} label={t(`list.status.${row.state}`)} />

      <div className="w-[42%] pr-2">
        <ProductStockGrid products={row.products} emptyLabel="—" formatVolume={formatVolume} formatMoney={formatMoney} formatUnitPrice={formatUnitPrice} />
      </div>

      <StationTotalValueCell
        totalValue={row.totalValue}
        totalCurrencyCode={row.totalCurrencyCode}
        moneyDisplay={moneyDisplay}
        isPartial={row.pricingStatus === "partial"}
        partialLabel={t("list.row.partial")}
        valueNotCalculableLabel={t("list.row.valueNotCalculable")}
        conversionUnavailableLabel={t("list.row.conversionUnavailable")}
      />

      <div className="w-[7%]">
        <StationSyncBadge freshness={fresh} label={row.lastMeasurementAt ? formatFreshness(row.lastMeasurementAt, format) : t("list.row.syncOffline")} />
      </div>

      <StationActionsCell
        menuOpen={menuOpen}
        menuRef={menuRef}
        onToggleMenu={onToggleMenu}
        detailHref={detailHref}
        detailLabel={t("list.menu.viewDetail")}
        editLabel={t("list.menu.edit")}
        onEdit={onEdit}
        toggleStatusLabel={row.station.status === "active" ? t("list.menu.deactivate") : t("list.menu.reactivate")}
        onToggleStatus={onToggleStatus}
        alertsHref={`/zylo-liquid/alerts?station=${row.station.id}`}
        alertsLabel={t("list.menu.viewAlerts")}
        deliveriesHref={`/zylo-liquid/livraisons?station=${row.station.id}`}
        deliveriesLabel={t("list.menu.viewDeliveries")}
        leaksHref={`/zylo-liquid/fuites?station=${row.station.id}`}
        leaksLabel={t("list.menu.viewLeaks")}
      />
    </div>
  );
}
