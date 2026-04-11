import { test, expect } from "@playwright/test";

test.describe("Mobile - Homepage", () => {
  test("renders on mobile viewport", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("homepage")).toBeVisible();
    await expect(page.getByTestId("hero-section")).toBeVisible();
    await expect(page.getByTestId("main-navbar")).toBeVisible();
  });
});

test.describe("Mobile - Navigation", () => {
  test("mobile menu toggle is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("mobile-menu-toggle")).toBeVisible();
  });

  test("mobile menu opens and shows links", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("mobile-menu-toggle").click();
    await expect(page.getByTestId("mobile-menu")).toBeVisible();
    await expect(page.getByTestId("mobile-nav-link-game-guide")).toBeVisible();
    await expect(page.getByTestId("mobile-nav-link-units-page")).toBeVisible();
  });

  test("mobile menu navigates and closes", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("mobile-menu-toggle").click();
    await page.getByTestId("mobile-nav-link-about-us").click();
    await expect(page).toHaveURL(/\/about-us/);
  });
});

test.describe("Mobile - Game Guide", () => {
  test("renders on mobile", async ({ page }) => {
    await page.goto("/how-to/game-guide");
    await expect(page.getByTestId("game-guide-page")).toBeVisible();
    await expect(page.getByTestId("game-guide-heading")).toContainText("Game Guide");
  });
});

test.describe("Mobile - Units Page", () => {
  test("renders on mobile", async ({ page }) => {
    await page.goto("/how-to/units-page");
    await expect(page.getByTestId("units-page")).toBeVisible();
    await expect(page.getByTestId("unit-card-rifleman")).toBeVisible();
  });
});

test.describe("Mobile - Patch Notes", () => {
  test("renders on mobile", async ({ page }) => {
    await page.goto("/patch-notes");
    await expect(page.getByTestId("patch-notes-page")).toBeVisible();
    await expect(page.getByTestId("patch-notes-heading")).toBeVisible();
  });
});

test.describe("Mobile - News and Events", () => {
  test("renders on mobile", async ({ page }) => {
    await page.goto("/news-and-events");
    await expect(page.getByTestId("news-and-events-page")).toBeVisible();
    await expect(page.getByTestId("article-card-season-3-launch")).toBeVisible();
  });
});

test.describe("Mobile - Tournament", () => {
  test("renders on mobile", async ({ page }) => {
    await page.goto("/tournament");
    await expect(page.getByTestId("tournament-page")).toBeVisible();
    await expect(page.getByTestId("tournament-heading")).toBeVisible();
  });
});

test.describe("Mobile - About Us", () => {
  test("renders on mobile", async ({ page }) => {
    await page.goto("/about-us");
    await expect(page.getByTestId("about-us-page")).toBeVisible();
    await expect(page.getByTestId("about-heading")).toBeVisible();
  });
});
