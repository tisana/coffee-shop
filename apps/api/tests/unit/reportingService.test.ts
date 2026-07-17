import { describe, expect, it } from "vitest";

import {
  aggregateSalesReport,
  aggregateReportOrders,
  addMoney,
  buildReportPeriods,
  calculateBeverageLineTotal,
  compareReportDates,
  parseMoney
} from "../../src/domain/reportingService";
import type { Order } from "@coffee-shop/shared/domain/types";

function reportOrder(overrides: Partial<Order>): Order {
  const orderId = overrides.id ?? crypto.randomUUID();

  return {
    id: orderId,
    businessDate: overrides.businessDate ?? "2026-06-02",
    dailyOrderNumber: overrides.dailyOrderNumber ?? 1,
    pickupName: overrides.pickupName ?? "Report Guest",
    status: overrides.status ?? "completed",
    createdByStaffId: overrides.createdByStaffId ?? "staff-1",
    assignedBaristaId: overrides.assignedBaristaId ?? "staff-1",
    total: overrides.total ?? "9.00",
    createdAt: overrides.createdAt ?? `${overrides.businessDate ?? "2026-06-02"}T09:00:00.000Z`,
    queuedAt: overrides.queuedAt ?? null,
    inProgressAt: overrides.inProgressAt ?? null,
    completedAt: overrides.completedAt ?? null,
    pickedUpAt: overrides.pickedUpAt ?? null,
    cancelledAt: overrides.cancelledAt ?? null,
    beverages:
      overrides.beverages ?? [
        {
          id: `${orderId}-bev-1`,
          orderId,
          sourceMenuItemId: "item-latte",
          nameSnapshot: "Latte",
          quantity: 2,
          priceSnapshot: "4.50",
          selectedCustomizationsSnapshot: [],
          specialInstructions: null,
          status: "completed",
          completedAt: null,
          cancelledAt: null,
          cancellationReason: null
        }
      ]
  };
}

