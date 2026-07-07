import type {
  MenuCategoriesResponse,
  ReportOrdersQuery,
  ReportOrdersResponse,
  ReportSalesQuery,
  ReportSalesResponse
} from "@coffee-shop/shared/contracts/api";

import { apiClient } from "./apiClient";

export async function getReportSales(query: ReportSalesQuery): Promise<ReportSalesResponse> {
  return apiClient.request<ReportSalesResponse>(`/reports/sales${toQueryString(query)}`);
}

export async function getReportOrders(query: ReportOrdersQuery): Promise<ReportOrdersResponse> {
  return apiClient.request<ReportOrdersResponse>(`/reports/orders${toQueryString(query)}`);
}

export async function getReportFilterOptions(): Promise<MenuCategoriesResponse> {
  return apiClient.request<MenuCategoriesResponse>("/menu/categories");
}

function toQueryString(query: ReportOrdersQuery | ReportSalesQuery): string {
  const params = new URLSearchParams();

  if (query.startDate !== undefined) {
    params.set("startDate", query.startDate);
  }

  if (query.endDate !== undefined) {
    params.set("endDate", query.endDate);
  }

  if (query.period !== undefined) {
    params.set("period", query.period);
  }

  if (query.statuses !== undefined && query.statuses.length > 0) {
    params.set("statuses", query.statuses.join(","));
  }

  if (query.menuCategoryId !== undefined) {
    params.set("menuCategoryId", query.menuCategoryId);
  }

  if (query.menuItemId !== undefined) {
    params.set("menuItemId", query.menuItemId);
  }

  if ("periodKey" in query && query.periodKey !== undefined) {
    params.set("periodKey", query.periodKey);
  }

  if ("combinationKey" in query && query.combinationKey !== undefined) {
    params.set("combinationKey", query.combinationKey);
  }

  return params.size > 0 ? `?${params.toString()}` : "";
}
