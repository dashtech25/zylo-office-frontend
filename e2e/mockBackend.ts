import type { Page } from "@playwright/test";
import { resolve } from "../.storybook/mockApi";

/** Intercepte tout appel `/api/v1/*` de la vraie app et répond avec le même
 * backend simulé que Storybook (`resolve()`, réutilisée telle quelle —
 * jamais une deuxième réimplémentation des mêmes données pour les tests
 * e2e). Aucun backend réel ne tourne dans cet environnement de test. */
export async function installMockBackend(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.slice("/api/v1".length) + url.search;
    const method = route.request().method();
    const response = resolve(path, method);
    const body = await response.text();
    await route.fulfill({
      status: response.status,
      contentType: response.headers.get("content-type") ?? "application/json",
      body,
    });
  });
}

/** Injecte un jeton d'accès simulé avant le premier script de la page, pour
 * que `AuthProvider` appelle `/auth/me` (mocké) au lieu de rediriger
 * immédiatement vers /login faute de jeton. */
export async function loginAsMockUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("zylo_office_access_token", "mock-access-token");
    window.localStorage.setItem("zylo_office_refresh_token", "mock-refresh-token");
  });
}
