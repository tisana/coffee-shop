import type {
  LoyaltyCustomerInput,
  LoyaltyCustomerSearchResponse,
  LoyaltyCustomerUpdate
} from "@coffee-shop/shared/contracts/api";
import type { LoyaltyCustomer } from "@coffee-shop/shared/domain/types";

import { apiClient } from "./apiClient";

export async function searchLoyaltyCustomers(query: string): Promise<LoyaltyCustomer[]> {
  const response = await apiClient.request<LoyaltyCustomerSearchResponse>(
    `/loyalty/customers?query=${encodeURIComponent(query)}`
  );
  return response.customers;
}

export function createLoyaltyCustomer(input: LoyaltyCustomerInput): Promise<LoyaltyCustomer> {
  return apiClient.request("/loyalty/customers", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateLoyaltyCustomer(
  customerId: string,
  input: LoyaltyCustomerUpdate
): Promise<LoyaltyCustomer> {
  return apiClient.request(`/loyalty/customers/${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}
