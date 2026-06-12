import type {
  MenuCategoriesResponse,
  MenuItemInput,
  MenuItemResponse
} from "@coffee-shop/shared/contracts/api";

import { apiClient } from "./apiClient";

export async function getMenuMaintenanceCatalog(): Promise<MenuCategoriesResponse> {
  return apiClient.request<MenuCategoriesResponse>("/menu/categories");
}

export async function createMenuItem(request: MenuItemInput): Promise<MenuItemResponse> {
  return apiClient.request<MenuItemResponse>("/menu/items", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

export async function updateMenuItem(
  itemId: string,
  request: MenuItemInput
): Promise<MenuItemResponse> {
  return apiClient.request<MenuItemResponse>(`/menu/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(request)
  });
}

export async function deleteMenuItem(itemId: string): Promise<MenuItemResponse> {
  return apiClient.request<MenuItemResponse>(`/menu/items/${itemId}`, {
    method: "DELETE"
  });
}
