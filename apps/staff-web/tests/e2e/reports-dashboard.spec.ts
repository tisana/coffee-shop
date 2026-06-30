import { expect, test, type Page } from "@playwright/test";

import {
  fulfillReportApiRoute,
  popularCombinationReport,
  popularItemReport,
  reportSalesResponse,
  reportPeriodSummary
} from "./reportTestData";

test("staff opens Reports and switches daily, weekly, and monthly sales summaries", async ({ page }) => {
  const reportRequests: string[] = [];

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/menu/categories") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          categories: [
            {
              id: "category-coffee",
              name: "Coffee",
              displayOrder: 1,
              active: true,
              menuItems: [
                {
                  id: "item-latte",
                  categoryId: "category-coffee",
                  name: "Latte",
                  description: "Espresso with steamed milk",
                  imageUrl: null,
                  price: "4.50",
                  available: true,
                  active: true,
                  displayOrder: 1,
                  customizationGroups: []
                }
              ]
            }
          ]
        })
      });
      return;
    }

    if (path === "/reports/sales") {
      reportRequests.push(url.search);
      const period = url.searchParams.get("period") ?? "daily";
      const label =
        period === "weekly" ? "Week of Jun 22" : period === "monthly" ? "Jun 2026" : "Jun 25";

      await fulfillReportApiRoute(route, {
        sales: reportSalesResponse({
          overall: {
            totalSales: period === "monthly" ? "128.00" : period === "weekly" ? "64.00" : "18.25",
            orderCount: period === "monthly" ? 24 : period === "weekly" ? 12 : 3,
            averageOrderValue: "6.08",
            topSellingItemName: "Latte",
            topSellingItemQuantity: 4
          },
          periods: [
            reportPeriodSummary({
              key: label,
              label,
              totalSales: period === "monthly" ? "128.00" : period === "weekly" ? "64.00" : "18.25",
              orderCount: period === "monthly" ? 24 : period === "weekly" ? 12 : 3,
              averageOrderValue: "6.08",
              topSellingItemName: "Latte",
              topSellingItemQuantity: 4
            })
          ],
          popularItems: [
            popularItemReport({
              rank: 1,
              sourceMenuItemId: "item-latte",
              itemName: "Latte",
              categoryName: "Coffee",
              quantitySold: 8,
              orderCount: 6,
              salesAmount: "36.00"
            }),
            popularItemReport({
              rank: 2,
              sourceMenuItemId: "item-mocha",
              itemName: "Mocha",
              categoryName: "Coffee",
              quantitySold: 5,
              orderCount: 4,
              salesAmount: "30.00"
            })
          ],
          popularCombinations: [
            popularCombinationReport({
              rank: 1,
              combinationKey: "Latte x1|Mocha x1",
              combinationLabel: "Latte x1 + Mocha x1",
              orderFrequency: 4,
              itemCount: 2,
              salesAmount: "42.00"
            }),
            popularCombinationReport({
              rank: 2,
              combinationKey: "Cold Brew x2",
              combinationLabel: "Cold Brew x2",
              orderFrequency: 2,
              itemCount: 2,
              salesAmount: "20.00"
            })
          ]
        })
      });
      return;
    }

    if (await fulfillReportApiRoute(route)) {
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", message: `Unhandled test route ${path}` })
    });
  });

  const startedAt = Date.now();
  await page.goto("/#reports");

  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(totalSalesMetric(page, "$18.25")).toBeVisible();
  await expect(page.getByRole("img", { name: "Sales by period chart" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Sales summary table" })).toBeVisible();

  const popularityStartedAt = Date.now();
  const popularItemsTable = page.getByRole("table", { name: "Popular items table" });
  const popularCombinationsTable = page.getByRole("table", { name: "Popular combinations table" });
  await expect(page.getByRole("img", { name: "Popular items chart" })).toBeVisible();
  await expect(popularItemsTable).toBeVisible();
  await expect(popularItemsTable.getByRole("cell", { name: "Latte" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Popular combinations chart" })).toBeVisible();
  await expect(popularCombinationsTable).toBeVisible();
  await expect(
    popularCombinationsTable.getByRole("cell", { name: "Latte x1 + Mocha x1" })
  ).toBeVisible();
  expect(Date.now() - popularityStartedAt).toBeLessThan(30_000);

  await page.getByRole("combobox", { name: "Period" }).selectOption("weekly");
  await expect(totalSalesMetric(page, "$64.00")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Week of Jun 22" })).toBeVisible();

  await page.getByRole("combobox", { name: "Period" }).selectOption("monthly");
  await expect(totalSalesMetric(page, "$128.00")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Jun 2026" })).toBeVisible();

  expect(reportRequests.some((request) => request.includes("period=daily"))).toBe(true);
  expect(reportRequests.some((request) => request.includes("period=weekly"))).toBe(true);
  expect(reportRequests.some((request) => request.includes("period=monthly"))).toBe(true);
  expect(Date.now() - startedAt).toBeLessThan(10_000);
});

function totalSalesMetric(page: Page, value: string) {
  return page.locator(".report-metric").filter({ hasText: "Total sales" }).getByText(value);
}
