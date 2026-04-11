import { test, expect } from "@playwright/test";

test.describe("Navigation - Desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("navbar is visible with logo", async ({ page }) => {
    await expect(page.getByTestId("main-navbar")).toBeVisible();
    await expect(page.getByTestId("navbar-logo")).toContainText("Risk Reforged");
  });

  test("desktop nav links are present", async ({ page }) => {
    await expect(page.getByTestId("nav-link-patch-notes")).toBeVisible();       
    await expect(page.getByTestId("nav-link-game-guide")).toBeVisible();        
    await expect(page.getByTestId("nav-link-units-page")).toBeVisible();        
    await expect(page.getByTestId("nav-link-tournament")).toBeVisible();        
    await expect(page.getByTestId("nav-link-about-us")).toBeVisible();
  });

  test("navigates to patch notes", async ({ page }) => {
    await page.getByTestId("nav-link-patch-notes").click();
    await expect(page).toHaveURL(/\/patch-notes/);
    await expect(page.getByTestId("patch-notes-page")).toBeVisible();
  });

  test("navigates to game guide", async ({ page }) => {
    await page.getByTestId("nav-link-game-guide").click();
    await expect(page).toHaveURL(/\/how-to\/game-guide/);
    await expect(page.getByTestId("game-guide-page")).toBeVisible();
  });

  test("navigates to units page", async ({ page }) => {
    await page.getByTestId("nav-link-units-page").click();
    await expect(page).toHaveURL(/\/how-to\/units-page/);
    await expect(page.getByTestId("units-page")).toBeVisible();
  });

  test("navigates to tournament", async ({ page }) => {
    await page.getByTestId("nav-link-tournament").click();
    await expect(page).toHaveURL(/\/tournament/);
    await expect(page.getByTestId("tournament-page")).toBeVisible();
  });

  test("navigates to about us", async ({ page }) => {
    await page.getByTestId("nav-link-about-us").click();
    await expect(page).toHaveURL(/\/about-us/);
    await expect(page.getByTestId("about-us-page")).toBeVisible();
  });

  test("logo navigates to home", async ({ page }) => {
    await page.goto("/about-us");
    await page.getByTestId("navbar-logo").click();
    await expect(page).toHaveURL("/");
  });

  test("footer is present with links", async ({ page }) => {
    await expect(page.getByTestId("footer")).toBeVisible();
    await expect(page.getByTestId("footer-brand")).toContainText("Risk Reforged");
    await expect(page.getByTestId("footer-copyright")).toBeVisible();
    await expect(page.getByTestId("footer-link-game-guide")).toBeVisible();
    await expect(page.getByTestId("footer-link-units")).toBeVisible();
    await expect(page.getByTestId("footer-link-patch-notes")).toBeVisible();

  });
});
