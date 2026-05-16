import type { QueueOrdersResponse } from "@coffee-shop/shared/contracts/api";
import type { Order } from "@coffee-shop/shared/domain/types";

import { apiClient } from "./apiClient";

export async function getQueueOrders(): Promise<QueueOrdersResponse> {
  return apiClient.request<QueueOrdersResponse>("/queue/orders");
}

export async function claimQueueOrder(orderId: string): Promise<Order> {
  return apiClient.request<Order>(`/queue/orders/${orderId}/claim`, {
    method: "POST"
  });
}
