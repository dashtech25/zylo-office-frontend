"use client";

import { Plus, Truck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { reconcileDeliveryDeclaration } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, PageHeader, Select, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableRowSkeleton } from "@/shared/ui";

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
  const data = useApprovisionnement(currentOrganization?.id ?? null);

  const [stationId, setStationId] = useState("");
  const [fuelProductId, setFuelProductId] = useState("");
  const [eventAt, setEventAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [declaredVolumeLiters, setDeclaredVolumeLiters] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [deliveryNoteReference, setDeliveryNoteReference] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!stationId || !fuelProductId || !declaredVolumeLiters) {
      setFormError(t("form.required"));
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await data.create({
        stationId,
        fuelProductId,
        eventAt: new Date(eventAt).toISOString(),
        declaredVolumeLiters: Number(declaredVolumeLiters),
        supplierName: supplierName.trim() || undefined,
        deliveryNoteReference: deliveryNoteReference.trim() || undefined,
      });
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
            {() => <Select aria-label={t("form.station")} value={stationId || undefined} onValueChange={setStationId} placeholder={t("form.selectStation")} options={data.stations.map((s) => ({ value: s.id, label: s.name }))} />}
          </FormField>
          <FormField label={t("form.product")}>
            {() => <Select aria-label={t("form.product")} value={fuelProductId || undefined} onValueChange={setFuelProductId} placeholder={t("form.selectProduct")} options={data.fuelProducts.map((p) => ({ value: p.id, label: p.name }))} />}
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
              const product = data.fuelProducts.find((p) => p.id === d.fuelProductId);
              return (
                <TableRow key={d.id}>
                  <TableCell>{station?.name ?? "—"}</TableCell>
                  <TableCell>{product?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{d.declaredVolumeLiters} L</TableCell>
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
