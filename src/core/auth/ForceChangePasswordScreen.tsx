"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { ApiError } from "@/core/api/client";
import { useAuth } from "@/core/auth/AuthContext";
import { Alert, Button, Card, FormField, Input } from "@/shared/ui";

/** Bloque tout accès à l'application tant que `mustChangePassword` est vrai
 * (module Personnel — compte créé par un tiers avec un mot de passe
 * temporaire, jamais choisi par la personne). Rendu par `ProtectedRoute`,
 * jamais contournable par navigation directe. */
export function ForceChangePasswordScreen() {
  const { changePassword, logout } = useAuth();
  const t = useTranslations("auth.forceChangePassword");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t("mismatch"));
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-surface-muted">
      <Card className="w-full max-w-sm" variant="default">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h1 className="text-h4 font-semibold text-text">{t("title")}</h1>
          <p className="text-body-sm text-text-muted">{t("description")}</p>
          {error && <Alert tone="error">{error}</Alert>}
          <FormField label={t("currentPassword")}>
            {(field) => <Input {...field} type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />}
          </FormField>
          <FormField label={t("newPassword")}>
            {(field) => <Input {...field} type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />}
          </FormField>
          <FormField label={t("confirmPassword")}>
            {(field) => <Input {...field} type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />}
          </FormField>
          <Button type="submit" loading={submitting} className="w-full">
            {t("submit")}
          </Button>
          <button type="button" onClick={() => logout()} className="text-caption text-text-muted hover:underline">
            {t("logout")}
          </button>
        </form>
      </Card>
    </div>
  );
}
