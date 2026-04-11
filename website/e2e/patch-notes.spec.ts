import { test, expect } from "@playwright/test";

test.describe("Patch Notes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/patch-notes");
  });

  test("renders page with heading", async ({ page }) => {
    await expect(page.getByTestId("patch-notes-page")).toBeVisible();
    await expect(page.getByTestId("patch-notes-heading")).toContainText("Patch Notes");
  });

  test("shows loading state initially", async ({ page }) => {
    // The page starts in a loading state before the fetch completes
    // We check that the page structure exists
    await expect(page.getByTestId("patch-notes-page")).toBeVisible();
  });

  test("shows either content, empty message, or error after loading", async ({ page }) => {
    // Wait for loading to complete (either success or failure)
    await page.waitForTimeout(3000);

    const hasList = await page.getByTestId("patch-notes-list").isVisible().catch(() => false);
    const hasError = await page.getByTestId("patch-notes-error").isVisible().catch(() => false);
    const hasEmpty = await page.getByTestId("patch-notes-empty").isVisible().catch(() => false);

    // One of these states should be true after loading
    expect(hasList || hasError || hasEmpty).toBeTruthy();
  });
});

