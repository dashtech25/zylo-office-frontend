"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { listTanks, reconcileDeliveryDeclaration, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, PageHeader, SearchableSelect, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableRowSkeleton } from "@/shared/ui";

import { useApprovisionnement } from "./useApprovisionnement";

/** Livraisons déclarées par un humain (processus-double-sources-verite,
 * Phase 5-8) — jamais confondu avec les livraisons détectées
 * automatiquement (écran Livraisons, télémétrie pure) : les deux
 * coexistent, rapprochées seulement à la demande, jamais fusionnées. */
export default function ApprovisionnementScreen() {
  const t = useTranslations("zyloLiquid.approvisionnementScreen");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id ?? null;
  const data = useApprovisionnement(organizationId);

  // Réseau entier : les cuves de toutes les stations sont chargées une fois
  // ici (le hook `useApprovisionnement` ne les connaît pas), pour (1)
  // alimenter le sélecteur de cuve du formulaire, filtré par station/produit
  // sélectionnés, et (2) retrouver le produit d'une ligne de déclaration
  // existante (`DeliveryDeclarationLine.tankId` -> `Tank.fuelProductId`)
  // dans le tableau historique, quelle que soit la station de la ligne.
  const tanksQuery = useQuery({
    queryKey: ["zylo-liquid", "approvisionnement-tanks", organizationId],
    queryFn: () => listTanks(organizationId as string, 200),
    enabled: !!organizationId,
  });
  const tanks: Tank[] = tanksQuery.data?.data ?? [];
  const tanksById = useMemo(() => new Map(tanks.map((tk) => [tk.id, tk])), [tanks]);

  const [stationId, setStationId] = useState("");
  const [fuelProductId, setFuelProductId] = useState("");
  const [tankId, setTankId] = useState("");
  const [eventAt, setEventAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [declaredVolumeLiters, setDeclaredVolumeLiters] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [deliveryNoteReference, setDeliveryNoteReference] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const stationTanks = useMemo(
    () => tanks.filter((tk) => tk.stationId === stationId && (!fuelProductId || tk.fuelProductId === fuelProductId)),
    [tanks, stationId, fuelProductId]
  );

  function handleStationChange(value: string) {
    setStationId(value);
    setFuelProductId("");
    setTankId("");
  }

  function handleProductChange(value: string) {
    setFuelProductId(value);
    setTankId("");
  }

  async function handleCreate() {
    if (!stationId || !tankId || !declaredVolumeLiters) {
      setFormError(t("form.required"));
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await data.create({
        stationId,
        eventAt: new Date(eventAt).toISOString(),
        lines: [{ tankId, volumeLiters: Number(declaredVolumeLiters) }],
        supplierName: supplierName.trim() || undefined,
        deliveryNoteReference: deliveryNoteReference.trim() || undefined,
      });
      setTankId("");
      setDeclaredVolumeLiters("");
      setSupplierName("");
      setDeliveryNoteReference("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreating(false);
    }
  }

  async function handleReconcile(id: string) {
    if (!currentOrganization) return;
    setReconcilingId(id);
    try {
      await reconcileDeliveryDeclaration(currentOrganization.id, id);
      await data.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setReconcilingId(null);
    }
  }

  return (
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />
      <Alert tone="info">{t("banner")}</Alert>
      {formError && <Alert tone="error">{formError}</Alert>}
      {data.error && <Alert tone="error">{data.error}</Alert>}

      <Card>
        <h2 className="text-h4 font-semibold text-text">{t("form.title")}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label={t("form.station")}>
            {() => <SearchableSelect aria-label={t("form.station")} value={stationId || undefined} onValueChange={handleStationChange} placeholder={t("form.selectStation")} options={data.stations.map((s) => ({ value: s.id, label: s.name }))} />}
          </FormField>
          <FormField label={t("form.product")}>
            {() => <SearchableSelect aria-label={t("form.product")} value={fuelProductId || undefined} onValueChange={handleProductChange} placeholder={t("form.selectProduct")} options={data.fuelProducts.map((p) => ({ value: p.id, label: p.name }))} />}
          </FormField>
          <FormField label={t("form.tank")}>
            {() => <SearchableSelect aria-label={t("form.tank")} value={tankId || undefined} onValueChange={setTankId} placeholder={t("form.selectTank")} options={stationTanks.map((tk) => ({ value: tk.id, label: tk.displayName }))} />}
          </FormField>
          <FormField label={t("form.eventAt")}>
            {(field) => <Input {...field} type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} />}
          </FormField>
          <FormField label={t("form.volume")}>
            {(field) => <Input {...field} type="number" step="1" value={declaredVolumeLiters} onChange={(e) => setDeclaredVolumeLiters(e.target.value)} />}
          </FormField>
          <FormField label={t("form.supplier")}>
            {(field) => <Input {...field} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />}
          </FormField>
          <FormField label={t("form.reference")}>
            {(field) => <Input {...field} value={deliveryNoteReference} onChange={(e) => setDeliveryNoteReference(e.target.value)} />}
          </FormField>
        </div>
        <Button className="mt-4" onClick={handleCreate} loading={creating}>
          <Plus className="size-4" aria-hidden />
          {t("form.submit")}
        </Button>
      </Card>

      {data.loading ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.station")}</TableHeaderCell>
              <TableHeaderCell>{t("table.product")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.volume")}</TableHeaderCell>
              <TableHeaderCell>{t("table.date")}</TableHeaderCell>
              <TableHeaderCell>{t("table.status")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={6} />
            ))}
          </TableBody>
        </Table>
      ) : data.declarations.length === 0 ? (
        <EmptyState icon={Truck} title={t("empty")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("table.station")}</TableHeaderCell>
              <TableHeaderCell>{t("table.product")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("table.volume")}</TableHeaderCell>
              <TableHeaderCell>{t("table.date")}</TableHeaderCell>
              <TableHeaderCell>{t("table.status")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.declarations.map((d) => {
              const station = data.stations.find((s) => s.id === d.stationId);
              // Une déclaration peut désormais porter plusieurs lignes
              // (plusieurs cuves/produits pour une même visite de camion,
              // créées ailleurs dans l'app, ex. `DeliveriesSection`) : le
              // volume affiché ici est la somme des lignes, et le produit
              // la liste des produits distincts touchés.
              const productNames = Array.from(
                new Set(
                  d.lines
                    .map((line) => tanksById.get(line.tankId)?.fuelProductId)
                    .filter((id): id is string => !!id)
                    .map((productId) => data.fuelProducts.find((p) => p.id === productId)?.name)
                    .filter((name): name is string => !!name)
                )
              );
              const totalVolumeLiters = d.lines.reduce((sum, line) => sum + line.volumeLiters, 0);
              return (
                <TableRow key={d.id}>
                  <TableCell>{station?.name ?? "—"}</TableCell>
                  <TableCell>{productNames.length > 0 ? productNames.join(", ") : "—"}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{totalVolumeLiters} L</TableCell>
                  <TableCell>{format.dateTime(new Date(d.eventAt), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell>
                    <Badge tone={d.lifecycleStatus === "locked" ? "neutral" : "info"}>{t(`status.${d.lifecycleStatus}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="link" loading={reconcilingId === d.id} onClick={() => handleReconcile(d.id)}>
                      {t("table.reconcile")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
