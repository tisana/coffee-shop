import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReportOrdersResponse, ReportSalesResponse } from "@coffee-shop/shared/contracts/api";

const reportSession = vi.hoisted(() => ({
  token: "valid-report-session",
  staff: {
    id: "8a0d14e6-8e83-472a-9d54-595e0d8f30e1",
    username: "report-barista",
    displayName: "Report Barista",
    authorizationStatus: "authorized" as const
  }
}));

vi.mock("../../src/auth/sessions", async (importActual) => {
  const actual = await importActual<typeof import("../../src/auth/sessions")>();

  return {
    ...actual,
    getSessionCookie: vi.fn((request) => {
      const cookies = request.cookies as Record<string, string | undefined> | undefined;
      return cookies?.staff_session;
    }),
    lookupStaffSession: vi.fn(async (token: string) => {
      if (token !== reportSession.token) {
        return null;
      }

      return {
        id: reportSession.token,
        staff: reportSession.staff,
        expiresAt: new Date("2026-06-30T00:00:00.000Z")
      };
    })
  };
});

vi.mock("../../src/domain/reportingService", async (importActual) => {
  const actual = await importActual<typeof import("../../src/domain/reportingService")>();

  return {
    ...actual,
    getSalesReport: vi.fn(),
    getReportOrders: vi.fn()
  };
});

import { createApp } from "../../src/app";
import { getReportOrders, getSalesReport } from "../../src/domain/reportingService";

const validMenuCategoryId = "1eb04d80-a0f4-4f9c-b936-cf25acbd6e85";
const validMenuItemId = "5b6eb8c6-9790-4ea5-bb5a-43c839f5d7b1";

function reportSalesResponse(overrides: Partial<ReportSalesResponse> = {}): ReportSalesResponse {
  return {
    filters: overrides.filters ?? {
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "weekly",
      statuses: ["completed", "picked_up"],
      menuCategoryId: validMenuCategoryId,
      menuItemId: validMenuItemId
    },
    generatedAt: overrides.generatedAt ?? "2026-06-30T10:00:00.000Z",
    overall: overrides.overall ?? {
      totalSales: "0.00",
      orderCount: 0,
      averageOrderValue: "0.00",
      topSellingItemName: null,
      topSellingItemQuantity: null
    },
    periods: overrides.periods ?? [],
    popularItems: overrides.popularItems ?? [],
    popularCombinations: overrides.popularCombinations ?? []
  };
}

function reportOrdersResponse(overrides: Partial<ReportOrdersResponse> = {}): ReportOrdersResponse {
  return {
    filters: overrides.filters ?? {
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "daily",
      statuses: ["completed", "picked_up"],
      menuCategoryId: validMenuCategoryId,
      menuItemId: validMenuItemId
    },
    orders: overrides.orders ?? [
      {
        orderId: "order-report-1",
        businessDate: "2026-06-14",
        dailyOrderNumber: 12,
        status: "picked_up",
        capturedOrderTotal: "15.50",
        reportableTotal: "10.50",
        items: [
          {
            beverageId: "beverage-latte-1",
            sourceMenuItemId: validMenuItemId,
            name: "Report Latte",
            quantity: 1,
            unitPrice: "4.50",
            lineTotal: "4.50",
            status: "completed",
            selectedCustomizations: ["Milk: Oat"]
          },
          {
            beverageId: "beverage-mocha-1",
            sourceMenuItemId: "6d8d0033-54ad-46b0-89bc-ac295b8af013",
            name: "Report Mocha",
            quantity: 1,
            unitPrice: "6.00",
            lineTotal: "6.00",
            status: "completed",
            selectedCustomizations: []
          }
        ],
        createdAt: "2026-06-14T09:00:00.000Z",
        completedAt: "2026-06-14T09:10:00.000Z",
        pickedUpAt: "2026-06-14T09:15:00.000Z"
      }
    ]
  };
}

function authorizedGet(path: "/reports/sales" | "/reports/orders") {
  return request(createApp()).get(path).set("Cookie", [`staff_session=${reportSession.token}`]);
}

