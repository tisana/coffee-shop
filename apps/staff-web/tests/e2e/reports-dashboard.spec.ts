import { expect, test, type Page } from "@playwright/test";

import {
  fulfillReportApiRoute,
  popularCombinationReport,
  popularItemReport,
  reportOrdersResponse,
  supportingOrder,
  reportSalesResponse,
  reportPeriodSummary,
} from "./reportTestData";

test("staff opens Reports and switches daily, weekly, and monthly sales summaries", async ({
  page,
}) => {
  const reportRequests: string[] = [];
  const orderRequests: string[] = [];

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
                  customizationGroups: [],
                },
                {
                  id: "item-mocha",
                  categoryId: "category-coffee",
                  name: "Mocha",
                  description: "Chocolate espresso",
                  imageUrl: null,
                  price: "6.00",
                  available: true,
                  active: true,
                  displayOrder: 2,
                  customizationGroups: [],
                },
              ],
            },
          ],
        }),
      });
      return;
    }

    if (path === "/reports/orders") {
      orderRequests.push(url.search);
      await fulfillReportApiRoute(route, {
        orders: reportOrdersResponse({
          orders: [
            supportingOrder({
              orderId: "supporting-order-1",
              businessDate: "2026-06-25",
              dailyOrderNumber: 42,
              status: "picked_up",
              capturedOrderTotal: "10.50",
              reportableTotal: "10.50",
              items: [
                {
                  beverageId: "supporting-bev-latte",
                  sourceMenuItemId: "item-latte",
                  name: "Latte",
                  quantity: 1,
                  unitPrice: "4.50",
                  lineTotal: "4.50",
                  status: "completed",
                  selectedCustomizations: [],
                },
                {
                  beverageId: "supporting-bev-mocha",
                  sourceMenuItemId: "item-mocha",
                  name: "Mocha",
                  quantity: 1,
                  unitPrice: "6.00",
                  lineTotal: "6.00",
                  status: "completed",
                  selectedCustomizations: [],
                },
              ],
            }),
          ],
        }),
      });
      return;
    }

    if (path === "/reports/sales") {
      reportRequests.push(url.search);
      const period = url.searchParams.get("period") ?? "daily";
      const periodRows =
        period === "weekly"
          ? [
              reportPeriodSummary({
                key: "2026-W25",
                label: "Week of Jun 15",
                totalSales: "48.00",
                orderCount: 9,
                averageOrderValue: "5.33",
                topSellingItemName: "Mocha",
                topSellingItemQuantity: 3,
              }),
              reportPeriodSummary({
                key: "2026-W26",
                label: "Week of Jun 22",
                totalSales: "64.00",
                orderCount: 12,
                averageOrderValue: "5.33",
                topSellingItemName: "Latte",
                topSellingItemQuantity: 4,
              }),
            ]
          : period === "monthly"
            ? [
                reportPeriodSummary({
                  key: "2026-05",
                  label: "May 2026",
                  totalSales: "96.00",
                  orderCount: 18,
                  averageOrderValue: "5.33",
                  topSellingItemName: "Cold Brew",
                  topSellingItemQuantity: 6,
                }),
                reportPeriodSummary({
                  key: "2026-06",
                  label: "Jun 2026",
                  totalSales: "128.00",
                  orderCount: 24,
                  averageOrderValue: "5.33",
                  topSellingItemName: "Latte",
                  topSellingItemQuantity: 8,
                }),
              ]
            : [
                reportPeriodSummary({
                  key: "2026-06-24",
                  label: "Jun 24",
                  totalSales: "12.00",
                  orderCount: 2,
                  averageOrderValue: "6.00",
                  topSellingItemName: "Mocha",
                  topSellingItemQuantity: 2,
                }),
                reportPeriodSummary({
                  key: "2026-06-25",
                  label: "Jun 25",
                  totalSales: "18.25",
                  orderCount: 3,
                  averageOrderValue: "6.08",
                  topSellingItemName: "Latte",
                  topSellingItemQuantity: 4,
                }),
              ];

      await fulfillReportApiRoute(route, {
        sales: reportSalesResponse({
          overall: {
            totalSales:
              period === "monthly"
                ? "128.00"
                : period === "weekly"
                  ? "64.00"
                  : "18.25",
            orderCount:
              period === "monthly" ? 24 : period === "weekly" ? 12 : 3,
            averageOrderValue: "6.08",
            topSellingItemName: "Latte",
            topSellingItemQuantity: 4,
          },
          periods: periodRows,
          popularItems: [
            popularItemReport({
              rank: 1,
              sourceMenuItemId: "item-latte",
              itemName: "Latte",
              categoryName: "Coffee",
              quantitySold: 8,
              orderCount: 6,
              salesAmount: "36.00",
            }),
            popularItemReport({
              rank: 2,
              sourceMenuItemId: "item-mocha",
              itemName: "Mocha",
              categoryName: "Coffee",
              quantitySold: 5,
              orderCount: 4,
              salesAmount: "30.00",
            }),
          ],
          popularCombinations: [
            popularCombinationReport({
              rank: 1,
              combinationKey: "Latte x1|Mocha x1",
              combinationLabel: "Latte x1 + Mocha x1",
              orderFrequency: 4,
              itemCount: 2,
              salesAmount: "42.00",
            }),
            popularCombinationReport({
              rank: 2,
              combinationKey: "Cold Brew x2",
              combinationLabel: "Cold Brew x2",
              orderFrequency: 2,
              itemCount: 2,
              salesAmount: "20.00",
            }),
          ],
        }),
      });
      return;
    }

    if (await fulfillReportApiRoute(route)) {
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        code: "NOT_FOUND",
        message: `Unhandled test route ${path}`,
      }),
    });
  });

  const startedAt = Date.now();
  await page.goto("/#reports");

  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(totalSalesMetric(page, "$18.25")).toBeVisible();
  const salesChart = page.getByRole("img", { name: "Sales by period chart" });
  await expect(salesChart).toBeVisible();
  await expect(salesChart).toHaveAttribute("data-chart-variant", "line");
  await expect(salesChart.getByTestId("report-line-chart")).toBeVisible();
  await expect(salesChart).toContainText("Jun 24");
  await expect(salesChart).toContainText("Jun 25");
  await expect(
    page.getByRole("table", { name: "Sales summary table" }),
  ).toBeVisible();

  const popularityStartedAt = Date.now();
  const popularItemsTable = page.getByRole("table", {
    name: "Popular items table",
  });
  const popularCombinationsTable = page.getByRole("table", {
    name: "Popular combinations table",
  });
  const popularItemsChart = page.getByRole("img", {
    name: "Popular items chart",
  });
  const popularCombinationsChart = page.getByRole("img", {
    name: "Popular combinations chart",
  });
  await expect(popularItemsChart).toBeVisible();
  await expect(popularItemsChart).toHaveAttribute("data-chart-variant", "bar");
  await expect(popularItemsChart.getByTestId("report-bar-chart")).toBeVisible();
  await expect(popularItemsTable).toBeVisible();
  await expect(
    popularItemsTable.getByRole("cell", { name: "Latte" }),
  ).toBeVisible();
  await expect(popularCombinationsChart).toBeVisible();
  await expect(popularCombinationsChart).toHaveAttribute(
    "data-chart-variant",
    "bar",
  );
  await expect(
    popularCombinationsChart.getByTestId("report-bar-chart"),
  ).toBeVisible();
  await expect(popularCombinationsTable).toBeVisible();
  await expect(
    popularCombinationsTable.getByRole("cell", { name: "Latte x1 + Mocha x1" }),
  ).toBeVisible();
  expect(Date.now() - popularityStartedAt).toBeLessThan(30_000);

  await page.getByRole("combobox", { name: "Period" }).selectOption("weekly");
  await expect(totalSalesMetric(page, "$64.00")).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Week of Jun 22" }),
  ).toBeVisible();

  await page.getByRole("combobox", { name: "Period" }).selectOption("monthly");
  await expect(totalSalesMetric(page, "$128.00")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Jun 2026" })).toBeVisible();

  const filterStartedAt = Date.now();
  await page.getByLabel("Start date").fill("2026-06-01");
  await page.getByLabel("End date").fill("2026-06-30");
  await page.getByRole("combobox", { name: "Item" }).selectOption("item-latte");
  await expect(totalSalesMetric(page, "$128.00")).toBeVisible();
  await expect(salesChart).toContainText("Jun 2026");
  await expect(
    page
      .getByRole("table", { name: "Sales summary table" })
      .getByRole("cell", { name: "Jun 2026" }),
  ).toBeVisible();
  await expect(popularItemsChart).toContainText("Latte");
  await expect(
    popularItemsTable.getByRole("cell", { name: "Latte" }),
  ).toBeVisible();
  expect(Date.now() - filterStartedAt).toBeLessThan(2_000);

  const salesTable = page.getByRole("table", { name: "Sales summary table" });
  await salesTable.getByRole("button", { name: "Sort by Total sales" }).click();
  await salesTable.getByRole("row", { name: /Jun 2026/ }).click();
  await expect(
    page.getByRole("table", { name: "Supporting orders table" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "#42" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Latte, Mocha" })).toBeVisible();

  await popularItemsTable
    .getByRole("button", { name: "Sort by Quantity sold" })
    .click();
  await popularItemsTable.getByRole("row", { name: /Latte/ }).click();
  await popularCombinationsTable
    .getByRole("button", { name: "Sort by Frequency" })
    .click();
  await popularCombinationsTable
    .getByRole("row", { name: /Latte x1 \+ Mocha x1/ })
    .click();

  expect(
    reportRequests.some((request) => request.includes("period=daily")),
  ).toBe(true);
  expect(
    reportRequests.some((request) => request.includes("period=weekly")),
  ).toBe(true);
  expect(
    reportRequests.some((request) => request.includes("period=monthly")),
  ).toBe(true);
  expect(
    reportRequests.some((request) => request.includes("menuItemId=item-latte")),
  ).toBe(true);
  expect(
    orderRequests.some((request) => request.includes("periodKey=2026-06")),
  ).toBe(true);
  expect(
    orderRequests.some((request) => request.includes("menuItemId=item-latte")),
  ).toBe(true);
  expect(
    orderRequests.some((request) =>
      request.includes("combinationKey=Latte+x1%7CMocha+x1"),
    ),
  ).toBe(true);
  expect(Date.now() - startedAt).toBeLessThan(10_000);
});

function totalSalesMetric(page: Page, value: string) {
  return page
    .locator(".report-metric")
    .filter({ hasText: "Total sales" })
    .getByText(value);
}
