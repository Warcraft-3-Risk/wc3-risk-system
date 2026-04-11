import { test, expect } from "@playwright/test";

test.describe("Units Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/how-to/units-page");
  });

  test("renders with heading", async ({ page }) => {
    await expect(page.getByTestId("units-page")).toBeVisible();
    await expect(page.getByTestId("units-heading")).toContainText("Units & Combat");
  });

  test("displays land units section", async ({ page }) => {
    await expect(page.getByTestId("land-units-heading")).toBeVisible();
    await expect(page.getByTestId("unit-list")).toBeVisible();
  });

  test("displays unit cards for land units", async ({ page }) => {
    await expect(page.getByTestId("unit-card-rifleman")).toBeVisible();
    await expect(page.getByTestId("unit-card-medic")).toBeVisible();
    await expect(page.getByTestId("unit-card-mortar")).toBeVisible();
    await expect(page.getByTestId("unit-card-tank")).toBeVisible();
    await expect(page.getByTestId("unit-card-knight")).toBeVisible();
    await expect(page.getByTestId("unit-card-general")).toBeVisible();
    await expect(page.getByTestId("unit-card-artillery")).toBeVisible();
    await expect(page.getByTestId("unit-card-roarer")).toBeVisible();
  });

  test("displays naval units section", async ({ page }) => {
    await expect(page.getByTestId("naval-units-heading")).toBeVisible();
    await expect(page.getByTestId("unit-card-marine")).toBeVisible();
    await expect(page.getByTestId("unit-card-major")).toBeVisible();
    await expect(page.getByTestId("unit-card-admiral")).toBeVisible();
  });

  test("displays ships section", async ({ page }) => {
    await expect(page.getByTestId("ships-heading")).toBeVisible();
    await expect(page.getByTestId("unit-card-transport-ship")).toBeVisible();
    await expect(page.getByTestId("unit-card-battleship-ss")).toBeVisible();
  });

  test("unit card shows HP and damage", async ({ page }) => {
    const riflemanCard = page.getByTestId("unit-card-rifleman");
    await expect(riflemanCard).toContainText("200");
    await expect(riflemanCard).toContainText("20");
  });

  test("unit icon is visible", async ({ page }) => {
    await expect(page.getByTestId("unit-icon-rifleman")).toBeVisible();
  });

  test("clicking unit card navigates to detail page", async ({ page }) => {
    await page.getByTestId("unit-card-rifleman").click();
    await expect(page).toHaveURL(/\/how-to\/units-page\/rifleman/);
  });
});

test.describe("Unit Detail Page", () => {
  test("displays unit details for rifleman", async ({ page }) => {
    await page.goto("/how-to/units-page/rifleman");
    await expect(page.getByTestId("unit-detail-rifleman")).toBeVisible();
    await expect(page.getByTestId("unit-detail-name")).toContainText("Riflemen");
    await expect(page.getByTestId("unit-detail-description")).toBeVisible();
    await expect(page.getByTestId("unit-stat-hp")).toContainText("200");
    await expect(page.getByTestId("unit-stat-damage")).toContainText("20");
    await expect(page.getByTestId("unit-stat-role")).toBeVisible();
    await expect(page.getByTestId("unit-detail-art")).toBeVisible();
  });

  test("displays unit details for tank", async ({ page }) => {
    await page.goto("/how-to/units-page/tank");
    await expect(page.getByTestId("unit-detail-tank")).toBeVisible();
    await expect(page.getByTestId("unit-detail-name")).toContainText("Tank");
    await expect(page.getByTestId("unit-stat-hp")).toContainText("2,600");
  });

  test("back link returns to units list", async ({ page }) => {
    await page.goto("/how-to/units-page/rifleman");
    await page.getByTestId("unit-back-link").click();
    await expect(page).toHaveURL(/\/how-to\/units-page/);
  });

  test("shows abilities when unit has them", async ({ page }) => {
    await page.goto("/how-to/units-page/medic");
    await expect(page.getByTestId("unit-abilities")).toBeVisible();
    await expect(page.getByTestId("unit-abilities")).toContainText("Heal");
  });
});

