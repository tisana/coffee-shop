import { expect, test, type Page } from "@playwright/test";

import {
  fulfillReportApiRoute,
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
          popularItems: [],
          popularCombinations: []
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
