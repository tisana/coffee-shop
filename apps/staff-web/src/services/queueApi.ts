import type { QueueOrder, QueueOrdersResponse } from "@coffee-shop/shared/contracts/api";

import { apiClient } from "./apiClient";

export async function getQueueOrders(): Promise<QueueOrdersResponse> {
  return apiClient.request<QueueOrdersResponse>("/queue/orders");
}

export async function claimQueueOrder(orderId: string): Promise<QueueOrder> {
  return apiClient.request<QueueOrder>(`/queue/orders/${orderId}/claim`, {
    method: "POST"
  });
}
