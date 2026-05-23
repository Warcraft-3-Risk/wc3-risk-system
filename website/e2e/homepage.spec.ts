import { test, expect, type Page } from "@playwright/test";
import { mockLiveLobbies, mockLiveLobbiesError, sampleLobbies } from "./fixtures";

async function visitHome(page: Page) {
  await mockLiveLobbies(page);
  await page.goto("/");
}

test.describe("Homepage", () => {
  test("renders the full landing experience and primary CTAs", async ({ page }) => {
    await visitHome(page);

    await expect(page.getByTestId("homepage")).toBeVisible();
    await expect(page.getByTestId("main-navbar")).toBeVisible();
    await expect(page.getByTestId("footer")).toBeVisible();
    await expect(page.getByTestId("hero-section")).toBeVisible();
    await expect(page.getByAltText("Risk Reforged").first()).toBeVisible();
    await expect(page.getByTestId("hero-section").getByText("A strategic conquest and diplomacy game")).toBeVisible();
    await expect(page.getByTestId("hero-cta-guide")).toHaveAttribute("href", "/how-to/game-guide");
    await expect(page.getByTestId("hero-cta-units")).toHaveAttribute("href", "/how-to/units-page");
  });

  test("quick links route to each major website area", async ({ page }) => {
    const links = [
      { testId: "quick-link-game-guide", url: /\/how-to\/game-guide$/ },
      { testId: "quick-link-units", url: /\/how-to\/units-page$/ },
      { testId: "quick-link-patch-notes", url: /\/patch-notes$/ },
      { testId: "quick-link-maps", url: /\/how-to\/game-guide#maps$/ },
      { testId: "quick-link-tournament", url: /\/tournament$/ },
      { testId: "quick-link-community", url: /\/about-us$/ },
    ];

    for (const link of links) {
      await visitHome(page);
      await page.getByTestId(link.testId).click();
      await expect(page).toHaveURL(link.url);
    }
  });

  test("latest mainline update summarizes and links to the new guide section", async ({ page }) => {
    await visitHome(page);

    await expect(page.getByTestId("latest-update-section")).toBeVisible();
    await expect(page.getByTestId("latest-update-heading")).toContainText("Risk Europe unstable12");
    await expect(page.getByTestId("latest-update-minimap")).toContainText("Minimap Clarity");
    await expect(page.getByTestId("latest-update-colors")).toContainText("High Contrast Colors");
    await expect(page.getByTestId("latest-update-observer")).toContainText("Observer Tools");
    await expect(page.getByTestId("latest-update-transports")).toContainText("Transport Polish");

    await page.getByTestId("latest-update-guide-link").click();
    await expect(page).toHaveURL(/\/how-to\/game-guide#ally-color-filter$/);
    await expect(page.getByTestId("guide-section-ally-color-filter")).toBeVisible();
  });

  test("stats and tutorial embeds expose the expected game learning paths", async ({ page }) => {
    await visitHome(page);

    await expect(page.getByTestId("stats-section")).toBeVisible();
    await expect(page.getByTestId("stat-maps")).toContainText("3");
    await expect(page.getByTestId("stat-countries")).toContainText("375+");
    await expect(page.getByTestId("stat-units")).toContainText("16");
    await expect(page.getByTestId("stat-modes")).toContainText("5");

    const tutorialTitles = [
      "Step 1: Minimap & City Distribution",
      "Step 2: Training Units & Capturing a City",
      "Step 3: Capturing a Country",
      "Step 4: Mortars & Cutting Trees",
      "Step 5: Transporting Units & Naval Invasion",
      "Step 6: Changing Guards",
    ];

    await expect(page.getByTestId("tutorials-section")).toBeVisible();
    for (const title of tutorialTitles) {
      await expect(page.locator(`iframe[title="${title}"]`)).toHaveAttribute("src", /youtube\.com\/embed/);
    }
    await expect(page.getByTestId("tutorial-step-1").getByRole("link", { name: /Read related guide/i })).toHaveAttribute(
      "href",
      "/how-to/game-guide#cities-countries"
    );
    await expect(page.getByTestId("tutorial-step-5").getByRole("link", { name: /Read related guide/i })).toHaveAttribute(
      "href",
      "/how-to/game-guide#naval"
    );
  });

  test("live lobby indicator filters Risk Europe games and reveals lobby details", async ({ page }) => {
    await mockLiveLobbies(page, sampleLobbies);
    await page.goto("/");

    await expect(page.getByText("2 Lobbies")).toBeVisible();
    await expect(page.getByText("11 Players")).toBeVisible();

    await page.getByText("11 Players").hover();
    await expect(page.getByText("Active Risk Europe Lobbies")).toBeVisible();
    await expect(page.getByText("Risk Europe 4.09 lobby")).toBeVisible();
    await expect(page.getByText("Risk Europe ranked")).toBeVisible();
    await expect(page.getByText("Different map")).toHaveCount(0);
    await expect(page.getByText("Europe").first()).toBeVisible();
    await expect(page.getByText("US East")).toBeVisible();
    await expect(page.getByText("Updates every 30 seconds")).toBeVisible();
  });

  test("live lobby indicator stays hidden when there are no matching games", async ({ page }) => {
    await visitHome(page);

    await expect(page.getByText(/Lobbies/)).toHaveCount(0);
    await expect(page.getByText(/Players/)).toHaveCount(0);
  });

  test("live lobby indicator stays hidden when the lobby API fails", async ({ page }) => {
    await mockLiveLobbiesError(page);
    await page.goto("/");

    await expect(page.getByText(/Lobbies/)).toHaveCount(0);
    await expect(page.getByText(/Players/)).toHaveCount(0);
  });
});
