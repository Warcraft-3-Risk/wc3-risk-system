import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders without errors", async ({ page }) => {
    await expect(page.getByTestId("homepage")).toBeVisible();
    await expect(page.getByTestId("main-navbar")).toBeVisible();
    await expect(page.getByTestId("footer")).toBeVisible();
  });

  test("hero section displays correctly", async ({ page }) => {
    await expect(page.getByTestId("hero-section")).toBeVisible();

  });

  test("quick links section is present with all cards", async ({ page }) => {
    await expect(page.getByTestId("quick-links-section")).toBeVisible();
    await expect(page.getByTestId("quick-links-heading")).toContainText("Explore the Game");
    await expect(page.getByTestId("quick-link-game-guide")).toBeVisible();
    await expect(page.getByTestId("quick-link-units")).toBeVisible();
    await expect(page.getByTestId("quick-link-patch-notes")).toBeVisible();
    await expect(page.getByTestId("quick-link-maps")).toBeVisible();
    await expect(page.getByTestId("quick-link-tournament")).toBeVisible();
    await expect(page.getByTestId("quick-link-community")).toBeVisible();
  });

  test("stats section shows game statistics", async ({ page }) => {
    await expect(page.getByTestId("stats-section")).toBeVisible();
    await expect(page.getByTestId("stat-maps")).toContainText("3");
    await expect(page.getByTestId("stat-countries")).toContainText("375+");
    await expect(page.getByTestId("stat-units")).toContainText("16");
    await expect(page.getByTestId("stat-modes")).toContainText("5");
  });

  test("tutorials section shows video cards", async ({ page }) => {
    await expect(page.getByTestId("tutorials-section")).toBeVisible();
    await expect(page.getByTestId("tutorials-heading")).toContainText("General Tutorials");
    await expect(page.getByTestId("tutorial-step-1")).toBeVisible();
    await expect(page.getByTestId("tutorial-step-6")).toBeVisible();
  });

  test("hero CTA links navigate correctly", async ({ page }) => {
    await page.getByTestId("hero-cta-guide").click();
    await expect(page).toHaveURL(/\/how-to\/game-guide/);
  });

  test("quick link navigates to game guide", async ({ page }) => {
    await page.getByTestId("quick-link-game-guide").click();
    await expect(page).toHaveURL(/\/how-to\/game-guide/);
  });
});
