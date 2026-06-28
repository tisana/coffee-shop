import { describe, expect, it } from "vitest";

import {
  addMoney,
  buildReportPeriods,
  calculateBeverageLineTotal,
  compareReportDates,
  parseMoney
} from "../../src/domain/reportingService";

describe("reporting service foundation helpers", () => {
  it("calculates money values with stable two-decimal output", () => {
    expect(parseMoney("4.50")).toBe(4.5);
    expect(addMoney("4.50", "0.75")).toBe("5.25");
    expect(calculateBeverageLineTotal({ priceSnapshot: "5.25", quantity: 2 })).toBe("10.50");
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
});
