import { test, expect } from "@playwright/test";

test.describe("Tournament Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tournament");
  });

  test("renders page with heading", async ({ page }) => {
    await expect(page.getByTestId("tournament-page")).toBeVisible();
    await expect(page.getByTestId("tournament-heading")).toContainText("Tournaments");
  });

  test("shows upcoming tournament", async ({ page }) => {
    await expect(page.getByTestId("upcoming-tournament")).toBeVisible();
    await expect(page.getByTestId("tournament-name")).toBeVisible();
  });

  test("displays tournament details", async ({ page }) => {
    await expect(page.getByTestId("tournament-date")).toBeVisible();
    await expect(page.getByTestId("tournament-format")).toContainText("Single Elimination");
    await expect(page.getByTestId("tournament-map")).toContainText("Europe");
    await expect(page.getByTestId("tournament-slots")).toContainText("32");
  });

  test("displays tournament schedule", async ({ page }) => {
    await expect(page.getByTestId("tournament-schedule")).toBeVisible();
    await expect(page.getByTestId("tournament-schedule")).toContainText("Registration");
    await expect(page.getByTestId("tournament-schedule")).toContainText("Group Stage");
    await expect(page.getByTestId("tournament-schedule")).toContainText("Playoffs");
    await expect(page.getByTestId("tournament-schedule")).toContainText("Finals");
  });

  test("shows rules section", async ({ page }) => {
    await expect(page.getByTestId("tournament-rules")).toBeVisible();
    await expect(page.getByTestId("tournament-rules")).toContainText("Best of 3");
  });

  test("shows past tournaments section", async ({ page }) => {
    await expect(page.getByTestId("past-tournaments")).toBeVisible();
  });
});

