import { broadcastSessionExpired, clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/core/auth/tokens";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3007";

export class ApiError extends Error {
  code: string;
  status: number;
  details: unknown[];

  constructor(status: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  organizationId?: string;
  skipAuth?: boolean;
}

async function parseErrorBody(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    if (body?.error) {
      return new ApiError(response.status, body.error.code, body.error.message, body.error.details ?? []);
    }
  } catch {
    // réponse non-JSON (ex: 404 générique) — on retombe sur un message générique
  }
  return new ApiError(response.status, "unknown_error", `Erreur ${response.status}`);
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        setTokens(data.accessToken, data.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Client HTTP centralisé — le seul point d'appel vers le backend dans tout le
 * frontend. Tout module futur doit passer par apiFetch, jamais par un fetch()
 * direct, pour garantir la gestion uniforme des tokens/erreurs. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const headers = new Headers(options.headers);
  // FormData (upload de fichier) : le navigateur doit fixer lui-même
  // Content-Type avec la boundary multipart — la forcer ici casserait
  // l'upload.
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!options.skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.organizationId) headers.set("X-Organization-Id", options.organizationId);

  const response = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers });

  if (response.status === 401 && !options.skipAuth && !isRetry) {
    const hadSession = !!getRefreshToken();
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch<T>(path, options, true);
    clearTokens();
    // Ne signale une session perdue que si l'utilisateur en avait
    // effectivement une : un 401 sans refresh token préalable (jamais
    // connecté, ou déconnexion déjà volontaire) n'est pas une perte de
    // session, juste l'état attendu.
    if (hadSession) broadcastSessionExpired();
  }

  if (!response.ok) {
    throw await parseErrorBody(response);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Variante de `apiFetch` pour les réponses binaires (export XLSX/DOCX,
 * etc.) — même logique d'authentification/refresh, mais `response.blob()`
 * au lieu de `response.json()` qui échouerait sur un corps binaire. */
export async function apiFetchBlob(path: string, options: RequestOptions = {}, isRetry = false): Promise<Blob> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!options.skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.organizationId) headers.set("X-Organization-Id", options.organizationId);

  const response = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers });

  if (response.status === 401 && !options.skipAuth && !isRetry) {
    const hadSession = !!getRefreshToken();
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetchBlob(path, options, true);
    clearTokens();
    if (hadSession) broadcastSessionExpired();
  }

  if (!response.ok) {
    throw await parseErrorBody(response);
  }
  return response.blob();
}
