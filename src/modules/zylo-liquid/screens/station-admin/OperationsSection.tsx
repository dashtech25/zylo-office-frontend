"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import {
  createStationFuelProduct,
  listStationFuelProducts,
  updateStation,
  updateStationFuelProduct,
  type FuelProduct,
  type Station,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Button, Card, CardSectionHeader, Checkbox, FormField, Input } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

/** Domaine « Exploitation » du Centre administratif — produits vendus
 * (association StationFuelProduct, jamais déduite d'une cuve existante) et
 * services boutique/lavage/vidange/gaz déjà en base (`Station.hasShop`...)
 * mais jamais exposés dans une UI avant cette mission. */
export function OperationsSection({
  organizationId,
  station,
  fuelProducts,
  onReload,
}: {
  organizationId: string;
  station: Station;
  fuelProducts: FuelProduct[];
  onReload: () => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin.operations");
  const tCommon = useTranslations("common");

  const load = useCallback(
    () => listStationFuelProducts(organizationId, { stationId: station.id, limit: 100 }).then((p) => p.data),
    [organizationId, station.id]
  );
  const associations = usePartData(load);

  const [hasShop, setHasShop] = useState(station.hasShop);
  const [shopName, setShopName] = useState(station.shopName ?? "");
  const [shopSurfaceM2, setShopSurfaceM2] = useState(station.shopSurfaceM2 !== null ? String(station.shopSurfaceM2) : "");
  const [hasLavage, setHasLavage] = useState(station.hasLavage);
  const [hasVidange, setHasVidange] = useState(station.hasVidange);
  const [hasGazDomestique, setHasGazDomestique] = useState(station.hasGazDomestique);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleProduct(fuelProductId: string, associationId: string | null, active: boolean) {
    try {
      if (associationId) {
        await updateStationFuelProduct(organizationId, associationId, { active });
      } else {
        await createStationFuelProduct(organizationId, { stationId: station.id, fuelProductId });
      }
      onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    }
  }

  async function handleSaveServices() {
    setSaving(true);
    setError(null);
    try {
      await updateStation(organizationId, station.id, {
        hasShop,
        shopName: hasShop ? shopName || undefined : undefined,
        hasLavage,
        hasVidange,
        hasGazDomestique,
      });
      onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <CardSectionHeader title={t("productsTitle")} />
        <p className="-mt-3 mb-3 text-body-sm text-text-muted">{t("productsHint")}</p>
        <PartStateBox state={associations}>
          {associations.status === "ready" && (
            <div className="flex flex-col gap-2">
              {fuelProducts.map((product) => {
                const assoc = associations.data.find((a) => a.fuelProductId === product.id) ?? null;
                const active = assoc?.active ?? false;
                return (
                  <label key={product.id} className="flex items-center justify-between gap-3 rounded-card border border-border-subtle px-3 py-2">
                    <span className="text-body-sm text-text">{product.name}</span>
                    <Checkbox checked={active} onChange={() => handleToggleProduct(product.id, assoc?.id ?? null, !active)} />
                  </label>
                );
              })}
              {fuelProducts.length === 0 && <p className="text-body-sm text-text-muted">{t("noProducts")}</p>}
            </div>
          )}
        </PartStateBox>
      </Card>

      <Card>
        <CardSectionHeader title={t("servicesTitle")} action={<Button size="sm" loading={saving} onClick={handleSaveServices}>{tCommon("actions.save")}</Button>} />
        <div className="flex flex-col gap-3">
          <Checkbox label={t("hasShop")} checked={hasShop} onChange={(e) => setHasShop(e.target.checked)} />
          {hasShop && (
            <div className="grid grid-cols-1 gap-3 pl-6 sm:grid-cols-2">
              <FormField label={t("shopName")}>{(field) => <Input {...field} value={shopName} onChange={(e) => setShopName(e.target.value)} maxLength={120} />}</FormField>
              <FormField label={t("shopSurfaceM2")}>{(field) => <Input {...field} type="number" step="any" value={shopSurfaceM2} onChange={(e) => setShopSurfaceM2(e.target.value)} />}</FormField>
            </div>
          )}
          <Checkbox label={t("hasLavage")} checked={hasLavage} onChange={(e) => setHasLavage(e.target.checked)} />
          <Checkbox label={t("hasVidange")} checked={hasVidange} onChange={(e) => setHasVidange(e.target.checked)} />
          <Checkbox label={t("hasGazDomestique")} checked={hasGazDomestique} onChange={(e) => setHasGazDomestique(e.target.checked)} />
        </div>
      </Card>
    </div>
  );
}
