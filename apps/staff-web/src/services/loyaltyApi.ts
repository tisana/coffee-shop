import type {
  LoyaltyEarningRuleInput,
  LoyaltyEarningRuleResponse,
  LoyaltyCustomerInput,
  LoyaltyCustomerSearchResponse,
  LoyaltyPointsResponse,
  LoyaltyCustomerUpdate
} from "@coffee-shop/shared/contracts/api";
import type { LoyaltyCustomer, LoyaltyEarningRule } from "@coffee-shop/shared/domain/types";

import { apiClient } from "./apiClient";

export interface LoyaltyPhoneRegionResponse {
  region: string;
}

export function getLoyaltyPhoneRegion(): Promise<LoyaltyPhoneRegionResponse> {
  return apiClient.request("/loyalty/phone-region");
}

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

export async function getLoyaltyEarningRule(): Promise<LoyaltyEarningRule | null> {
  const response = await apiClient.request<LoyaltyEarningRuleResponse>("/loyalty/config/earning-rule");
  return response.rule;
}

export function replaceLoyaltyEarningRule(input: LoyaltyEarningRuleInput): Promise<LoyaltyEarningRule> {
  return apiClient.request("/loyalty/config/earning-rule", { method: "PUT", body: JSON.stringify(input) });
}

export function getLoyaltyPoints(customerId: string): Promise<LoyaltyPointsResponse> {
  return apiClient.request(`/loyalty/customers/${customerId}/points`);
}
