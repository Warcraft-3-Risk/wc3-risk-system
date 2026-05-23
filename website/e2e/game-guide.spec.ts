import { test, expect } from "@playwright/test";
import sections from "../src/app/data/game-guide-sections.json";

test.describe("Game Guide", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/how-to/game-guide");
  });

  test("renders the guide shell and all configured sections", async ({ page }) => {
    await expect(page.getByTestId("game-guide-page")).toBeVisible();
    await expect(page.getByTestId("game-guide-heading")).toContainText("Game Guide");
    await expect(page.getByTestId("game-guide-sidebar")).toBeVisible();
    await expect(page.getByTestId("game-guide-content")).toBeVisible();

    for (const section of sections) {
      await expect(page.getByTestId(`guide-nav-${section.id}`)).toContainText(section.title);
      await expect(page.getByTestId(`guide-section-${section.id}`)).toBeAttached();
    }
  });

  test("loads markdown content for every guide tab", async ({ page }) => {
    for (const section of sections) {
      await test.step(section.title, async () => {
        await page.getByTestId(`guide-nav-${section.id}`).click();
        await expect(page).toHaveURL(new RegExp(`/how-to/game-guide#${section.id}$`));
        await expect(page.getByTestId(`guide-section-${section.id}`)).toBeVisible();
        await expect(page.getByTestId(`guide-content-${section.id}`)).toBeVisible();
        await expect(page.getByTestId(`guide-content-${section.id}`)).not.toContainText("Content could not be loaded.");
      });
    }
  });

  test("opens directly to a hash-linked guide section", async ({ page }) => {
    await page.goto("/how-to/game-guide#ally-color-filter");

    await expect(page.getByTestId("guide-section-ally-color-filter")).toBeVisible();
    await expect(page.getByTestId("guide-content-ally-color-filter")).toContainText("Ally Color Filter");
    await expect(page.getByTestId("guide-content-ally-color-filter")).toContainText("High Contrast");
  });

  test("renders guide markdown tables, images, and simplified diagrams", async ({ page }) => {
    await page.getByTestId("guide-nav-units").click();
    await expect(page.getByTestId("guide-content-units")).toContainText("Land Units");
    await expect(page.locator('img[src="/icons/small-icons/rifleman-icon.webp"]').first()).toBeVisible();

    await page.getByTestId("guide-nav-advanced").click();
    await expect(page.getByTestId("guide-content-advanced")).toContainText("Pause Consumption");
    await expect(page.getByTestId("guide-content-advanced")).toContainText("Visual diagram omitted");
  });

  test("shows a clear fallback when guide content fails to load", async ({ page }) => {
    await page.route("**/game-guide-content/game-modes.md", async (route) => {
      await route.fulfill({ status: 500, body: "failed" });
    });

    await page.goto("/how-to/game-guide");
    await expect(page.getByTestId("guide-content-game-modes")).toContainText("Content could not be loaded.");
  });
});
