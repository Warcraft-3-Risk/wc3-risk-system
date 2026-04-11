import { test, expect } from "@playwright/test";

test.describe("News and Events", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/news-and-events");
  });

  test("renders page with heading", async ({ page }) => {
    await expect(page.getByTestId("news-and-events-page")).toBeVisible();
    await expect(page.getByTestId("news-heading")).toContainText("News & Events");
  });

  test("displays article list", async ({ page }) => {
    await expect(page.getByTestId("article-list")).toBeVisible();
  });

  test("displays article cards", async ({ page }) => {
    await expect(page.getByTestId("article-card-season-3-launch")).toBeVisible();
    await expect(page.getByTestId("article-card-world-map-release")).toBeVisible();
    await expect(page.getByTestId("article-card-tournament-spring-2025")).toBeVisible();
  });

  test("article card shows title and summary", async ({ page }) => {
    const card = page.getByTestId("article-card-season-3-launch");
    await expect(card).toContainText("Season 3");
    await expect(card).toContainText("ranked");
  });

  test("clicking article card navigates to article page", async ({ page }) => {
    await page.getByTestId("article-card-season-3-launch").click();
    await expect(page).toHaveURL(/\/news-and-events\/articles\/season-3-launch/);
  });
});

test.describe("Article Page", () => {
  test("displays article content", async ({ page }) => {
    await page.goto("/news-and-events/articles/season-3-launch");
    await expect(page.getByTestId("article-page")).toBeVisible();
    await expect(page.getByTestId("article-title")).toContainText("Season 3");
    await expect(page.getByTestId("article-date")).toBeVisible();
    await expect(page.getByTestId("article-body")).toBeVisible();
  });

  test("back link returns to news listing", async ({ page }) => {
    await page.goto("/news-and-events/articles/season-3-launch");
    await page.getByTestId("article-back-link").click();
    await expect(page).toHaveURL(/\/news-and-events/);
  });

  test("world map article displays correctly", async ({ page }) => {
    await page.goto("/news-and-events/articles/world-map-release");
    await expect(page.getByTestId("article-title")).toContainText("World Map");
  });
});

