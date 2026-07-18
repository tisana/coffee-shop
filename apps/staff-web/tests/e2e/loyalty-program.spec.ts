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

test("staff configures and retires a reward from the loyalty page", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    if (await fulfillCsrfToken(route, path)) return;
    if (path === "/loyalty/rewards" && route.request().method() === "POST") {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "reward-new", name: "Free latte", pointsCost: 10, benefitType: "free_beverage", benefitDescription: "One latte free", active: true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }) });
      return;
    }
    if (path === "/loyalty/rewards/reward-new" && route.request().method() === "PATCH") {
      const input = route.request().postDataJSON() as { name?: string; pointsCost?: number; benefitDescription?: string; active?: boolean };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "reward-new", name: input.name ?? "Free latte", pointsCost: input.pointsCost ?? 10, benefitType: "free_beverage", benefitDescription: input.benefitDescription ?? "One latte free", active: input.active ?? true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }) });
      return;
    }
    if (await fulfillLoyaltyApiRoute(route, { rewards: [] })) return;
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "NOT_FOUND", message: `Unhandled test route ${path}` }) });
  });

  await page.goto("/#loyalty");
  await page.getByLabel("Name").fill("Free latte");
  await page.getByLabel("Points cost").fill("10");
  await page.getByLabel("Description").fill("One latte free");
  await page.getByRole("button", { name: "Add reward" }).click();
  await expect(page.getByText("Free latte")).toBeVisible();
  await page.getByRole("button", { name: "Edit Free latte" }).click();
  await page.getByLabel("Edit name").fill("Free iced latte");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Free iced latte")).toBeVisible();
  await page.getByRole("button", { name: "Retire" }).click();
  await expect(page.getByText("Retired", { exact: true })).toBeVisible();
});

test("staff configures calendar-month expiration and sees expired point history", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    if (await fulfillCsrfToken(route, path)) return;
    if (path === "/loyalty/config/expiration-policy" && route.request().method() === "PUT") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "expiry-3", enabled: true, expirationMonths: 3, active: true, effectiveAt: "2026-07-01T00:00:00.000Z", retiredAt: null }) });
      return;
    }
    if (await fulfillLoyaltyApiRoute(route)) return;
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "NOT_FOUND", message: `Unhandled test route ${path}` }) });
  });

  await page.goto("/#loyalty");
  await page.getByRole("radio", { name: "Expire points" }).check();
  await page.getByLabel("Expiration months").fill("3");
  await page.getByRole("button", { name: "Save expiration policy" }).click();
  await expect(page.getByText("Points earned in July 2026 remain valid through October 31, 2026.")).toBeVisible();
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  await expect(page.getByLabel("Point history")).toContainText("Expires: 2026-10-31");
});
