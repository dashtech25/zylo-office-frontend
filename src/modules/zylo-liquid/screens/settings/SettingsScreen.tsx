"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { PageHeader, Stack } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Tabs } from "@/shared/ui/Tabs";

import { ComingSoonTabContent } from "./ComingSoonTabContent";
import { HolykellTab } from "./HolykellTab";
import { OrganisationTab } from "./OrganisationTab";
import { SystemeTab } from "./SystemeTab";

/** Page "Paramètres" — chaque onglet est construit à partir de ce qui
 * existe réellement côté backend (audité avant de coder, cf. discussion) :
 * Organisation (nom seul, réel), Holykell (statut de sync, lecture seule),
 * Système (constantes de algorithms.py, lecture seule). Notifications et
 * Utilisateurs n'ont aucune donnée réelle derrière eux aujourd'hui — même
 * traitement que les autres pages "à venir" du réseau (ComingSoonPage),
 * jamais une fonctionnalité simulée. */
export default function SettingsScreen() {
  const t = useTranslations("zyloLiquid.settingsPage");
  const tCommon = useTranslations("common");
  const { currentOrganization, reload } = useOrganization();
  const [tab, setTab] = useState("organisation");

  if (!currentOrganization) return <PageSpinner label={tCommon("states.loading")} />;

  return (
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />

      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: "organisation",
            label: t("tabs.organisation"),
            content: <OrganisationTab organization={currentOrganization} onUpdated={reload} />,
          },
          {
            value: "holykell",
            label: t("tabs.holykell"),
            content: <HolykellTab organizationId={currentOrganization.id} />,
          },
          {
            value: "systeme",
            label: t("tabs.systeme"),
            content: <SystemeTab />,
          },
          {
            value: "notifications",
            label: t("tabs.notifications"),
            content: <ComingSoonTabContent note={t("comingSoon.notifications")} />,
          },
          {
            value: "utilisateurs",
            label: t("tabs.utilisateurs"),
            content: <ComingSoonTabContent note={t("comingSoon.utilisateurs")} />,
          },
        ]}
      />
    </Stack>
  );
}
