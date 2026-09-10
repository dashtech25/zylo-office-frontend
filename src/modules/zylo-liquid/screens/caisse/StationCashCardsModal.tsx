"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { CashMode, CurrencyCashBlock, NetworkProductCashLine } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Modal } from "@/shared/ui";

import { CashSummaryCards } from "./CashSummaryCards";
import { StationCashModal } from "./StationCashModal";
import type { CaisseStationRow } from "./useCaisseStationRows";

/** Aperçu "ventes du jour" d'une station (même style de cartes que la vue
 * réseau, image de référence validée) — construit à partir des données déjà
 * chargées par la page (aucun appel réseau supplémentaire). Clic sur une
 * carte (produit ou total) pour descendre jusqu'au détail par cuve, via le
 * drill-down existant (StationCashModal/TankCashModal) — même profondeur de
 * traçabilité que le reste de la page Caisse. */
export function StationCashCardsModal({
  open,
  onOpenChange,
  organizationId,
  row,
  fromDate,
  toDate,
  mode = "calendar",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  row: CaisseStationRow | null;
  fromDate: string;
  toDate: string;
  mode?: CashMode;
}) {
  const t = useTranslations("zyloLiquid.caisse.productCards");
  const tCommon = useTranslations("common");
  const [tankDrilldownOpen, setTankDrilldownOpen] = useState(false);

  const productBlocks: NetworkProductCashLine[] =
    row?.products.map((p) => ({
      fuelProductId: p.fuelProductId,
      fuelProductName: p.fuelProductName,
      displayColor: p.displayColor,
      tankCount: p.tankCount,
      stationCount: 1,
      volumeSoldLiters: p.volumeSoldLiters,
      monetaryValue: p.monetaryValue,
      currencyCode: p.currencyCode,
      monetaryValueNotCalculableReason: p.monetaryValueNotCalculableReason,
      confidence: p.confidence,
      stations: [],
    })) ?? [];

  const currencyBlocks: CurrencyCashBlock[] =
    row && row.monetaryValue !== null && row.currencyCode
      ? [
          {
            currencyCode: row.currencyCode,
            monetaryValue: row.monetaryValue,
            volumeSoldLiters: row.volumeSoldLiters,
            stationCount: 1,
            stations: [],
          },
        ]
      : [];

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} title={row?.station.name ?? ""} closeLabel={tCommon("actions.close")} size="xl">
        {row && (
          <CashSummaryCards
            productBlocks={productBlocks}
            currencyBlocks={currencyBlocks}
            hideStationsConcerned
            totalCardLabel={() => t("totalStation")}
            onProductClick={() => setTankDrilldownOpen(true)}
            onTotalClick={() => setTankDrilldownOpen(true)}
          />
        )}
      </Modal>

      <StationCashModal
        open={tankDrilldownOpen}
        onOpenChange={setTankDrilldownOpen}
        organizationId={organizationId}
        stationId={row?.station.id ?? null}
        fromDate={fromDate}
        toDate={toDate}
        mode={mode}
      />
    </>
  );
}
