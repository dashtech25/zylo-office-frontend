import { test, expect } from "@playwright/test";
import { installMockBackend, loginAsMockUser } from "./mockBackend";

/** Vérifie que la page réelle `/zylo-liquid/alerts` correspond à
 * l'interface validée du Centre d'alertes (en-tête + résumé, filtres,
 * liste, panneau de détail à 3 colonnes) — même structure que
 * `AlertsPageFull` (Storybook), mais rendue par la vraie app Next.js avec
 * un backend simulé (aucun serveur réel dans cet environnement). */
test.beforeEach(async ({ page }) => {
  await loginAsMockUser(page);
  await installMockBackend(page);
});

test("Centre d'alertes — en-tête et résumé", async ({ page }) => {
  await page.goto("/zylo-liquid/alerts");

  await expect(page.getByRole("heading", { name: "Gestion des alertes" })).toBeVisible();
  await expect(page.getByText("Surveillez l'état de votre réseau de stations et intervenez rapidement.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Marquer tout comme lu/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Filtres/ })).toBeVisible();

  await expect(page.getByText("Alertes actives", { exact: true })).toBeVisible();
  await expect(page.getByText("À traiter", { exact: true })).toBeVisible();
  await expect(page.getByText("Informatives", { exact: true })).toBeVisible();
  await expect(page.getByText("Résolues (24h)", { exact: true })).toBeVisible();
});

test("Centre d'alertes — panneau de filtres", async ({ page }) => {
  await page.goto("/zylo-liquid/alerts");

  const filtersPanel = page.locator("div", { has: page.getByRole("heading", { name: "Types d'alertes" }) }).first();
  await expect(filtersPanel.getByRole("heading", { name: "Types d'alertes" })).toBeVisible();
  await expect(filtersPanel.getByRole("heading", { name: "Gravité" })).toBeVisible();
  await expect(filtersPanel.getByRole("heading", { name: "Statut" })).toBeVisible();
  await expect(filtersPanel.getByLabel("Critique", { exact: true })).toBeVisible();
  await expect(filtersPanel.getByLabel("Élevée", { exact: true })).toBeVisible();
  await expect(filtersPanel.getByLabel("Moyenne", { exact: true })).toBeVisible();
  await expect(filtersPanel.getByLabel("Faible", { exact: true })).toBeVisible();
});

test("Centre d'alertes — liste et panneau de détail à 3 colonnes", async ({ page }) => {
  await page.goto("/zylo-liquid/alerts");

  await expect(page.getByText(/\d+ alertes?/)).toBeVisible();

  await expect(page.getByRole("tab", { name: "Détails" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Contexte" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Historique" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Actions & recommandations" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Informations générales" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cause probable" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions rapides" })).toBeVisible();

  // Disposition : filtres | liste | détail, strictement côte à côte
  // (jamais empilés) — reproduit la vérification manuelle déjà faite sur
  // AlertsPageFull (Storybook).
  const filtersX = (await page.getByRole("heading", { name: "Types d'alertes" }).boundingBox())!.x;
  const listX = (await page.getByText(/\d+ alertes?/).boundingBox())!.x;
  const detailX = (await page.getByRole("heading", { name: "Informations générales" }).boundingBox())!.x;
  expect(filtersX).toBeLessThan(listX);
  expect(listX).toBeLessThan(detailX);

  // La grille informations/cause/actions reste confinée sous les onglets,
  // dans la colonne détail — jamais étirée sur toute la largeur de l'écran.
  const detailBox = (await page.getByRole("heading", { name: "Informations générales" }).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(detailBox.x + detailBox.width).toBeLessThan(viewport.width);
});

test("Centre d'alertes — sélection d'une alerte met à jour le détail", async ({ page }) => {
  await page.goto("/zylo-liquid/alerts");

  const secondRow = page.getByText("Station hors ligne", { exact: false }).first();
  await secondRow.click();
  await expect(page.getByRole("heading", { name: "Station hors ligne", exact: true })).toBeVisible();
});

test("Centre d'alertes — couleurs vives (pas de gris à la place d'une couleur sémantique)", async ({ page }) => {
  await page.goto("/zylo-liquid/alerts");

  const activeCard = page.getByText("Alertes actives", { exact: true }).locator("..").locator("..");
  await expect(activeCard).toHaveCSS("background-color", "rgb(254, 226, 226)"); // bg-error-muted, #fee2e2

  const resolvedCard = page.getByText("Résolues (24h)", { exact: true }).locator("..").locator("..");
  await expect(resolvedCard).toHaveCSS("background-color", "rgb(220, 252, 231)"); // bg-success-muted, #dcfce7
});
