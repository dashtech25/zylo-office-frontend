"use client";

import { Plus, Truck } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { createStationSupplier, listStationSuppliers, listSuppliers, updateStationSupplier, type StationSupplier, type Supplier } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, CardSectionHeader, EmptyState, FormField, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "../station-detail/PartState";

/** Domaine « Fournisseurs & partenaires » du Centre administratif — déclare
 * explicitement quels fournisseurs (référentiel réseau `Supplier`, déjà
 * construit lors de la fusion Approvisionnement) desservent cette station,
 * via la nouvelle table `StationSupplier` (jamais déduit des commandes déjà
 * passées). */
export function SuppliersSection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationAdmin.suppliers");
  const tCommon = useTranslations("common");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const [linksPage, suppliersPage] = await Promise.all([
      listStationSuppliers(organizationId, { stationId, limit: 100 }),
      listSuppliers(organizationId, { limit: 100 }),
    ]);
    return { links: linksPage.data, suppliers: suppliersPage.data };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, stationId, reloadKey]);
  const state = usePartData(load);

  const [supplierId, setSupplierId] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLink() {
    if (!supplierId) {
      setError(t("form.required"));
      return;
    }
    setLinking(true);
    setError(null);
    try {
      await createStationSupplier(organizationId, { stationId, supplierId });
      setSupplierId("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setLinking(false);
    }
  }

  async function handleToggleActive(linkId: string, active: boolean) {
    await updateStationSupplier(organizationId, linkId, { active });
    setReloadKey((k) => k + 1);
  }

  return (
    <PartStateBox state={state}>
      {state.status === "ready" && (() => {
        const { links, suppliers }: { links: StationSupplier[]; suppliers: Supplier[] } = state.data;
        const linkedIds = new Set(links.filter((l) => l.active).map((l) => l.supplierId));
        const available = suppliers.filter((s) => s.active && !linkedIds.has(s.id));
        return (
          <div className="flex flex-col gap-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Card>
              <CardSectionHeader title={t("form.title")} />
              <p className="-mt-3 mb-3 text-body-sm text-text-muted">{t("form.hint")}</p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <FormField label={t("form.supplier")}>
                    {() => <Select aria-label={t("form.supplier")} value={supplierId || undefined} onValueChange={setSupplierId} placeholder={t("form.selectSupplier")} options={available.map((s) => ({ value: s.id, label: s.name }))} />}
                  </FormField>
                </div>
                <Button size="sm" onClick={handleLink} loading={linking}>
                  <Plus className="size-4" aria-hidden />
                  {t("form.submit")}
                </Button>
              </div>
            </Card>

            {links.length === 0 ? (
              <EmptyState icon={Truck} title={t("empty")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("table.supplier")}</TableHeaderCell>
                    <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                    <TableHeaderCell></TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {links.map((link) => {
                    const supplier = suppliers.find((s) => s.id === link.supplierId);
                    return (
                      <TableRow key={link.id}>
                        <TableCell className="font-medium">{supplier?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge tone={link.active ? "success" : "neutral"}>{link.active ? t("statusActive") : t("statusInactive")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleToggleActive(link.id, !link.active)}>
                            {link.active ? t("deactivate") : t("reactivate")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })()}
    </PartStateBox>
  );
}
