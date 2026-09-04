"use client";

import { useTranslations } from "next-intl";

import { useHolykellSyncStatus } from "@/modules/zylo-liquid/hooks/useHolykellSyncStatus";
import { Badge } from "@/shared/ui";

import { SettingsSectionCard } from "./SettingsSectionCard";

/** Lecture seule : `HolykellAccountSyncStatusResponse` n'expose que
 * lastSyncAt/lastSyncStatus/lastSyncError/syncEnabled (jamais les
 * identifiants, par sécurité) — aucun endpoint n'existe pour les modifier.
 * Réutilise le hook déjà branché sur la barre du haut plutôt que de
 * refaire un fetch séparé. */
export function HolykellTab({ organizationId }: { organizationId: string }) {
  const t = useTranslations("zyloLiquid.settingsPage");
  const tRoot = useTranslations("zyloLiquid");
  const { account, minutesAgo } = useHolykellSyncStatus(organizationId);

  const statusLabel = !account ? t("holykell.notConfigured") : account.lastSyncStatus === "failed" ? t("holykell.disconnected") : t("holykell.connected");
  const statusTone = !account ? "neutral" : account.lastSyncStatus === "failed" ? "error" : "success";

  return (
    <div className="flex flex-col gap-4">
      <SettingsSectionCard title={t("holykell.sectionTitle")}>
        <div className="flex flex-col gap-2 text-body-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-muted">{t("holykell.statusLabel")}</span>
            <Badge tone={statusTone} dot>
              {statusLabel}
              {minutesAgo !== null && account?.lastSyncStatus !== "failed" && ` · ${tRoot("sync.label", { minutes: minutesAgo })}`}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-muted">{t("holykell.lastSync")}</span>
            <span>{account?.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString() : t("holykell.never")}</span>
          </div>
          {account?.lastSyncError && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-muted">{t("holykell.lastError")}</span>
              <span className="text-error">{account.lastSyncError}</span>
            </div>
          )}
        </div>
      </SettingsSectionCard>

      <p className="text-caption text-text-muted">{t("holykell.unavailableNote")}</p>
    </div>
  );
}
