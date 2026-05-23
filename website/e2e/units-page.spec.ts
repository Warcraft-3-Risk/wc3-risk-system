import { test, expect } from "@playwright/test";
import units from "../src/app/data/units.json";

const formatNumber = (value: number) => value.toLocaleString("en-US");

test.describe("Units Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/how-to/units-page");
  });

  test("renders every unit category and card from the data set", async ({ page }) => {
    const categories = [
      { heading: "land-units-heading", units: units.filter((unit) => unit.category === "land") },
      { heading: "naval-units-heading", units: units.filter((unit) => unit.category === "naval") },
      { heading: "ships-heading", units: units.filter((unit) => unit.category === "ship") },
    ];

    await expect(page.getByTestId("units-page")).toBeVisible();
    await expect(page.getByTestId("units-heading")).toContainText("Units & Combat");

    for (const category of categories) {
      await expect(page.getByTestId(category.heading)).toBeVisible();
      for (const unit of category.units) {
        const card = page.getByTestId(`unit-card-${unit.id}`);
        await expect(card).toBeVisible();
        await expect(card).toHaveAttribute("href", `/how-to/units-page/${unit.id}`);
        await expect(card).toContainText(unit.name);
        await expect(card).toContainText(formatNumber(unit.hp));
        await expect(card).toContainText(String(unit.damage));
        await expect(card).toContainText(unit.role);
        await expect(page.getByTestId(`unit-icon-${unit.id}`)).toHaveAttribute("alt", unit.name);
      }
    }
  });

  test("shows where each unit is trained", async ({ page }) => {
    await expect(page.getByTestId("unit-card-rifleman").locator('[title="Trained at City"] img[alt="Trained at City"]')).toBeVisible();
    await expect(page.getByTestId("unit-card-transport-ship").locator('[title="Trained at Port"] img[alt="Trained at Port"]')).toBeVisible();
  });

  test("clicking a unit card navigates to its detail page", async ({ page }) => {
    await page.getByTestId("unit-card-rifleman").click();
    await expect(page).toHaveURL(/\/how-to\/units-page\/rifleman$/);
    await expect(page.getByTestId("unit-detail-rifleman")).toBeVisible();
  });
});

test.describe("Unit Detail Pages", () => {
  for (const unit of units) {
    test(`${unit.name} exposes complete stats and abilities`, async ({ page }) => {
      await page.goto(`/how-to/units-page/${unit.id}`);

      await expect(page.getByTestId(`unit-detail-${unit.id}`)).toBeVisible();
      await expect(page.getByTestId("unit-detail-name")).toContainText(unit.name);
      await expect(page.getByTestId("unit-detail-description")).toContainText(unit.description);
      await expect(page.getByTestId("unit-stat-hp")).toContainText(formatNumber(unit.hp));
      await expect(page.getByTestId("unit-stat-damage")).toContainText(String(unit.damage));
      await expect(page.getByTestId("unit-stat-role")).toContainText(unit.role);
      await expect(page.getByTestId("unit-stat-cost")).toContainText(unit.costTier);
      await expect(page.getByTestId("unit-stat-category")).toContainText(unit.category);
      await expect(page.getByTestId("unit-stat-id")).toContainText(unit.unitId);
      await expect(page.getByTestId("unit-stat-trained")).toContainText(unit.category === "land" ? "City" : "Port");

      if (unit.characterArt) {
        await expect(page.getByTestId("unit-detail-art")).toHaveAttribute("src", unit.characterArt);
      }

      if (unit.abilities.length > 0) {
        for (const ability of unit.abilities) {
          await expect(page.getByTestId("unit-abilities")).toContainText(ability);
        }
      } else {
        await expect(page.getByTestId("unit-abilities")).toHaveCount(0);
      }
    });
  }

  test("back link returns to the units list", async ({ page }) => {
    await page.goto("/how-to/units-page/rifleman");
    await page.getByTestId("unit-back-link").click();
    await expect(page).toHaveURL(/\/how-to\/units-page$/);
    await expect(page.getByTestId("units-page")).toBeVisible();
  });
});
