import type { QueueOrder } from "@coffee-shop/shared/contracts/api";
import type { Order, OrderWithLoyalty } from "@coffee-shop/shared/domain/types";

import { apiClient } from "./apiClient";

export async function completeBeverage(orderId: string, beverageId: string): Promise<QueueOrder> {
  return apiClient.request<QueueOrder>(`/orders/${orderId}/beverages/${beverageId}/complete`, {
    method: "POST"
  });
}

export async function cancelBeverage(
  orderId: string,
  beverageId: string,
  reason: string
): Promise<QueueOrder> {
  return apiClient.request<QueueOrder>(`/orders/${orderId}/beverages/${beverageId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function completeOrder(orderId: string): Promise<QueueOrder> {
  return apiClient.request<QueueOrder>(`/orders/${orderId}/complete`, {
    method: "POST"
  });
}

export async function confirmPickup(orderId: string): Promise<Order> {
  return apiClient.request<Order>(`/orders/${orderId}/pickup`, {
    method: "POST"
  });
}

export async function cancelLoyaltyReward(orderId: string, rewardId: string): Promise<OrderWithLoyalty> {
  return apiClient.request<OrderWithLoyalty>(`/orders/${orderId}/loyalty-rewards/${rewardId}/cancel`, { method: "POST" });
}
