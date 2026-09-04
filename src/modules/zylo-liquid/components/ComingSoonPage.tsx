"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState, PageHeader, Stack } from "@/shared/ui";

/** Page-coquille pour tout item de la sidebar du prototype dont la donnée
 * n'existe pas au Niveau 1 (CAS 4 de la mission d'intégration : ventes,
 * caisse, RH/shifts, crédit client, maintenance, HSE, réglementaire,
 * audit, configuration avancée, utilisateurs par station). L'emplacement
 * et le titre exacts du prototype sont conservés — seule la fonctionnalité
 * est désactivée, jamais retirée, jamais approximée avec une donnée
 * inventée. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
export function ComingSoonPage({ title, subtitle }: { title: string; subtitle?: string }) {
  const tCommon = useTranslations("common");
  return (
    <Stack>
      <PageHeader title={title} description={subtitle} />
      <EmptyState icon={Lock} title={tCommon("states.comingSoon")} />
    </Stack>
  );
}
