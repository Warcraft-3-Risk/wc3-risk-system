import { test, expect } from "@playwright/test";
import { mockLiveLobbies } from "./fixtures";

test.describe("Tournament Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockLiveLobbies(page);
    await page.goto("/tournament");
  });

  test("presents the upcoming tournament overview", async ({ page }) => {
    await expect(page.getByTestId("tournament-page")).toBeVisible();
    await expect(page.getByTestId("tournament-heading")).toContainText("Tournaments");
    await expect(page.getByTestId("upcoming-tournament")).toBeVisible();
    await expect(page.getByTestId("tournament-name")).toContainText("Spring 2025 Championship");
  });

  test("shows core tournament details", async ({ page }) => {
    await expect(page.getByTestId("tournament-date")).toContainText("March 29, 2025");
    await expect(page.getByTestId("tournament-format")).toContainText("Single Elimination");
    await expect(page.getByTestId("tournament-map")).toContainText("Europe (Standard)");
    await expect(page.getByTestId("tournament-slots")).toContainText("32 Players");
  });

  test("shows the complete tournament schedule", async ({ page }) => {
    const schedule = page.getByTestId("tournament-schedule");

    await expect(schedule).toContainText("Registration");
    await expect(schedule).toContainText("January 20");
    await expect(schedule).toContainText("Group Stage");
    await expect(schedule).toContainText("February 22");
    await expect(schedule).toContainText("Playoffs");
    await expect(schedule).toContainText("March 15");
    await expect(schedule).toContainText("Finals");
    await expect(schedule).toContainText("March 29");
  });

  test("documents rules and past tournament placeholder", async ({ page }) => {
    await expect(page.getByTestId("tournament-rules")).toContainText("Best of 3");
    await expect(page.getByTestId("tournament-rules")).toContainText("Standard mode on the Europe map");
    await expect(page.getByTestId("tournament-rules")).toContainText("No team play");
    await expect(page.getByTestId("past-tournaments")).toContainText("Past tournament results");
  });
});