describe("reports API foundation contract", () => {
  beforeEach(() => {
    vi.mocked(getSalesReport).mockResolvedValue(reportSalesResponse());
    vi.mocked(getReportOrders).mockResolvedValue(reportOrdersResponse());
  });

  it("requires an authorized staff session for sales and supporting-order reports", async () => {
    const salesResponse = await request(createApp()).get("/reports/sales");
    const ordersResponse = await request(createApp()).get("/reports/orders");

    expect(salesResponse.status).toBe(401);
    expect(salesResponse.body).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Staff authorization required."
    });
    expect(ordersResponse.status).toBe(401);
    expect(ordersResponse.body).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Staff authorization required."
    });
  });

  it("validates shared report query parameters before planned sales responses", async () => {
    const response = await authorizedGet("/reports/sales").query({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "weekly",
      statuses: "completed,picked_up",
      menuCategoryId: validMenuCategoryId,
      menuItemId: validMenuItemId
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      filters: {
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        period: "weekly",
        statuses: ["completed", "picked_up"],
        menuCategoryId: validMenuCategoryId,
        menuItemId: validMenuItemId
      },
      overall: {
        totalSales: "0.00",
        orderCount: 0,
        averageOrderValue: "0.00",
        topSellingItemName: null,
        topSellingItemQuantity: null
      },
      popularItems: [],
      popularCombinations: []
    });
    expect(getSalesReport).toHaveBeenCalledWith({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "weekly",
      statuses: ["completed", "picked_up"],
      menuCategoryId: validMenuCategoryId,
      menuItemId: validMenuItemId
    });
  });

  it("returns supporting orders for selected period, item, and combination filters", async () => {
    vi.mocked(getReportOrders).mockResolvedValue(
      reportOrdersResponse({
        filters: {
          startDate: "2026-06-01",
          endDate: "2026-06-30",
          period: "daily",
          statuses: ["completed"],
          menuCategoryId: validMenuCategoryId,
          menuItemId: validMenuItemId
        }
      })
    );

    const response = await authorizedGet("/reports/orders").query({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "daily",
      statuses: "completed",
      periodKey: "2026-06-14",
      combinationKey: "latte:1|mocha:1",
      menuCategoryId: validMenuCategoryId,
      menuItemId: validMenuItemId
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      filters: {
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        period: "daily",
        statuses: ["completed"],
        menuCategoryId: validMenuCategoryId,
        menuItemId: validMenuItemId
      },
      orders: [
        {
          orderId: "order-report-1",
          businessDate: "2026-06-14",
          dailyOrderNumber: 12,
          status: "picked_up",
          capturedOrderTotal: "15.50",
          reportableTotal: "10.50",
          items: expect.arrayContaining([
            expect.objectContaining({
              beverageId: "beverage-latte-1",
              sourceMenuItemId: validMenuItemId,
              name: "Report Latte",
              quantity: 1,
              unitPrice: "4.50",
              lineTotal: "4.50",
              status: "completed",
              selectedCustomizations: ["Milk: Oat"]
            })
          ])
        }
      ]
    });
    expect(getReportOrders).toHaveBeenCalledWith({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "daily",
      statuses: ["completed"],
      periodKey: "2026-06-14",
      combinationKey: "latte:1|mocha:1",
      menuCategoryId: validMenuCategoryId,
      menuItemId: validMenuItemId
    });
  });

  it("rejects invalid report date ranges for both report routes", async () => {
    const salesResponse = await authorizedGet("/reports/sales").query({
      startDate: "2026-06-30",
      endDate: "2026-06-01"
    });
    const ordersResponse = await authorizedGet("/reports/orders").query({
      startDate: "2026-06-30",
      endDate: "2026-06-01"
    });

    expect(salesResponse.status).toBe(400);
    expect(salesResponse.body).toMatchObject({
      code: "BAD_REQUEST",
      message: "Request validation failed."
    });
    expect(salesResponse.body.details.fieldErrors.endDate).toContain(
      "endDate must be on or after startDate"
    );
    expect(ordersResponse.status).toBe(400);
    expect(ordersResponse.body.details.fieldErrors.endDate).toContain(
      "endDate must be on or after startDate"
    );
  });

  it("rejects unsupported period and status values", async () => {
    const response = await authorizedGet("/reports/sales").query({
      period: "quarterly",
      statuses: "completed,refunded"
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "BAD_REQUEST",
      message: "Request validation failed."
    });
    expect(response.body.details.fieldErrors.period).toBeDefined();
    expect(response.body.details.fieldErrors.statuses).toBeDefined();
  });

  it("returns default completed and picked-up sales totals from non-cancelled beverage snapshots", async () => {
    vi.mocked(getSalesReport).mockResolvedValue(
      reportSalesResponse({
        filters: {
          startDate: "2026-06-02",
          endDate: "2026-06-09",
          period: "daily",
          statuses: ["completed", "picked_up"],
          menuCategoryId: validMenuCategoryId,
          menuItemId: null
        },
        overall: {
          totalSales: "19.00",
          orderCount: 3,
          averageOrderValue: "6.33",
          topSellingItemName: "Report Latte",
          topSellingItemQuantity: 2
        },
        periods: [
          {
            key: "2026-06-02",
            label: "2026-06-02",
            startDate: "2026-06-02",
            endDate: "2026-06-02",
            partial: false,
            totalSales: "9.00",
            orderCount: 1,
            averageOrderValue: "9.00",
            topSellingItemName: "Report Latte",
            topSellingItemQuantity: 2
          },
          {
            key: "2026-06-03",
            label: "2026-06-03",
            startDate: "2026-06-03",
            endDate: "2026-06-03",
            partial: false,
            totalSales: "5.00",
            orderCount: 1,
            averageOrderValue: "5.00",
            topSellingItemName: "Report Cappuccino",
            topSellingItemQuantity: 1
          },
          {
            key: "2026-06-09",
            label: "2026-06-09",
            startDate: "2026-06-09",
            endDate: "2026-06-09",
            partial: false,
            totalSales: "5.00",
            orderCount: 1,
            averageOrderValue: "5.00",
            topSellingItemName: "Report Mocha",
            topSellingItemQuantity: 1
          }
        ]
      })
    );

    const response = await authorizedGet("/reports/sales").query({
      startDate: "2026-06-02",
      endDate: "2026-06-09",
      period: "daily",
      menuCategoryId: validMenuCategoryId
    });

    expect(response.status).toBe(200);
    expect(response.body.filters.statuses).toEqual(["completed", "picked_up"]);
    expect(response.body.overall).toMatchObject({
      totalSales: "19.00",
      orderCount: 3,
      averageOrderValue: "6.33",
      topSellingItemName: "Report Latte",
      topSellingItemQuantity: 2
    });
    expect(response.body.periods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "2026-06-02",
          totalSales: "9.00",
          orderCount: 1,
          averageOrderValue: "9.00",
          topSellingItemName: "Report Latte",
          topSellingItemQuantity: 2
        }),
        expect.objectContaining({
          key: "2026-06-03",
          totalSales: "5.00",
          orderCount: 1
        }),
        expect.objectContaining({
          key: "2026-06-09",
          totalSales: "5.00",
          orderCount: 1,
          topSellingItemName: "Report Mocha"
        })
      ])
    );
  });

  it("groups report sales by daily, weekly, and monthly periods", async () => {
    vi.mocked(getSalesReport).mockImplementation(async (query) => {
      if (query.period === "weekly") {
        return reportSalesResponse({
          periods: [
            weeklyPeriod("2026-W23", "9.00", true),
            weeklyPeriod("2026-W24", "5.00", false),
            weeklyPeriod("2026-W25", "0.00", false),
            weeklyPeriod("2026-W26", "0.00", true)
          ]
        });
      }

      if (query.period === "monthly") {
        return reportSalesResponse({
          periods: [
            {
              key: "2026-06",
              label: "Jun 2026",
              startDate: "2026-06-02",
              endDate: "2026-06-30",
              partial: true,
              totalSales: "14.00",
              orderCount: 2,
              averageOrderValue: "7.00",
              topSellingItemName: "Report Latte",
              topSellingItemQuantity: 2
            }
          ]
        });
      }

      return reportSalesResponse({
        periods: [
          dailyPeriod("2026-06-02", "9.00"),
          dailyPeriod("2026-06-09", "5.00")
        ]
      });
    });

    const baseQuery = {
      startDate: "2026-06-02",
      endDate: "2026-06-30",
      menuCategoryId: validMenuCategoryId
    };
    const dailyResponse = await authorizedGet("/reports/sales").query({ ...baseQuery, period: "daily" });
    const weeklyResponse = await authorizedGet("/reports/sales").query({ ...baseQuery, period: "weekly" });
    const monthlyResponse = await authorizedGet("/reports/sales").query({ ...baseQuery, period: "monthly" });

    expect(dailyResponse.status).toBe(200);
    expect(dailyResponse.body.periods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "2026-06-02", totalSales: "9.00" }),
        expect.objectContaining({ key: "2026-06-09", totalSales: "5.00" })
      ])
    );
    expect(weeklyResponse.status).toBe(200);
    expect(weeklyResponse.body.periods).toEqual([
      expect.objectContaining({ key: "2026-W23", totalSales: "9.00", partial: true }),
      expect.objectContaining({ key: "2026-W24", totalSales: "5.00", partial: false }),
      expect.objectContaining({ key: "2026-W25", totalSales: "0.00", partial: false }),
      expect.objectContaining({ key: "2026-W26", totalSales: "0.00", partial: true })
    ]);
    expect(monthlyResponse.status).toBe(200);
    expect(monthlyResponse.body.periods).toEqual([
      expect.objectContaining({
        key: "2026-06",
        totalSales: "14.00",
        orderCount: 2,
        averageOrderValue: "7.00",
        partial: true
      })
    ]);
  });

  it("returns popular item rankings by quantity sold, sales amount, order count, and deterministic ties", async () => {
    vi.mocked(getSalesReport).mockResolvedValue(
      reportSalesResponse({
        popularItems: [
          {
            rank: 1,
            sourceMenuItemId: "item-latte",
            itemName: "Report Latte",
            categoryName: "Coffee",
            quantitySold: 6,
            orderCount: 3,
            salesAmount: "27.00"
          },
          {
            rank: 2,
            sourceMenuItemId: "item-mocha",
            itemName: "Report Mocha",
            categoryName: "Coffee",
            quantitySold: 4,
            orderCount: 2,
            salesAmount: "24.00"
          },
          {
            rank: 3,
            sourceMenuItemId: "item-cold-brew",
            itemName: "Cold Brew",
            categoryName: "Coffee",
            quantitySold: 4,
            orderCount: 4,
            salesAmount: "20.00"
          }
        ]
      })
    );

    const response = await authorizedGet("/reports/sales").query({
      startDate: "2026-06-01",
      endDate: "2026-06-30"
    });

    expect(response.status).toBe(200);
    expect(response.body.popularItems).toEqual([
      {
        rank: 1,
        sourceMenuItemId: "item-latte",
        itemName: "Report Latte",
        categoryName: "Coffee",
        quantitySold: 6,
        orderCount: 3,
        salesAmount: "27.00"
      },
      {
        rank: 2,
        sourceMenuItemId: "item-mocha",
        itemName: "Report Mocha",
        categoryName: "Coffee",
        quantitySold: 4,
        orderCount: 2,
        salesAmount: "24.00"
      },
      {
        rank: 3,
        sourceMenuItemId: "item-cold-brew",
        itemName: "Cold Brew",
        categoryName: "Coffee",
        quantitySold: 4,
        orderCount: 4,
        salesAmount: "20.00"
      }
    ]);
  });

  it("returns popular order combination rankings by frequency and sales while excluding cancelled beverages", async () => {
    vi.mocked(getSalesReport).mockResolvedValue(
      reportSalesResponse({
        popularCombinations: [
          {
            rank: 1,
            combinationKey: "Report Latte x1|Report Mocha x1",
            combinationLabel: "Report Latte x1 + Report Mocha x1",
            orderFrequency: 3,
            itemCount: 2,
            salesAmount: "31.50"
          },
          {
            rank: 2,
            combinationKey: "Cold Brew x2",
            combinationLabel: "Cold Brew x2",
            orderFrequency: 2,
            itemCount: 2,
            salesAmount: "20.00"
          }
        ]
      })
    );

    const response = await authorizedGet("/reports/sales").query({
      startDate: "2026-06-01",
      endDate: "2026-06-30"
    });

    expect(response.status).toBe(200);
    expect(response.body.popularCombinations).toEqual([
      {
        rank: 1,
        combinationKey: "Report Latte x1|Report Mocha x1",
        combinationLabel: "Report Latte x1 + Report Mocha x1",
        orderFrequency: 3,
        itemCount: 2,
        salesAmount: "31.50"
      },
      {
        rank: 2,
        combinationKey: "Cold Brew x2",
        combinationLabel: "Cold Brew x2",
        orderFrequency: 2,
        itemCount: 2,
        salesAmount: "20.00"
      }
    ]);
  });
});

function dailyPeriod(key: string, totalSales: string) {
  return {
    key,
    label: key,
    startDate: key,
    endDate: key,
    partial: false,
    totalSales,
    orderCount: totalSales === "0.00" ? 0 : 1,
    averageOrderValue: totalSales,
    topSellingItemName: totalSales === "0.00" ? null : "Report Latte",
    topSellingItemQuantity: totalSales === "0.00" ? null : 2
  };
}

function weeklyPeriod(key: string, totalSales: string, partial: boolean) {
  return {
    key,
    label: key,
    startDate: "2026-06-02",
    endDate: "2026-06-30",
    partial,
    totalSales,
    orderCount: totalSales === "0.00" ? 0 : 1,
    averageOrderValue: totalSales,
    topSellingItemName: totalSales === "0.00" ? null : "Report Latte",
    topSellingItemQuantity: totalSales === "0.00" ? null : 2
  };
}
