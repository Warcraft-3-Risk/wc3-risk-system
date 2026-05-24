import { test, expect, type Page } from "@playwright/test";
import { mockLiveLobbies, mockPatchNotes } from "./fixtures";

async function mockSharedNetwork(page: Page) {
  await mockLiveLobbies(page);
  await mockPatchNotes(page);
}

test.describe("Mobile - Homepage", () => {
  test("renders primary homepage sections on a phone viewport", async ({ page }) => {
    await mockSharedNetwork(page);
    await page.goto("/");

    await expect(page.getByTestId("homepage")).toBeVisible();
    await expect(page.getByTestId("hero-section")).toBeVisible();
    await expect(page.getByTestId("latest-update-section")).toBeVisible();
    await expect(page.getByTestId("quick-links-section")).toBeVisible();
    await expect(page.getByTestId("tutorials-section")).toBeVisible();
  });
});

test.describe("Mobile - Navigation", () => {
  test("mobile menu toggles open and closed with all primary links", async ({ page }) => {
    await mockSharedNetwork(page);
    await page.goto("/");

    await expect(page.getByTestId("mobile-menu-toggle")).toBeVisible();
    await expect(page.getByTestId("desktop-nav")).toBeHidden();
    await expect(page.getByTestId("mobile-menu-toggle")).toHaveAttribute("aria-label", "Open menu");

    await page.getByTestId("mobile-menu-toggle").click();
    await expect(page.getByTestId("mobile-menu")).toBeVisible();
    await expect(page.getByTestId("mobile-menu-toggle")).toHaveAttribute("aria-label", "Close menu");

    for (const testId of [
      "mobile-nav-link-patch-notes",
      "mobile-nav-link-game-guide",
      "mobile-nav-link-units-page",
      "mobile-nav-link-tournament",
      "mobile-nav-link-about-us",
    ]) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }

    await page.getByTestId("mobile-menu-toggle").click();
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
  });

  test("mobile menu links navigate and close the menu", async ({ page }) => {
    await mockSharedNetwork(page);
    await page.goto("/");

    await page.getByTestId("mobile-menu-toggle").click();
    await page.getByTestId("mobile-nav-link-about-us").click();

    await expect(page).toHaveURL(/\/about-us$/);
    await expect(page.getByTestId("about-us-page")).toBeVisible();
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
  });
});

test.describe("Mobile - Content Pages", () => {
  test("game guide supports hash sections on mobile", async ({ page }) => {
    await mockSharedNetwork(page);
    await page.goto("/how-to/game-guide#commands");

    await expect(page.getByTestId("game-guide-page")).toBeVisible();
    await expect(page.getByTestId("guide-section-commands")).toBeVisible();
    await page.getByTestId("guide-nav-ally-color-filter").click();
    await expect(page).toHaveURL(/\/how-to\/game-guide#ally-color-filter$/);
    await expect(page.getByTestId("guide-content-ally-color-filter")).toContainText("Ally Color Filter");
  });

  test("units list and details remain usable on mobile", async ({ page }) => {
    await mockSharedNetwork(page);
    await page.goto("/how-to/units-page");

    await expect(page.getByTestId("units-page")).toBeVisible();
    await page.getByTestId("unit-card-tank").click();
    await expect(page).toHaveURL(/\/how-to\/units-page\/tank$/);
    await expect(page.getByTestId("unit-detail-tank")).toBeVisible();
    await expect(page.getByTestId("unit-stat-hp")).toContainText("2,600");
  });

  test("patch notes render release data on mobile", async ({ page }) => {
    await mockSharedNetwork(page);
    await page.goto("/patch-notes");

    await expect(page.getByTestId("patch-notes-page")).toBeVisible();
    await expect(page.getByTestId("patch-note-4.09-prerelease3")).toContainText("Risk Europe 4.09 prerelease 3");
  });

  test("tournament and about pages render their core content on mobile", async ({ page }) => {
    await mockSharedNetwork(page);
    await page.goto("/tournament");
    await expect(page.getByTestId("tournament-page")).toBeVisible();
    await expect(page.getByTestId("tournament-name")).toContainText("Spring 2025 Championship");

    await page.goto("/about-us");
    await expect(page.getByTestId("about-us-page")).toBeVisible();
    await expect(page.getByTestId("feature-minimap-colors")).toBeVisible();
  });
});
