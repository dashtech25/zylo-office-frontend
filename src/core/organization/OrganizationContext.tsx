"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { listMyOrganizations } from "@/core/api/organizations";
import { useAuth } from "@/core/auth/AuthContext";
import type { Organization } from "@/core/auth/types";

const STORAGE_KEY = "zylo-office:currentOrganizationId";

interface OrganizationContextValue {
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  selectOrganization: (organizationId: string) => void;
  reload: () => Promise<void>;
}

// Exporté (en plus de useOrganization) uniquement pour Storybook — voir
// AuthContext.tsx pour la justification.
export const OrganizationContext = createContext<OrganizationContextValue | null>(null);

/** Charge les organisations réelles de l'utilisateur (GET /organizations,
 * zylo-office-backend#56) — jamais une organisation supposée ou codée en
 * dur. Sélection automatique si une seule organisation ; sinon la dernière
 * choisie est mémorisée (localStorage) et retombe sur la première sinon. */
export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganizationId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const orgs = await listMyOrganizations();
      setOrganizations(orgs);
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const restored = stored && orgs.some((org) => org.id === stored) ? stored : (orgs[0]?.id ?? null);
      setCurrentOrganizationId(restored);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const selectOrganization = useCallback((organizationId: string) => {
    setCurrentOrganizationId(organizationId);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, organizationId);
  }, []);

  const currentOrganization = organizations.find((org) => org.id === currentOrganizationId) ?? null;

  return (
    <OrganizationContext.Provider
      value={{ organizations, currentOrganization, loading, selectOrganization, reload: load }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization doit être utilisé à l'intérieur de <OrganizationProvider>.");
  return ctx;
}
