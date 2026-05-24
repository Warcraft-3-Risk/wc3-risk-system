import { test, expect, type Page } from "@playwright/test";
import { mockLiveLobbies, mockPatchNotes } from "./fixtures";

async function mockSharedNetwork(page: Page) {
  await mockLiveLobbies(page);
  await mockPatchNotes(page);
}

test.describe("Navigation - Desktop", () => {
  test.beforeEach(async ({ page }) => {
    await mockSharedNetwork(page);
    await page.goto("/");
  });

  test("navbar exposes brand, primary links, and community access", async ({ page }) => {
    await expect(page.getByTestId("main-navbar")).toBeVisible();
    await expect(page.getByTestId("navbar-logo")).toContainText("Risk Reforged");
    await expect(page.getByTestId("navbar-logo")).toHaveAttribute("href", "/");

    const navLinks = [
      ["nav-link-patch-notes", "/patch-notes"],
      ["nav-link-game-guide", "/how-to/game-guide"],
      ["nav-link-units-page", "/how-to/units-page"],
      ["nav-link-tournament", "/tournament"],
      ["nav-link-about-us", "/about-us"],
    ];

    for (const [testId, href] of navLinks) {
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect(page.getByTestId(testId)).toHaveAttribute("href", href);
    }

    await expect(page.getByTestId("nav-discord-link")).toHaveAttribute("href", "https://discord.com/invite/wc3risk");
    await expect(page.getByTestId("nav-discord-link")).toHaveAttribute("target", "_blank");
  });

  test("primary nav links route to their pages", async ({ page }) => {
    const destinations = [
      { testId: "nav-link-patch-notes", url: /\/patch-notes$/, pageTestId: "patch-notes-page" },
      { testId: "nav-link-game-guide", url: /\/how-to\/game-guide$/, pageTestId: "game-guide-page" },
      { testId: "nav-link-units-page", url: /\/how-to\/units-page$/, pageTestId: "units-page" },
      { testId: "nav-link-tournament", url: /\/tournament$/, pageTestId: "tournament-page" },
      { testId: "nav-link-about-us", url: /\/about-us$/, pageTestId: "about-us-page" },
    ];

    for (const destination of destinations) {
      await mockSharedNetwork(page);
      await page.goto("/");
      await page.getByTestId(destination.testId).click();
      await expect(page).toHaveURL(destination.url);
      await expect(page.getByTestId(destination.pageTestId)).toBeVisible();
    }
  });

  test("logo returns users home from deep routes", async ({ page }) => {
    await page.goto("/about-us");
    await page.getByTestId("navbar-logo").click();

    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("homepage")).toBeVisible();
  });

  test("footer includes internal navigation and external community links", async ({ page }) => {
    await expect(page.getByTestId("footer")).toBeVisible();
    await expect(page.getByTestId("footer-brand")).toContainText("Risk Reforged");
    await expect(page.getByTestId("footer-copyright")).toContainText(new Date().getFullYear().toString());

    const footerLinks = [
      ["footer-link-game-guide", "/how-to/game-guide"],
      ["footer-link-units", "/how-to/units-page"],
      ["footer-link-patch-notes", "/patch-notes"],
    ];

    for (const [testId, href] of footerLinks) {
      await expect(page.getByTestId(testId)).toHaveAttribute("href", href);
    }

    await expect(page.getByTestId("footer-link-discord")).toHaveAttribute("href", "https://discord.com/invite/wc3risk");
    await expect(page.getByTestId("footer-link-discord")).toHaveAttribute("target", "_blank");
    await expect(page.getByTestId("footer-link-github")).toHaveAttribute("href", "https://github.com/Warcraft-3-Risk/wc3-risk-system");
    await expect(page.getByTestId("footer-link-github")).toHaveAttribute("target", "_blank");
  });

  test("footer internal links navigate correctly", async ({ page }) => {
    const destinations = [
      { testId: "footer-link-game-guide", url: /\/how-to\/game-guide$/, pageTestId: "game-guide-page" },
      { testId: "footer-link-units", url: /\/how-to\/units-page$/, pageTestId: "units-page" },
      { testId: "footer-link-patch-notes", url: /\/patch-notes$/, pageTestId: "patch-notes-page" },
    ];

    for (const destination of destinations) {
      await mockSharedNetwork(page);
      await page.goto("/");
      await page.getByTestId(destination.testId).click();
      await expect(page).toHaveURL(destination.url);
      await expect(page.getByTestId(destination.pageTestId)).toBeVisible();
    }
  });
});
