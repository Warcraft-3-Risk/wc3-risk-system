import { test, expect } from "@playwright/test";
import { mockPatchNotes, mockPatchNotesDelay, mockPatchNotesError, sampleReleases } from "./fixtures";

test.describe("Patch Notes", () => {
  test("renders GitHub releases with markdown, dates, tags, and source links", async ({ page }) => {
    await mockPatchNotes(page);
    await page.goto("/patch-notes");

    const release = sampleReleases[0];
    const article = page.getByTestId(`patch-note-${release.tag_name}`);

    await expect(page.getByTestId("patch-notes-page")).toBeVisible();
    await expect(page.getByTestId("patch-notes-heading")).toContainText("Patch Notes");
    await expect(article).toBeVisible();
    await expect(article).toContainText(release.name);
    await expect(article).toContainText(release.tag_name);
    await expect(article).toContainText("May 23, 2026");
    await expect(article).toContainText("Highlights");
    await expect(article).toContainText("Minimap ownership colors");
    await expect(article.getByRole("link", { name: "View on GitHub" })).toHaveAttribute("href", release.html_url);
    await expect(article.getByRole("link", { name: "View on GitHub" })).toHaveAttribute("target", "_blank");
  });

  test("shows an empty state when GitHub has no releases", async ({ page }) => {
    await mockPatchNotes(page, []);
    await page.goto("/patch-notes");

    await expect(page.getByTestId("patch-notes-empty")).toContainText("No patch notes available yet.");
  });

  test("shows an error state when GitHub releases fail", async ({ page }) => {
    await mockPatchNotesError(page);
    await page.goto("/patch-notes");

    await expect(page.getByTestId("patch-notes-error")).toBeVisible();
    await expect(page.getByTestId("patch-notes-error")).toContainText("Failed to load patch notes");
    await expect(page.getByTestId("patch-notes-error")).toContainText("Failed to fetch releases");
  });

  test("shows loading state while release data is pending", async ({ page }) => {
    await mockPatchNotesDelay(page);
    await page.goto("/patch-notes");

    await expect(page.getByTestId("patch-notes-loading")).toContainText("Loading patch notes");
    await expect(page.getByTestId("patch-notes-empty")).toContainText("No patch notes available yet.");
  });
});
