"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/core/api/client";
import {
  getTraccarConnection,
  getTrackingSettings,
  setTraccarConnection,
  updateTrackingSettings,
  type TraccarConnection,
  type TrackingSettings,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Alert, Badge, Button, FormField, Input } from "@/shared/ui";

import { SettingsSectionCard } from "./SettingsSectionCard";
import { SettingsToast } from "./SettingsToast";

/** Connexion Traccar par organisation (mission « tracking », étape 2 —
 * scénario 1) : l'admin saisit une fois l'adresse du serveur et les
 * identifiants, conservés côté serveur, jamais reressaisis. Réglages de
 * tracking (scénario 6/9) : seuil d'arrêt configurable, remplace la
 * constante réseau fixe de l'étape 1 pour cette organisation. */
export function TrackingTab({ organizationId }: { organizationId: string }) {
  const t = useTranslations("zyloLiquid.settingsPage");
  const tCommon = useTranslations("common");

  const [connection, setConnection] = useState<TraccarConnection | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionToast, setConnectionToast] = useState(false);

  const [, setSettings] = useState<TrackingSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [stopStabilizationMinutes, setStopStabilizationMinutes] = useState("");
  const [stopRadiusMeters, setStopRadiusMeters] = useState("");
  const [liveViewThrottleMs, setLiveViewThrottleMs] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsToast, setSettingsToast] = useState(false);

  useEffect(() => {
    setLoadingConnection(true);
    getTraccarConnection(organizationId)
      .then((c) => {
        setConnection(c);
        if (c) {
          setBaseUrl(c.baseUrl);
          setUsername(c.username);
          setPassword(c.password);
        }
      })
      .finally(() => setLoadingConnection(false));

    setLoadingSettings(true);
    getTrackingSettings(organizationId)
      .then((s) => {
        setSettings(s);
        setStopStabilizationMinutes(s.stopStabilizationMinutes !== null ? String(s.stopStabilizationMinutes) : "");
        setStopRadiusMeters(s.stopRadiusMeters !== null ? String(s.stopRadiusMeters) : "");
        setLiveViewThrottleMs(s.liveViewThrottleMs !== null ? String(s.liveViewThrottleMs) : "");
      })
      .finally(() => setLoadingSettings(false));
  }, [organizationId]);

  useEffect(() => {
    if (!connectionToast) return;
    const timer = setTimeout(() => setConnectionToast(false), 3000);
    return () => clearTimeout(timer);
  }, [connectionToast]);

  useEffect(() => {
    if (!settingsToast) return;
    const timer = setTimeout(() => setSettingsToast(false), 3000);
    return () => clearTimeout(timer);
  }, [settingsToast]);

  async function handleSaveConnection(event: React.FormEvent) {
    event.preventDefault();
    setSavingConnection(true);
    setConnectionError(null);
    try {
      // Le serveur teste réellement la connexion à Traccar avant
      // d'enregistrer quoi que ce soit (scénario 1, validé avec le
      // commanditaire) — si ça échoue, rien n'est sauvegardé, l'ancienne
      // configuration (si elle existait) reste active.
      const saved = await setTraccarConnection(organizationId, { baseUrl: baseUrl.trim(), username: username.trim(), password });
      setConnection(saved);
      setPassword(saved.password);
      setConnectionToast(true);
    } catch (err) {
      setConnectionError(err instanceof ApiError ? err.message : tCommon("states.error"));
    } finally {
      setSavingConnection(false);
    }
  }

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    setSavingSettings(true);
    setSettingsError(null);
    try {
      const saved = await updateTrackingSettings(organizationId, {
        stopStabilizationMinutes: stopStabilizationMinutes.trim() ? Number(stopStabilizationMinutes) : null,
        stopRadiusMeters: stopRadiusMeters.trim() ? Number(stopRadiusMeters) : null,
        liveViewThrottleMs: liveViewThrottleMs.trim() ? Number(liveViewThrottleMs) : null,
      });
      setSettings(saved);
      setSettingsToast(true);
    } catch (err) {
      setSettingsError(err instanceof ApiError ? err.message : tCommon("states.error"));
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSectionCard title={t("tracking.connectionSectionTitle")}>
        {loadingConnection ? (
          <p className="text-body-sm text-text-muted">{tCommon("states.loading")}</p>
        ) : (
          <form onSubmit={handleSaveConnection} className="flex flex-col gap-3">
            {connectionError && <Alert tone="error">{t("tracking.testFailed")} {connectionError}</Alert>}
            <div className="flex items-center gap-2">
              <Badge tone={connection ? "success" : "neutral"} dot>
                {connection ? t("tracking.connectionConfigured") : t("tracking.connectionNotConfigured")}
              </Badge>
            </div>
            <FormField label={t("tracking.baseUrl")} required hint={t("tracking.baseUrlHint")}>
              {(f) => <Input {...f} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://traccar.example.com" required />}
            </FormField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label={t("tracking.username")} required>
                {(f) => <Input {...f} value={username} onChange={(e) => setUsername(e.target.value)} required />}
              </FormField>
              <FormField label={t("tracking.password")} required>
                {(f) => (
                  <div className="relative">
                    <Input
                      {...f}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t("tracking.hidePassword") : t("tracking.showPassword")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                    >
                      {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                    </button>
                  </div>
                )}
              </FormField>
            </div>
            <div>
              <Button type="submit" size="sm" loading={savingConnection}>{t("tracking.saveAndTest")}</Button>
            </div>
          </form>
        )}
      </SettingsSectionCard>

      <SettingsSectionCard title={t("tracking.settingsSectionTitle")}>
        {loadingSettings ? (
          <p className="text-body-sm text-text-muted">{tCommon("states.loading")}</p>
        ) : (
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-3">
            {settingsError && <Alert tone="error">{settingsError}</Alert>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField label={t("tracking.stopStabilizationMinutes")} hint={t("tracking.stopStabilizationHint")}>
                {(f) => <Input {...f} type="number" min={1} value={stopStabilizationMinutes} onChange={(e) => setStopStabilizationMinutes(e.target.value)} placeholder="10" />}
              </FormField>
              <FormField label={t("tracking.stopRadiusMeters")} hint={t("tracking.stopRadiusHint")}>
                {(f) => <Input {...f} type="number" min={1} value={stopRadiusMeters} onChange={(e) => setStopRadiusMeters(e.target.value)} placeholder="150" />}
              </FormField>
              <FormField label={t("tracking.liveViewThrottleMs")} hint={t("tracking.liveViewThrottleHint")}>
                {(f) => <Input {...f} type="number" min={0} value={liveViewThrottleMs} onChange={(e) => setLiveViewThrottleMs(e.target.value)} placeholder="1000" />}
              </FormField>
            </div>
            <div>
              <Button type="submit" size="sm" loading={savingSettings}>{t("save")}</Button>
            </div>
          </form>
        )}
      </SettingsSectionCard>

      {connectionToast && <SettingsToast message={t("tracking.testSucceeded")} onClose={() => setConnectionToast(false)} />}
      {settingsToast && <SettingsToast message={t("saved")} onClose={() => setSettingsToast(false)} />}
    </div>
  );
}
