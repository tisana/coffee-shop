import { expect, test } from "@playwright/test";

import { fulfillCsrfToken, fulfillLoyaltyApiRoute } from "./testApiMocks";

test("staff configures an earning rule and reads customer point history", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    if (await fulfillCsrfToken(route, path)) return;
    if (path === "/loyalty/config/earning-rule" && route.request().method() === "PUT") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "rule-amount", earningType: "purchase_amount", amountThreshold: "10.00", beverageCountThreshold: null, pointsAwarded: 1, active: true, effectiveAt: "2026-07-01T09:00:00.000Z", retiredAt: null }) });
      return;
    }
    if (await fulfillLoyaltyApiRoute(route)) return;
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "NOT_FOUND", message: `Unhandled test route ${path}` }) });
  });

  await page.goto("/#loyalty");
  await page.getByRole("button", { name: "Save earning rule" }).click();
  await expect(page.getByText("Active: 1 point per $10.00 purchase amount.")).toBeVisible();
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  await expect(page.getByLabel("Point history")).toContainText("2026-07-01 #17");
});

test("staff registers, looks up, and edits a loyalty customer from the existing staff shell", async ({ page }) => {
  let ninaEmailRegistered = false;

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");

    if (await fulfillCsrfToken(route, path)) {
      return;
    }

    if (path === "/loyalty/phone-region") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ region: "TH" }) });
      return;
    }

    if (path === "/loyalty/customers" && route.request().method() === "POST") {
      const input = route.request().postDataJSON() as { phone?: string; email?: string | null };
      if (input.phone?.startsWith("0066")) {
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ code: "CONFLICT", message: "Phone number already belongs to a customer." }) });
        return;
      }
      if (input.phone === "invalid") {
        await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "BAD_REQUEST", message: "Phone number must be valid for the configured shop region." }) });
        return;
      }
      if (input.email?.trim().toLowerCase() === "nina@example.test" && ninaEmailRegistered) {
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ code: "CONFLICT", message: "Email address already belongs to a customer." }) });
        return;
      }
      if (input.email?.trim().toLowerCase() === "nina@example.test") {
        ninaEmailRegistered = true;
      }
    }

    if (path.startsWith("/loyalty/customers/") && route.request().method() === "PATCH") {
      const input = route.request().postDataJSON() as { email?: string | null };
      if (input.email?.trim().toLowerCase() === "nina@example.test") {
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ code: "CONFLICT", message: "Email address already belongs to a customer." }) });
        return;
      }
    }

    if (await fulfillLoyaltyApiRoute(route)) {
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", message: `Unhandled test route ${path}` })
    });
  });

  await page.goto("/#loyalty");

  await expect(page.getByRole("heading", { name: "Loyalty" })).toBeVisible();
  await page.getByRole("button", { name: "Register customer" }).click();
  await expect(page.getByText("Thailand (TH): enter a local number such as 081 234 5678.")).toBeVisible();
  await page.getByLabel("Customer name").fill("Nina Saelim");
  await page.getByLabel("Phone number").fill("081-234-5678");
  await page.getByLabel("Email address").fill("Nina@Example.test");
  await page.getByRole("button", { name: "Save customer" }).click();

  const profile = page.getByLabel("Customer profile");
  await expect(profile.getByRole("heading", { name: "Nina Saelim" })).toBeVisible();
  await page.getByLabel("Search customers").fill("081");
  await expect(page.getByRole("button", { name: "Select Ari Srisuk" })).toBeVisible();
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  await expect(profile.getByText("081-234-5678")).toBeVisible();

  await page.getByRole("button", { name: "Edit customer" }).click();
  await page.getByLabel("Phone number").fill("082-234-5678");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(profile.getByText("082-234-5678")).toBeVisible();

  await page.getByRole("button", { name: "Register customer" }).click();
  await page.getByLabel("Customer name").fill("Duplicate Nina");
  await page.getByLabel("Phone number").fill("0066 81-234-5678");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Phone number already belongs to a customer.")).toBeVisible();

  await page.getByLabel("Phone number").fill("083-234-5678");
  await page.getByLabel("Email address").fill(" nina@example.test ");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Email address already belongs to a customer.")).toBeVisible();
  await expect(page.getByLabel("Customer name")).toHaveValue("Duplicate Nina");
  await expect(page.getByLabel("Phone number")).toHaveValue("083-234-5678");

  await page.getByLabel("Email address").fill("not-an-email");
  expect(await page.getByLabel("Email address").evaluate((input) => input.checkValidity())).toBe(false);

  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  await page.getByRole("button", { name: "Edit customer" }).click();
  await profile.getByLabel("Email address").fill("NINA@example.test");
  await profile.getByRole("button", { name: "Save changes" }).click();
  await expect(profile.getByText("Email address already belongs to a customer.")).toBeVisible();
  await expect(profile.getByRole("heading", { name: "Ari Srisuk" })).toBeVisible();
  await expect(profile.getByLabel("Email address")).toHaveValue("NINA@example.test");
});
