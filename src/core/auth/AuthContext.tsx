"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { apiFetch } from "@/core/api/client";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/core/auth/tokens";
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>.");
  return ctx;
}
