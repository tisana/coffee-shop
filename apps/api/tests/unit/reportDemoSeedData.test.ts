import { describe, expect, it } from "vitest";

import { buildReportDemoOrderSeeds } from "../../src/storage/reportDemoSeedData";

describe("report demo seed data", () => {
  it("builds completed and picked-up report orders across several months", () => {
    const seedOrders = buildReportDemoOrderSeeds("2026-06-30");
    const months = new Set(seedOrders.map((order) => order.businessDate.slice(0, 7)));
    const orderNumbersByDate = new Map<string, Set<number>>();

    for (const order of seedOrders) {
      const orderNumbers = orderNumbersByDate.get(order.businessDate) ?? new Set<number>();

      expect(orderNumbers.has(order.dailyOrderNumber)).toBe(false);
      orderNumbers.add(order.dailyOrderNumber);
      orderNumbersByDate.set(order.businessDate, orderNumbers);

      expect(["completed", "picked_up"]).toContain(order.status);
      expect(Number(order.total)).toBeGreaterThan(0);
      expect(order.beverages.some((beverage) => beverage.status !== "cancelled")).toBe(true);
    }

    expect(seedOrders).toHaveLength(24);
    expect(Array.from(months)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06"
    ]);
  });
});
