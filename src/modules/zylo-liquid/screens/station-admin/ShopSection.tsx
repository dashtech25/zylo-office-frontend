"use client";

import { useTranslations } from "next-intl";

import type { Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { ShopWorkspace } from "@/modules/zylo-liquid/screens/produits/ShopWorkspace";
import { Stack } from "@/shared/ui";

/** Section « Boutique » de `StationAdminCenter` (Phase 4 mission Boutique,
 * décision d'emplacement UI validée : Station → Configuration → Boutique).
 * Réutilise entièrement `ShopWorkspace` avec `fixedStationId` — jamais une
 * deuxième implémentation du catalogue/vente comptoir/historique déjà
 * construits pour la vue réseau `/zylo-liquid/produits`. */
export function ShopSection({ organizationId, station }: { organizationId: string; station: Station }) {
  const t = useTranslations("zyloLiquid.stationAdmin");

  return (
    <Stack>
      <div>
        <h2 className="text-h4 font-semibold text-text">{t("sections.shop")}</h2>
        <p className="text-body-sm text-text-muted">{station.name}</p>
      </div>
      <ShopWorkspace organizationId={organizationId} fixedStationId={station.id} />
    </Stack>
  );
}
