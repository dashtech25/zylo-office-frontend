"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { StationPicker } from "@/modules/zylo-liquid/components/StationPicker";
import type { City, Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Affectation d'un produit à une ou plusieurs stations (page_configuration.md
 * §15) — repliable pour ne pas alourdir chaque carte produit par défaut. */
export function ProductStationsToggle({
  stations,
  cities,
  isActive,
  onToggle,
}: {
  stations: Station[];
  cities: City[];
  isActive: (stationId: string) => boolean;
  onToggle: (stationId: string, currentlyActive: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.configuration.fuelCatalog");
  const [open, setOpen] = useState(false);
  const activeCount = stations.filter((s) => isActive(s.id)).length;
  const selected = useMemo(() => new Set(stations.filter((s) => isActive(s.id)).map((s) => s.id)), [stations, isActive]);

  return (
    <div className="mt-3 border-t border-border-subtle pt-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-body-sm">
        <span className="flex items-center gap-1.5 text-text-muted">
          {open ? <ChevronDown className="size-3.5" aria-hidden /> : <ChevronRight className="size-3.5" aria-hidden />}
          {t("stationsTitle")}
        </span>
        <span className="text-caption text-text-muted">{t("stationsCount", { active: activeCount, total: stations.length })}</span>
      </button>
      {open && (
        <div className="mt-2">
          <StationPicker mode="multiple" stations={stations} cities={cities} selected={selected} onToggle={(id) => onToggle(id, isActive(id))} />
        </div>
      )}
    </div>
  );
}
