"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/core/api/client";
import { useAuth } from "@/core/auth/AuthContext";
import { Alert, Button, Card, FormField, Input } from "@/shared/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const t = useTranslations("auth.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
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
          {error && <Alert tone="error">{error}</Alert>}
          <FormField label={t("email")}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </FormField>
          <FormField label={t("password")}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </FormField>
          <Button type="submit" loading={submitting} className="w-full">
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