describe("reporting service foundation helpers", () => {
  it("calculates money values with stable two-decimal output", () => {
    expect(parseMoney("4.50")).toBe(4.5);
    expect(addMoney("4.50", "0.75")).toBe("5.25");
    expect(addMoney("0.10", "0.20")).toBe("0.30");
    expect(calculateBeverageLineTotal({ priceSnapshot: "5.25", quantity: 2 })).toBe("10.50");
    expect(calculateBeverageLineTotal({ priceSnapshot: "3.33", quantity: 3 })).toBe("9.99");
    expect(calculateBeverageLineTotal({ priceSnapshot: "4.50", quantity: 2, loyaltyCoveredAmount: "4.50" })).toBe("4.50");
  });

  it("subtracts active reward coverage from order and popular-item sales while retaining purchased quantity", () => {
    const coveredBeverage: Order["beverages"][number] & { loyaltyCoveredAmount: string } = {
      id: "covered-beverage", orderId: "covered-order", sourceMenuItemId: "item-latte", nameSnapshot: "Latte", quantity: 1,
      priceSnapshot: "4.50", loyaltyCoveredAmount: "4.50", selectedCustomizationsSnapshot: [], specialInstructions: null,
      status: "completed", completedAt: null, cancelledAt: null, cancellationReason: null
    };
    const report = aggregateSalesReport({
      filter: { startDate: "2026-06-02", endDate: "2026-06-02", period: "daily", statuses: ["completed"], menuCategoryId: null, menuItemId: null },
      orders: [reportOrder({ id: "covered-order", beverages: [coveredBeverage] })],
      generatedAt: "2026-06-02T12:00:00.000Z"
    });

    expect(report.overall).toMatchObject({ totalSales: "0.00", orderCount: 0 });
    expect(report.popularItems[0]).toMatchObject({ itemName: "Latte", quantitySold: 1, salesAmount: "0.00" });
  });

  it("builds daily, weekly, and monthly report periods from business dates", () => {
    expect(
      buildReportPeriods({
        startDate: "2026-06-01",
        endDate: "2026-06-03",
        period: "daily"
      }).map((period) => period.key)
    ).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);

    expect(
      buildReportPeriods({
        startDate: "2026-06-03",
        endDate: "2026-06-15",
        period: "weekly"
      })
    ).toEqual([
      {
        key: "2026-W23",
        label: "Jun 1-7, 2026",
        startDate: "2026-06-03",
        endDate: "2026-06-07",
        partial: true,
        period: "weekly"
      },
      {
        key: "2026-W24",
        label: "Jun 8-14, 2026",
        startDate: "2026-06-08",
        endDate: "2026-06-14",
        partial: false,
        period: "weekly"
      },
      {
        key: "2026-W25",
        label: "Jun 15-21, 2026",
        startDate: "2026-06-15",
        endDate: "2026-06-15",
        partial: true,
        period: "weekly"
      }
    ]);

    expect(
      buildReportPeriods({
        startDate: "2026-06-15",
        endDate: "2026-07-02",
        period: "monthly"
      }).map((period) => ({
        key: period.key,
        startDate: period.startDate,
        endDate: period.endDate,
        partial: period.partial
      }))
    ).toEqual([
      { key: "2026-06", startDate: "2026-06-15", endDate: "2026-06-30", partial: true },
      { key: "2026-07", startDate: "2026-07-01", endDate: "2026-07-02", partial: true }
    ]);
  });

  it("compares ISO business dates without viewer-local timezone conversion", () => {
    expect(compareReportDates("2026-06-01", "2026-06-02")).toBeLessThan(0);
    expect(compareReportDates("2026-06-02", "2026-06-02")).toBe(0);
    expect(compareReportDates("2026-06-03", "2026-06-02")).toBeGreaterThan(0);
  });

  it("returns no report periods when the selected business-date range is invalid", () => {
    expect(
      buildReportPeriods({
        startDate: "2026-06-30",
        endDate: "2026-06-01",
        period: "daily"
      })
    ).toEqual([]);
  });

  it("aggregates sales totals, averages, and top-selling item tie-breaks from reportable beverage snapshots", () => {
    const report = aggregateSalesReport({
      filter: {
        startDate: "2026-06-02",
        endDate: "2026-06-02",
        period: "daily",
        statuses: ["completed", "picked_up"],
        menuCategoryId: null,
        menuItemId: null
      },
      orders: [
        reportOrder({
          id: "order-1",
          beverages: [
            {
              id: "bev-1",
              orderId: "order-1",
              sourceMenuItemId: "item-latte",
              nameSnapshot: "Latte",
              quantity: 2,
              priceSnapshot: "4.50",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            }
          ]
        }),
        reportOrder({
          id: "order-2",
          total: "12.00",
          beverages: [
            {
              id: "bev-2",
              orderId: "order-2",
              sourceMenuItemId: "item-mocha",
              nameSnapshot: "Mocha",
              quantity: 2,
              priceSnapshot: "6.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            },
            {
              id: "bev-3",
              orderId: "order-2",
              sourceMenuItemId: "item-latte",
              nameSnapshot: "Latte",
              quantity: 1,
              priceSnapshot: "4.50",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "cancelled",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: "Unavailable"
            }
          ]
        })
      ],
      generatedAt: "2026-06-02T12:00:00.000Z"
    });

    expect(report.overall).toEqual({
      totalSales: "21.00",
      orderCount: 2,
      averageOrderValue: "10.50",
      topSellingItemName: "Mocha",
      topSellingItemQuantity: 2
    });
    expect(report.periods[0]).toMatchObject({
      key: "2026-06-02",
      totalSales: "21.00",
      orderCount: 2,
      averageOrderValue: "10.50",
      topSellingItemName: "Mocha",
      topSellingItemQuantity: 2
    });
  });

  it("groups sales by partial weekly and monthly business-date periods", () => {
    const report = aggregateSalesReport({
      filter: {
        startDate: "2026-06-03",
        endDate: "2026-07-02",
        period: "monthly",
        statuses: ["completed", "picked_up"],
        menuCategoryId: null,
        menuItemId: null
      },
      orders: [
        reportOrder({ id: "order-june", businessDate: "2026-06-03" }),
        reportOrder({ id: "order-july", businessDate: "2026-07-02" })
      ],
      generatedAt: "2026-07-02T12:00:00.000Z"
    });

    expect(report.periods).toEqual([
      expect.objectContaining({
        key: "2026-06",
        totalSales: "9.00",
        orderCount: 1,
        partial: true
      }),
      expect.objectContaining({
        key: "2026-07",
        totalSales: "9.00",
        orderCount: 1,
        partial: true
      })
    ]);
  });

  it("excludes cancelled beverages and zero-reportable orders from sales counts", () => {
    const report = aggregateSalesReport({
      filter: {
        startDate: "2026-06-02",
        endDate: "2026-06-02",
        period: "daily",
        statuses: ["completed", "picked_up"],
        menuCategoryId: null,
        menuItemId: null
      },
      orders: [
        reportOrder({
          id: "order-cancelled-bev",
          beverages: [
            {
              id: "bev-cancelled",
              orderId: "order-cancelled-bev",
              sourceMenuItemId: "item-latte",
              nameSnapshot: "Latte",
              quantity: 1,
              priceSnapshot: "4.50",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "cancelled",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: "Unavailable"
            }
          ]
        })
      ],
      generatedAt: "2026-06-02T12:00:00.000Z"
    });

    expect(report.overall).toMatchObject({
      totalSales: "0.00",
      orderCount: 0,
      averageOrderValue: "0.00",
      topSellingItemName: null,
      topSellingItemQuantity: null
    });
  });

  it("aggregates popular item rows from non-cancelled purchased beverage snapshots", () => {
    const report = aggregateSalesReport({
      filter: {
        startDate: "2026-06-02",
        endDate: "2026-06-02",
        period: "daily",
        statuses: ["completed", "picked_up"],
        menuCategoryId: null,
        menuItemId: null
      },
      orders: [
        reportOrder({
          id: "popular-order-1",
          beverages: [
            {
              id: "popular-bev-1",
              orderId: "popular-order-1",
              sourceMenuItemId: "item-latte",
              nameSnapshot: "Latte",
              quantity: 2,
              priceSnapshot: "4.50",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            },
            {
              id: "popular-bev-2",
              orderId: "popular-order-1",
              sourceMenuItemId: "item-mocha",
              nameSnapshot: "Mocha",
              quantity: 1,
              priceSnapshot: "6.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            }
          ]
        }),
        reportOrder({
          id: "popular-order-2",
          status: "picked_up",
          beverages: [
            {
              id: "popular-bev-3",
              orderId: "popular-order-2",
              sourceMenuItemId: "item-mocha",
              nameSnapshot: "Mocha",
              quantity: 2,
              priceSnapshot: "6.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            },
            {
              id: "popular-bev-4",
              orderId: "popular-order-2",
              sourceMenuItemId: "item-latte",
              nameSnapshot: "Latte",
              quantity: 1,
              priceSnapshot: "4.50",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "cancelled",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: "Unavailable"
            }
          ]
        }),
        reportOrder({
          id: "popular-order-3",
          beverages: [
            {
              id: "popular-bev-5",
              orderId: "popular-order-3",
              sourceMenuItemId: "item-cold-brew",
              nameSnapshot: "Cold Brew",
              quantity: 3,
              priceSnapshot: "5.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            }
          ]
        })
      ],
      generatedAt: "2026-06-02T12:00:00.000Z"
    });

    expect(report.popularItems).toEqual([
      {
        rank: 1,
        sourceMenuItemId: "item-mocha",
        itemName: "Mocha",
        categoryName: null,
        quantitySold: 3,
        orderCount: 2,
        salesAmount: "18.00"
      },
      {
        rank: 2,
        sourceMenuItemId: "item-cold-brew",
        itemName: "Cold Brew",
        categoryName: null,
        quantitySold: 3,
        orderCount: 1,
        salesAmount: "15.00"
      },
      {
        rank: 3,
        sourceMenuItemId: "item-latte",
        itemName: "Latte",
        categoryName: null,
        quantitySold: 2,
        orderCount: 1,
        salesAmount: "9.00"
      }
    ]);
  });

  it("aggregates popular order combinations by frequency and sales without cancelled beverages", () => {
    const report = aggregateSalesReport({
      filter: {
        startDate: "2026-06-02",
        endDate: "2026-06-02",
        period: "daily",
        statuses: ["completed", "picked_up"],
        menuCategoryId: null,
        menuItemId: null
      },
      orders: [
        reportOrder({
          id: "combo-order-1",
          beverages: [
            {
              id: "combo-bev-1",
              orderId: "combo-order-1",
              sourceMenuItemId: "item-latte",
              nameSnapshot: "Latte",
              quantity: 1,
              priceSnapshot: "4.50",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            },
            {
              id: "combo-bev-2",
              orderId: "combo-order-1",
              sourceMenuItemId: "item-mocha",
              nameSnapshot: "Mocha",
              quantity: 1,
              priceSnapshot: "6.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            }
          ]
        }),
        reportOrder({
          id: "combo-order-2",
          beverages: [
            {
              id: "combo-bev-3",
              orderId: "combo-order-2",
              sourceMenuItemId: "item-mocha",
              nameSnapshot: "Mocha",
              quantity: 1,
              priceSnapshot: "6.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            },
            {
              id: "combo-bev-4",
              orderId: "combo-order-2",
              sourceMenuItemId: "item-latte",
              nameSnapshot: "Latte",
              quantity: 1,
              priceSnapshot: "4.50",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            },
            {
              id: "combo-bev-5",
              orderId: "combo-order-2",
              sourceMenuItemId: "item-cold-brew",
              nameSnapshot: "Cold Brew",
              quantity: 1,
              priceSnapshot: "5.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "cancelled",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: "Unavailable"
            }
          ]
        }),
        reportOrder({
          id: "combo-order-3",
          beverages: [
            {
              id: "combo-bev-6",
              orderId: "combo-order-3",
              sourceMenuItemId: "item-cold-brew",
              nameSnapshot: "Cold Brew",
              quantity: 2,
              priceSnapshot: "5.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            }
          ]
        })
      ],
      generatedAt: "2026-06-02T12:00:00.000Z"
    });

    expect(report.popularCombinations).toEqual([
      {
        rank: 1,
        combinationKey: "Latte x1|Mocha x1",
        combinationLabel: "Latte x1 + Mocha x1",
        orderFrequency: 2,
        itemCount: 2,
        salesAmount: "21.00"
      },
      {
        rank: 2,
        combinationKey: "Cold Brew x2",
        combinationLabel: "Cold Brew x2",
        orderFrequency: 1,
        itemCount: 2,
        salesAmount: "10.00"
      }
    ]);
  });

  it("builds supporting order details with captured totals and non-cancelled reportable totals", () => {
    const report = aggregateReportOrders({
      filter: {
        startDate: "2026-06-02",
        endDate: "2026-06-02",
        period: "daily",
        statuses: ["completed", "picked_up"],
        menuCategoryId: null,
        menuItemId: null
      },
      orders: [
        reportOrder({
          id: "detail-order-1",
          dailyOrderNumber: 18,
          status: "picked_up",
          total: "15.50",
          completedAt: "2026-06-02T09:10:00.000Z",
          pickedUpAt: "2026-06-02T09:20:00.000Z",
          beverages: [
            {
              id: "detail-bev-1",
              orderId: "detail-order-1",
              sourceMenuItemId: "item-latte",
              nameSnapshot: "Latte",
              quantity: 1,
              priceSnapshot: "4.50",
              selectedCustomizationsSnapshot: [
                {
                  groupName: "Milk",
                  choices: [{ choiceName: "Oat", priceAdjustment: "0.75" }]
                }
              ],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            },
            {
              id: "detail-bev-2",
              orderId: "detail-order-1",
              sourceMenuItemId: "item-mocha",
              nameSnapshot: "Mocha",
              quantity: 1,
              priceSnapshot: "6.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            },
            {
              id: "detail-bev-3",
              orderId: "detail-order-1",
              sourceMenuItemId: "item-cold-brew",
              nameSnapshot: "Cold Brew",
              quantity: 1,
              priceSnapshot: "5.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "cancelled",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: "Unavailable"
            }
          ]
        })
      ]
    });

    expect(report.orders).toEqual([
      {
        orderId: "detail-order-1",
        businessDate: "2026-06-02",
        dailyOrderNumber: 18,
        status: "picked_up",
        capturedOrderTotal: "15.50",
        reportableTotal: "10.50",
        items: [
          {
            beverageId: "detail-bev-1",
            sourceMenuItemId: "item-latte",
            name: "Latte",
            quantity: 1,
            unitPrice: "4.50",
            lineTotal: "4.50",
            status: "completed",
            selectedCustomizations: ["Milk: Oat"]
          },
          {
            beverageId: "detail-bev-2",
            sourceMenuItemId: "item-mocha",
            name: "Mocha",
            quantity: 1,
            unitPrice: "6.00",
            lineTotal: "6.00",
            status: "completed",
            selectedCustomizations: []
          },
          {
            beverageId: "detail-bev-3",
            sourceMenuItemId: "item-cold-brew",
            name: "Cold Brew",
            quantity: 1,
            unitPrice: "5.00",
            lineTotal: "5.00",
            status: "cancelled",
            selectedCustomizations: []
          }
        ],
        createdAt: "2026-06-02T09:00:00.000Z",
        completedAt: "2026-06-02T09:10:00.000Z",
        pickedUpAt: "2026-06-02T09:20:00.000Z"
      }
    ]);
  });

  it("filters supporting order details by selected period, item, and combination", () => {
    const report = aggregateReportOrders({
      filter: {
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        period: "weekly",
        statuses: ["completed", "picked_up"],
        menuCategoryId: null,
        menuItemId: "item-latte"
      },
      matchingMenuItemIds: new Set(["item-latte"]),
      periodKey: "2026-W23",
      combinationKey: "Latte x1|Mocha x1",
      orders: [
        reportOrder({
          id: "matching-order",
          businessDate: "2026-06-03",
          beverages: [
            {
              id: "matching-latte",
              orderId: "matching-order",
              sourceMenuItemId: "item-latte",
              nameSnapshot: "Latte",
              quantity: 1,
              priceSnapshot: "4.50",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            },
            {
              id: "matching-mocha",
              orderId: "matching-order",
              sourceMenuItemId: "item-mocha",
              nameSnapshot: "Mocha",
              quantity: 1,
              priceSnapshot: "6.00",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            }
          ]
        }),
        reportOrder({
          id: "wrong-period",
          businessDate: "2026-06-15"
        }),
        reportOrder({
          id: "wrong-combination",
          businessDate: "2026-06-04",
          beverages: [
            {
              id: "wrong-combo-latte",
              orderId: "wrong-combination",
              sourceMenuItemId: "item-latte",
              nameSnapshot: "Latte",
              quantity: 2,
              priceSnapshot: "4.50",
              selectedCustomizationsSnapshot: [],
              specialInstructions: null,
              status: "completed",
              completedAt: null,
              cancelledAt: null,
              cancellationReason: null
            }
          ]
        })
      ]
    });

    expect(report.orders.map((order) => order.orderId)).toEqual(["matching-order"]);
  });
});
