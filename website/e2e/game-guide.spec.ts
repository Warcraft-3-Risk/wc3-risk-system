import { test, expect } from "@playwright/test";

test.describe("Game Guide", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/how-to/game-guide");
  });

  test("renders page with heading", async ({ page }) => {
    await expect(page.getByTestId("game-guide-page")).toBeVisible();
    await expect(page.getByTestId("game-guide-heading")).toContainText("Game Guide");
  });

  test("sidebar navigation is visible", async ({ page }) => {
    await expect(page.getByTestId("game-guide-sidebar")).toBeVisible();
    await expect(page.getByTestId("guide-nav-game-modes")).toBeVisible();
    await expect(page.getByTestId("guide-nav-economy")).toBeVisible();
    await expect(page.getByTestId("guide-nav-units")).toBeVisible();
    await expect(page.getByTestId("guide-nav-victory")).toBeVisible();
  });

  test("content area is visible", async ({ page }) => {
    await expect(page.getByTestId("game-guide-content")).toBeVisible();
  });

  test("clicking sidebar section changes active content", async ({ page }) => {
    await page.getByTestId("guide-nav-economy").click();
    await expect(page.getByTestId("guide-section-economy")).toBeVisible();
  });

  test("all section navigation buttons exist", async ({ page }) => {
    const expectedSections = [
      "game-modes", "game-loop", "economy", "units", "victory",
      "maps", "cities-countries", "naval", "rating", "diplomacy",
      "commands", "advanced", "scoreboard",
    ];
    for (const section of expectedSections) {
      await expect(page.getByTestId(`guide-nav-${section}`)).toBeVisible();
    }
  });
});

