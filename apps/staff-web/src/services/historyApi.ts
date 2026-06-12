import type { OrderHistoryQuery, OrderHistoryResponse } from "@coffee-shop/shared/contracts/api";

import { apiClient } from "./apiClient";

export async function getOrderHistory(query: OrderHistoryQuery): Promise<OrderHistoryResponse> {
  const params = new URLSearchParams();

  if (query.dailyOrderNumber !== undefined) {
    params.set("dailyOrderNumber", String(query.dailyOrderNumber));
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.pickupName) {
    params.set("pickupName", query.pickupName);
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  return apiClient.request<OrderHistoryResponse>(`/orders/history${suffix}`);
}
