"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { myEffectivePermissions } from "@/core/api/rbac";
import { useOrganization } from "@/core/organization/OrganizationContext";

interface PermissionContextValue {
  loading: boolean;
  /** Vérifie une permission à portée organisation entière — jamais un
   * substitut à la vérification serveur (chaque endpoint reste protégé
   * indépendamment), seulement une anticipation ergonomique pour
   * conditionner l'affichage (§20 du document d'architecture RBAC). */
  can: (permissionCode: string) => boolean;
  reload: () => Promise<void>;
}

// Exporté (en plus de usePermissions) uniquement pour Storybook — voir
// AuthContext.tsx pour la justification.
export const PermissionContext = createContext<PermissionContextValue | null>(null);

/** Point d'extension anticipé par `ProtectedRoute.tsx` ("une future
 * vérification de permission par module s'ajoutera ici sans toucher aux
 * pages individuelles") — ce contexte est ce point d'extension. Recharge à
 * chaque changement d'organisation courante (les permissions sont scopées
 * par organisation, voir UserRole/UserPermissionGrant). */
export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization } = useOrganization();
  const [codes, setCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentOrganization) {
      setCodes(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await myEffectivePermissions(currentOrganization.id);
      setCodes(new Set(list));
    } catch {
      setCodes(new Set());
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    load();
  }, [load]);

  const can = useCallback((permissionCode: string) => codes.has(permissionCode), [codes]);

  return <PermissionContext.Provider value={{ loading, can, reload: load }}>{children}</PermissionContext.Provider>;
}

export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermissions doit être utilisé à l'intérieur de <PermissionProvider>.");
  return ctx;
}
