"use client";

import { useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { PageHeader, Stack } from "@/shared/ui";

import { ShopWorkspace } from "./ShopWorkspace";

/** Produits & boutique — vue réseau consolidée (Blocs 4 corrigé/5 de la
 * mission « vente-maintenant-reglementation », Phase 4 mission Boutique).
 * L'UI est partagée avec la section « Boutique » de `StationAdminCenter`
 * via `ShopWorkspace` — jamais deux implémentations du même flux catalogue
 * + vente comptoir + historique. */
export default function ProduitsScreen() {
  const t = useTranslations("zyloLiquid.produitsScreen");
  const { currentOrganization } = useOrganization();

  if (!currentOrganization) return null;

  return (
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />
      <ShopWorkspace organizationId={currentOrganization.id} />
    </Stack>
  );
}
