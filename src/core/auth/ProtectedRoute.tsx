"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/core/auth/AuthContext";

/** Garde de route générique — toute page sous app/(app)/ doit être enveloppée
 * par ce composant (via le layout du groupe) plutôt que de vérifier l'auth
 * elle-même. Une future vérification de permission par module s'ajoutera ici
 * sans toucher aux pages individuelles. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        Chargement…
      </div>
    );
  }

  return <>{children}</>;
}
