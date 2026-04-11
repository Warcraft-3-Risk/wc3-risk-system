import { test, expect } from "@playwright/test";

test.describe("About Us Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/about-us");
  });

  test("renders page with heading", async ({ page }) => {
    await expect(page.getByTestId("about-us-page")).toBeVisible();
    await expect(page.getByTestId("about-heading")).toContainText("About Risk Reforged");
  });

  test("shows project overview section", async ({ page }) => {
    await expect(page.getByTestId("about-overview")).toBeVisible();
    await expect(page.getByTestId("about-overview")).toContainText("strategic conquest");
  });

  test("shows features section", async ({ page }) => {
    await expect(page.getByTestId("about-features")).toBeVisible();
    await expect(page.getByTestId("feature-maps")).toBeVisible();
    await expect(page.getByTestId("feature-modes")).toBeVisible();
    await expect(page.getByTestId("feature-ranked")).toBeVisible();
    await expect(page.getByTestId("feature-units")).toBeVisible();
  });

  test("shows open source section with GitHub link", async ({ page }) => {
    await expect(page.getByTestId("about-open-source")).toBeVisible();
    await expect(page.getByTestId("about-github-link")).toBeVisible();
    await expect(page.getByTestId("about-github-link")).toHaveAttribute(
      "href",
      "https://github.com/Warcraft-3-Risk/wc3-risk-system"
    );
  });

  test("shows community section with Discord link", async ({ page }) => {
    await expect(page.getByTestId("about-community")).toBeVisible();
    await expect(page.getByTestId("about-discord-link")).toBeVisible();
  });
});

