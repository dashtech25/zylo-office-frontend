"use client";

import { Building2, Paperclip, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { Supplier, StationSupplier, SupplierCategory } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, Card, EmptyState, Input, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { SupplierFormModal } from "../station-detail/SupplierFormModal";
import { SupplierModal } from "../station-detail/SupplierModal";
import { useSuppliers } from "../station-detail/useSuppliers";

const CATEGORY_TONE = { carburant: "info", equipement: "primary", maintenance: "warning", securite: "error", service: "neutral", autre: "neutral" } as const;
const CONTRACT_STATUS_TONE = { valid: "success", renew_soon: "warning", expired: "error", unknown: "neutral" } as const;
const CATEGORIES: SupplierCategory[] = ["carburant", "equipement", "maintenance", "securite", "service", "autre"];

/** Refonte complète de la section « Fournisseurs » du Centre administratif
 * (amelioration/reglementation, maquette Fournisseurs fournie) — remplace
 * l'ancien gestionnaire de liaison minimal (un select + une table à 3
 * colonnes) par une liste filtrable/recherchable, une modale de détail à
 * onglets (Informations/Contrat/Services & Équipements/Documents/
 * Historique) et un formulaire de création/édition à onglets, sur le même
 * backend `Supplier`/`StationSupplier` (jamais un second modèle). */
export function SuppliersSection({ organizationId, stationId }: { organizationId: string; stationId: string }) {
  const t = useTranslations("zyloLiquid.stationDetail.suppliersTab");
  const tCommon = useTranslations("common");
  const data = useSuppliers(organizationId, stationId);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [openLinkId, setOpenLinkId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supplierById = useMemo(() => new Map(data.suppliers.map((s) => [s.id, s])), [data.suppliers]);

  const rows = useMemo(() => {
    return data.links
      .map((link) => ({ link, supplier: supplierById.get(link.supplierId) }))
      .filter((row): row is { link: StationSupplier; supplier: Supplier } => !!row.supplier)
      .filter(({ supplier }) => !search || supplier.name.toLowerCase().includes(search.toLowerCase()))
      .filter(({ supplier }) => !categoryFilter || supplier.category === categoryFilter)
      .filter(({ link }) => !statusFilter || (statusFilter === "active" ? link.active : !link.active));
  }, [data.links, supplierById, search, categoryFilter, statusFilter]);

  const openRow = rows.find((r) => r.link.id === openLinkId);
  const editingRow = rows.find((r) => r.link.id === editingLinkId);

  async function handleCreate(
    supplierData: Parameters<typeof data.createSupplierAndLink>[0],
    linkData: Parameters<typeof data.createSupplierAndLink>[1]
  ) {
    try {
      await data.createSupplierAndLink(supplierData, linkData);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("states.error"));
      throw err;
    }
  }

  if (data.loading) return <PageSpinner label={tCommon("states.loading")} />;

  return (
    <div className="flex flex-col gap-4">
      {data.error && <Alert tone="error">{data.error}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className="pl-8" />
        </div>
        <Select
          aria-label={t("filterCategory")}
          value={categoryFilter || undefined}
          onValueChange={setCategoryFilter}
          placeholder={t("filterCategory")}
          options={[{ value: "", label: t("allCategories") }, ...CATEGORIES.map((c) => ({ value: c, label: t(`modal.category.${c}`) }))]}
        />
        <Select
          aria-label={t("filterStatus")}
          value={statusFilter || undefined}
          onValueChange={setStatusFilter}
          placeholder={t("filterStatus")}
          options={[
            { value: "", label: t("allStatuses") },
            { value: "active", label: t("modal.active") },
            { value: "inactive", label: t("modal.inactive") },
          ]}
        />
        <Button
          size="sm"
          onClick={() => {
            setEditingLinkId(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          {t("addButton")}
        </Button>
      </div>

      <Card padding="none">
        <div className="p-5">
          {rows.length === 0 ? (
            <EmptyState icon={Building2} title={t("empty")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("table.name")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.category")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.contact")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.status")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.contract")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.files")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ link, supplier }) => (
                  <TableRow key={link.id} clickable onClick={() => setOpenLinkId(link.id)}>
                    <TableCell className="font-medium text-text underline decoration-dotted">{supplier.name}</TableCell>
                    <TableCell>{supplier.category ? <Badge tone={CATEGORY_TONE[supplier.category]}>{t(`modal.category.${supplier.category}`)}</Badge> : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-caption text-text-muted">
                        <span>{supplier.contactPhone ?? "—"}</span>
                        <span>{supplier.contactEmail ?? ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge tone={link.active ? "success" : "neutral"}>{link.active ? t("modal.active") : t("modal.inactive")}</Badge>
                    </TableCell>
                    <TableCell>
                      {link.contractEndDate ? (
                        <span className="flex items-center gap-2">
                          {link.contractEndDate}
                          <Badge tone={CONTRACT_STATUS_TONE[link.contractStatus]}>{t(`modal.contractStatus.${link.contractStatus}`)}</Badge>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-text-muted">
                        <Paperclip className="size-3.5" aria-hidden />
                        {data.fileCounts[link.id] ?? 0}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <SupplierModal
        open={!!openRow}
        onOpenChange={(next) => !next && setOpenLinkId(null)}
        supplier={openRow?.supplier ?? null}
        link={openRow?.link ?? null}
        onEdit={() => {
          setEditingLinkId(openLinkId);
          setOpenLinkId(null);
          setFormOpen(true);
        }}
        listFiles={data.listFiles}
        attachFiles={data.attachFiles}
        removeFile={data.removeFile}
        downloadFile={data.downloadFile}
        listHistory={data.listHistory}
      />

      <SupplierFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editingRow?.supplier}
        link={editingRow?.link}
        onCreate={handleCreate}
        onUpdateSupplier={data.updateSupplierInfo}
        onUpdateLink={data.updateLink}
      />
    </div>
  );
}
