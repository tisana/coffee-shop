import type { Route } from "@playwright/test";

export async function fulfillCsrfToken(route: Route, path: string): Promise<boolean> {
  if (path !== "/auth/csrf-token") {
    return false;
  }

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ csrfToken: "test-csrf-token" })
  });
  return true;
}
