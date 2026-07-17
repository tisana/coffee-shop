import type {
  CreateOrderWithLoyaltyRequest,
  MenuCategoriesResponse
} from "@coffee-shop/shared/contracts/api";

import type { Order, OrderWithLoyalty } from "@coffee-shop/shared/domain/types";

import { apiClient } from "./apiClient";

export async function getOrderTakingMenu(): Promise<MenuCategoriesResponse> {
  return apiClient.request<MenuCategoriesResponse>("/menu/categories");
}

export async function createCounterOrder(request: CreateOrderWithLoyaltyRequest): Promise<OrderWithLoyalty> {
  return apiClient.request<OrderWithLoyalty>("/orders", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

export async function submitOrderToQueue(orderId: string): Promise<Order> {
  return apiClient.request<Order>(`/orders/${orderId}/queue`, {
    method: "POST"
  });
}
