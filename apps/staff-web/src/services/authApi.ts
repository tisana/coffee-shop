import type { CurrentSessionResponse, LoginRequest } from "@coffee-shop/shared/contracts/api";

import { apiClient } from "./apiClient";

export async function login(request: LoginRequest): Promise<void> {
  await apiClient.request<void>("/auth/login", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

export async function logout(): Promise<void> {
  await apiClient.request<void>("/auth/logout", {
    method: "POST"
  });
}

export async function getCurrentSession(): Promise<CurrentSessionResponse> {
  return apiClient.request<CurrentSessionResponse>("/staff/session");
}
