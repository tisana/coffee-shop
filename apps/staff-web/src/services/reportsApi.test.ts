import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReportOrdersQuery, ReportSalesQuery } from "@coffee-shop/shared/contracts/api";

import { apiClient } from "./apiClient";
import { getReportFilterOptions, getReportOrders, getReportSales } from "./reportsApi";

vi.mock("./apiClient", () => ({
  apiClient: {
    request: vi.fn()
  }
}));

describe("reportsApi", () => {
  beforeEach(() => {
    vi.mocked(apiClient.request).mockResolvedValue({});
  });

  it("serializes report sales query parameters", async () => {
    const query: ReportSalesQuery = {
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "weekly",
      statuses: ["completed", "picked_up"],
      menuCategoryId: "category-1",
      menuItemId: "item-1"
    };

    await getReportSales(query);

    expect(apiClient.request).toHaveBeenCalledWith(
      "/reports/sales?startDate=2026-06-01&endDate=2026-06-30&period=weekly&statuses=completed%2Cpicked_up&menuCategoryId=category-1&menuItemId=item-1"
    );
  });

  it("serializes supporting order query parameters", async () => {
    const query: ReportOrdersQuery = {
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "daily",
      statuses: ["completed"],
      periodKey: "2026-06-12",
      combinationKey: "latte:1|mocha:1"
    };

    await getReportOrders(query);

    expect(apiClient.request).toHaveBeenCalledWith(
      "/reports/orders?startDate=2026-06-01&endDate=2026-06-30&period=daily&statuses=completed&periodKey=2026-06-12&combinationKey=latte%3A1%7Cmocha%3A1"
    );
  });

  it("reuses menu categories as report filter options", async () => {
    await getReportFilterOptions();

    expect(apiClient.request).toHaveBeenCalledWith("/menu/categories");
  });
});
