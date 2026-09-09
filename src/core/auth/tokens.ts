const ACCESS_TOKEN_KEY = "zylo_office_access_token";
const REFRESH_TOKEN_KEY = "zylo_office_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Nom de l'évènement diffusé quand une session meurt en cours d'usage
 * (rafraîchissement du jeton d'accès impossible, `apiFetch`) — jamais
 * seulement un `clearTokens()` silencieux : sans ceci, `AuthContext` garde
 * un `user` obsolète en mémoire pendant que le stockage local est déjà
 * vide, et l'interface continue d'afficher l'app comme si de rien
 * n'était pendant que chaque appel échoue en silence (401 répétés,
 * perçu comme "l'app se déconnecte toute seule et n'importe comment"). */
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

export function broadcastSessionExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
