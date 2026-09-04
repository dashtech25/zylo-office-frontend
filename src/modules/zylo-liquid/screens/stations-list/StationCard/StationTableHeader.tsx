import { useTranslations } from "next-intl";

export function StationTableHeader() {
  const t = useTranslations("zyloLiquid.stations");

  return (
    <div className="flex flex-nowrap items-start bg-surface-muted px-4 py-2.5 text-caption font-semibold uppercase tracking-wide text-text-muted">
      <div className="w-[20%]">{t("list.columns.station")}</div>
      <div className="w-[10%]">{t("list.columns.status")}</div>
      <div className="w-[42%]">
        {t("list.columns.stockByProduct")}
        <div className="mt-0.5 text-caption font-normal normal-case tracking-normal text-text-muted">{t("list.columns.stockByProductSub")}</div>
      </div>
      <div className="w-[15%] text-right">{t("list.columns.totalValue")}</div>
      <div className="w-[7%]">{t("list.columns.sync")}</div>
      <div className="w-[6%] text-right">{t("list.columns.actions")}</div>
    </div>
  );
}
