import type { Route } from "@playwright/test";

export {
  emptyReportSalesResponse,
  ninetyDayReportPeriods,
  overallReportTotals,
  popularCombinationReport,
  popularItemReport,
  reportFilter,
  reportOrderItem,
  reportOrdersResponse,
  reportPeriodSummary,
  reportSalesResponse,
  supportingOrder
} from "../../src/test/reportTestData";
export type {
  Money,
  OverallReportTotals,
  PopularCombinationReport,
  PopularItemReport,
  ReportFilter,
  ReportOrderDetail,
  ReportOrderItem,
  ReportOrdersResponse,
  ReportOrderStatus,
  ReportPeriodSummary,
  ReportPeriodType,
  ReportSalesResponse
} from "../../src/test/reportTestData";

import {
  reportOrdersResponse,
  reportSalesResponse,
  type ReportOrdersResponse,
  type ReportSalesResponse
} from "../../src/test/reportTestData";

export interface ReportStaffSession {
  id: string;
  username: string;
  displayName: string;
  authorizationStatus: "authorized";
}

export interface ReportApiMockData {
  staff?: ReportStaffSession;
  sales?: ReportSalesResponse;
  orders?: ReportOrdersResponse;
}

export function reportStaffSession(overrides: Partial<ReportStaffSession> = {}): ReportStaffSession {
  return {
    id: overrides.id ?? "staff-report-1",
    username: overrides.username ?? "barista",
    displayName: overrides.displayName ?? "Demo Barista",
    authorizationStatus: "authorized"
  };
}

export async function fulfillReportApiRoute(
  route: Route,
  mockData: ReportApiMockData = {}
): Promise<boolean> {
  const url = new URL(route.request().url());
  const path = url.pathname.replace(/^\/api/, "");

  if (path === "/staff/session") {
    await fulfillJson(route, mockData.staff ?? reportStaffSession());
    return true;
  }

  if (path === "/reports/sales") {
    await fulfillJson(route, mockData.sales ?? reportSalesResponse());
    return true;
  }

  if (path === "/reports/orders") {
    await fulfillJson(route, mockData.orders ?? reportOrdersResponse());
    return true;
  }

  return false;
}

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}
