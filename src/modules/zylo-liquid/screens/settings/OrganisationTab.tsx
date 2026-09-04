"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/core/api/client";
import { updateOrganization } from "@/core/api/organizations";
import type { Organization } from "@/core/auth/types";
import { Alert, Button, FormField, Input } from "@/shared/ui";

import { SettingsSectionCard } from "./SettingsSectionCard";
import { SettingsToast } from "./SettingsToast";

/** Seul `name` est réellement modifiable : `Organization` (Core) n'a que
 * `name`/`slug`/`status` en base — voir PATCH /organizations/{id}. Les
 * autres champs de la maquette (logo, téléphone, email, langue, devise)
 * n'existent nulle part, donc pas de faux formulaire qui n'enregistrerait
 * rien : un simple avertissement explique pourquoi ils sont absents. */
export function OrganisationTab({ organization, onUpdated }: { organization: Organization; onUpdated: () => void }) {
  const t = useTranslations("zyloLiquid.settingsPage");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(organization.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    setName(organization.name);
  }, [organization.name]);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(timer);
  }, [showToast]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateOrganization(organization.id, { name });
      onUpdated();
      setShowToast(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("states.error"));
    } finally {
      setSaving(false);
    }
  }

  const dirty = name.trim() !== organization.name && name.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <SettingsSectionCard title={t("organisation.sectionTitle")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex items-end gap-3">
            <div className="max-w-md flex-1">
              <FormField label={t("organisation.name")} required hint={t("organisation.nameHint")}>
                {(field) => <Input {...field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />}
              </FormField>
            </div>
            <Button type="submit" size="sm" loading={saving} disabled={!dirty}>
              {t("save")}
            </Button>
          </div>
        </form>
      </SettingsSectionCard>

      <Alert tone="info">{t("organisation.unavailableNote")}</Alert>

      {showToast && <SettingsToast message={t("saved")} onClose={() => setShowToast(false)} />}
    </div>
  );
}
