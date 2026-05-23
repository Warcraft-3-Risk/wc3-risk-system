import { test, expect } from "@playwright/test";
import { mockLiveLobbies } from "./fixtures";

test.describe("About Us Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockLiveLobbies(page);
    await page.goto("/about-us");
  });

  test("explains the project and target experience", async ({ page }) => {
    await expect(page.getByTestId("about-us-page")).toBeVisible();
    await expect(page.getByTestId("about-heading")).toContainText("About Risk Reforged");
    await expect(page.getByTestId("about-overview")).toContainText("strategic conquest");
    await expect(page.getByTestId("about-overview")).toContainText("Warcraft III custom map");
    await expect(page.getByTestId("about-overview")).toContainText("Europe, Asia, and the World");
  });

  test("lists the major feature pillars, including latest mainline features", async ({ page }) => {
    await expect(page.getByTestId("about-features")).toBeVisible();
    await expect(page.getByTestId("feature-maps")).toContainText("Multiple Maps");
    await expect(page.getByTestId("feature-modes")).toContainText("5 Game Modes");
    await expect(page.getByTestId("feature-ranked")).toContainText("Ranked Play");
    await expect(page.getByTestId("feature-units")).toContainText("16 Unit Types");
    await expect(page.getByTestId("feature-minimap-colors")).toContainText("Minimap & Color Tools");
    await expect(page.getByTestId("feature-observer-tools")).toContainText("Observer Support");
  });

  test("links to the open source repository", async ({ page }) => {
    await expect(page.getByTestId("about-open-source")).toContainText("open-source project");
    await expect(page.getByTestId("about-github-link")).toHaveAttribute(
      "href",
      "https://github.com/Warcraft-3-Risk/wc3-risk-system"
    );
    await expect(page.getByTestId("about-github-link")).toHaveAttribute("target", "_blank");
  });

  test("links to the community Discord", async ({ page }) => {
    await expect(page.getByTestId("about-community")).toContainText("Join our growing community");
    await expect(page.getByTestId("about-discord-link")).toHaveAttribute("href", "https://discord.com/invite/wc3risk");
    await expect(page.getByTestId("about-discord-link")).toHaveAttribute("target", "_blank");
  });
});
