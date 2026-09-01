"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { PageSpinner } from "@/shared/ui/Spinner";

/** Garde de route générique — toute page sous app/(app)/ doit être enveloppée
 * par ce composant (via le layout du groupe) plutôt que de vérifier l'auth
 * elle-même. Une future vérification de permission par module s'ajoutera ici
 * sans toucher aux pages individuelles. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations("common");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <PageSpinner label={t("states.loading")} />
      </div>
    );
  }

  return <>{children}</>;
}
