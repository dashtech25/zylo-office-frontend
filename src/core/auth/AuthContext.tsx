"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { apiFetch } from "@/core/api/client";
import { clearTokens, getAccessToken, getRefreshToken, setTokens, SESSION_EXPIRED_EVENT } from "@/core/auth/tokens";
import type { User } from "@/core/auth/types";

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  // Une session qui meurt en cours d'usage (jeton d'accès expiré,
  // rafraîchissement impossible — `apiFetch`) doit se refléter
  // immédiatement ici : sans ça, `user` reste en mémoire alors que le
  // stockage local est déjà vide, et l'app continue d'afficher les écrans
  // protégés pendant que chaque appel échoue en silence (perçu comme "ça
  // se déconnecte tout seul n'importe comment"). Le cache de données
  // (React Query) est vidé au même moment : jamais montrer les données
  // d'une session qui n'existe plus après reconnexion.
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      queryClient.clear();
      if (!pathname.startsWith("/login")) {
        router.replace(`/login?sessionExpired=1&next=${encodeURIComponent(pathname)}`);
      }
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [queryClient, router, pathname]);

  const loadCurrentUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiFetch<User>("/auth/me");
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ email, password }),
    });
    setTokens(tokens.accessToken, tokens.refreshToken);
    await loadCurrentUser();
  }, [loadCurrentUser]);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    await apiFetch<User>("/auth/register", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ email, password, fullName }),
    });
    await login(email, password);
  }, [login]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await apiFetch<User>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    await loadCurrentUser();
  }, [loadCurrentUser]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiFetch("/auth/logout", { method: "POST", skipAuth: true, body: JSON.stringify({ refreshToken }) });
      } catch {
        // le refresh token est peut-être déjà expiré/révoqué — on nettoie côté client dans tous les cas
      }
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>.");
  return ctx;
}
