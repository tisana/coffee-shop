import { expect, test } from "@playwright/test";

import type { LoyaltyEarningRule, MenuCategory, OrderWithLoyalty } from "@coffee-shop/shared/domain/types";

import { fulfillCsrfToken, fulfillLoyaltyApiRoute } from "./testApiMocks";
import {
  loyaltyCustomer,
  loyaltyPointHistoryEntry,
  loyaltyPointsResponse,
  loyaltyRewardOption
} from "../../src/test/loyaltyTestData";

const loyaltyMenuIds = {
  category: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  item: "2d20d6c7-337e-4216-a900-b7dcdf4fc2eb",
  group: "8a7ea15d-9d7f-4d95-859d-5eb0c5a40f4f",
  choice: "91e6d2ab-5519-4a2d-b5f7-c8cf38b5a1f0"
};

function loyaltyMenu(): MenuCategory[] {
  return [
    {
      id: loyaltyMenuIds.category,
      name: "Coffee",
      displayOrder: 1,
      active: true,
      menuItems: [
        {
          id: loyaltyMenuIds.item,
          categoryId: loyaltyMenuIds.category,
          name: "Latte",
          description: "Espresso with steamed milk",
          imageUrl: "https://cdn.example.test/menu/loyalty-latte.jpg",
          price: "4.50",
          available: true,
          active: true,
          displayOrder: 1,
          customizationGroups: [
            {
              id: loyaltyMenuIds.group,
              menuItemId: loyaltyMenuIds.item,
              name: "Milk",
              required: true,
              minSelections: 1,
              maxSelections: 1,
              displayOrder: 1,
              active: true,
              choices: [
                {
                  id: loyaltyMenuIds.choice,
                  customizationGroupId: loyaltyMenuIds.group,
                  name: "Oat Milk",
                  priceAdjustment: "0.75",
                  available: true,
                  active: true,
                  displayOrder: 1
                }
              ]
            }
          ]
        }
      ]
    }
  ];
}

async function fulfillJson(
  route: Parameters<typeof fulfillLoyaltyApiRoute>[0],
  body: unknown,
  status = 200
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

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

test("October points expire lazily on November 1 and cannot be redeemed", async ({ page }) => {
  const customer = loyaltyCustomer();
  const earned = loyaltyPointHistoryEntry({
    id: "earned-october-cutoff",
    pointsDelta: 10,
    reason: "Earned from order #17.",
    expirationBusinessDate: "2026-10-31"
  });
  const octoberPoints = loyaltyPointsResponse({
    customer,
    asOfBusinessDate: "2026-10-31",
    summary: { available: 10, lifetimeEarned: 10 },
    history: [earned]
  });
  const novemberPoints = loyaltyPointsResponse({
    customer,
    asOfBusinessDate: "2026-11-01",
    summary: { available: 0, lifetimeEarned: 10, expired: 10 },
    history: [
      loyaltyPointHistoryEntry({
        id: "expired-october-cutoff",
        eventType: "expired",
        pointsDelta: -10,
        reason: "Expired 10 points after 2026-10-31.",
        businessDate: "2026-11-01",
        expirationBusinessDate: "2026-10-31",
        orderId: null,
        orderLabel: null,
        occurredAt: "2026-11-01T00:00:00.000Z"
      }),
      earned
    ]
  });
  let pointReads = 0;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    if (await fulfillCsrfToken(route, path)) return;
    if (path === `/loyalty/customers/${customer.id}/points`) {
      pointReads += 1;
      await fulfillJson(route, pointReads === 1 ? octoberPoints : novemberPoints);
      return;
    }
    if (path === "/menu/categories") {
      await fulfillJson(route, { categories: loyaltyMenu() });
      return;
    }
    if (await fulfillLoyaltyApiRoute(route, {
      customer,
      customers: [customer],
      rewards: [loyaltyRewardOption({ pointsCost: 10 })]
    })) return;
    await fulfillJson(route, { code: "NOT_FOUND", message: `Unhandled test route ${path}` }, 404);
  });

  await page.goto("/#loyalty");
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  const history = page.getByLabel("Point history");
  await expect(history.getByText("Available points").locator("..")).toContainText("10");
  await expect(history).toContainText("Expires: 2026-10-31");

  await page.getByRole("button", { name: "Clear selection" }).click();
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  await expect(history.getByText("Available points").locator("..")).toContainText("0");
  await expect(history.getByText("Expired", { exact: true }).locator("..")).toContainText("10");
  await expect(history).toContainText("Expired 10 points after 2026-10-31.");
  await expect(history).toContainText("Earned from order #17.");

  await page.getByRole("link", { name: "Counter Order" }).click();
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  await page.getByRole("button", { name: "Customize & add" }).click();
  await expect(page.getByRole("option", { name: "Free beverage (10 pts)" })).toHaveAttribute("disabled", "");
  await expect(page.getByText("Free beverage: 10 more points needed.")).toBeVisible();
});

test("associated orders earn by amount and by non-cancelled beverage count", async ({ page }) => {
  test.setTimeout(60_000);
  const customer = loyaltyCustomer();
  let rule: LoyaltyEarningRule = {
    id: "rule-amount",
    earningType: "purchase_amount" as const,
    amountThreshold: "10.00",
    beverageCountThreshold: null,
    pointsAwarded: 1,
    active: true,
    effectiveAt: "2026-07-01T00:00:00.000Z",
    retiredAt: null
  };
  let points = loyaltyPointsResponse({
    customer,
    summary: { available: 0, lifetimeEarned: 0 },
    history: []
  });
  let activeOrder: OrderWithLoyalty | null = null;
  let nextOrderNumber = 51;

  function createOrder(
    requestBody: { beverages: Array<{ quantity: number }>; loyalty?: { customerId?: string } },
    dailyOrderNumber: number
  ): OrderWithLoyalty {
    const id = `00000000-0000-4000-8000-${dailyOrderNumber.toString().padStart(12, "0")}`;
    const createdAt = "2026-07-01T09:00:00.000Z";
    const beverages = requestBody.beverages.map((beverage, index) => ({
      id: `${id.slice(0, -2)}${(index + 1).toString().padStart(2, "0")}`,
      orderId: id,
      sourceMenuItemId: loyaltyMenuIds.item,
      nameSnapshot: "Latte",
      quantity: beverage.quantity,
      priceSnapshot: "5.25",
      selectedCustomizationsSnapshot: [{ groupName: "Milk", choices: [{ choiceName: "Oat Milk", priceAdjustment: "0.75" }] }],
      specialInstructions: null,
      status: "pending" as const,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null
    }));
    const total = beverages.reduce((sum, beverage) => sum + Number(beverage.priceSnapshot) * beverage.quantity, 0).toFixed(2);
    return {
      id,
      businessDate: "2026-07-01",
      dailyOrderNumber,
      pickupName: "Ari",
      status: "created",
      createdByStaffId: "0a1b2c3d-4e5f-4000-8000-000000000002",
      assignedBaristaId: null,
      assignedBaristaDisplayName: null,
      total,
      loyaltyRewardDiscountTotal: "0.00",
      payableTotal: total,
      createdAt,
      queuedAt: null,
      inProgressAt: null,
      completedAt: null,
      pickedUpAt: null,
      cancelledAt: null,
      beverages,
      loyalty: { customer, rewards: [] }
    };
  }

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    if (await fulfillCsrfToken(route, path)) return;
    if (path === "/menu/categories") {
      await fulfillJson(route, { categories: loyaltyMenu() });
      return;
    }
    if (path === "/loyalty/config/earning-rule") {
      if (route.request().method() === "PUT") {
        const input = route.request().postDataJSON() as { earningType: "purchase_amount" | "beverage_count"; amountThreshold?: string; beverageCountThreshold?: number; pointsAwarded: number };
        rule = {
          id: "rule-beverage",
          earningType: input.earningType,
          amountThreshold: input.amountThreshold ?? null,
          beverageCountThreshold: input.beverageCountThreshold ?? null,
          pointsAwarded: input.pointsAwarded,
          active: true,
          effectiveAt: "2026-07-01T10:00:00.000Z",
          retiredAt: null
        };
        await fulfillJson(route, rule);
      } else {
        await fulfillJson(route, { rule });
      }
      return;
    }
    if (path === `/loyalty/customers/${customer.id}/points`) {
      await fulfillJson(route, points);
      return;
    }
    if (path === "/orders" && route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { beverages: Array<{ quantity: number }>; loyalty?: { customerId?: string } };
      expect(body.loyalty?.customerId).toBe(customer.id);
      activeOrder = createOrder(body, nextOrderNumber++);
      await fulfillJson(route, activeOrder, 201);
      return;
    }
    if (activeOrder && path === `/orders/${activeOrder.id}/queue`) {
      activeOrder = { ...activeOrder, status: "queued", queuedAt: "2026-07-01T09:01:00.000Z" };
      await fulfillJson(route, activeOrder);
      return;
    }
    if (path === "/queue/orders") {
      await fulfillJson(route, { orders: activeOrder ? [activeOrder] : [] });
      return;
    }
    if (activeOrder && path === `/queue/orders/${activeOrder.id}/claim`) {
      activeOrder = { ...activeOrder, status: "in_progress", assignedBaristaId: "0a1b2c3d-4e5f-4000-8000-000000000002", assignedBaristaDisplayName: "Demo Barista", inProgressAt: "2026-07-01T09:02:00.000Z" };
      await fulfillJson(route, activeOrder);
      return;
    }
    const beverageAction = activeOrder ? path.match(new RegExp(`^/orders/${activeOrder.id}/beverages/([^/]+)/(complete|cancel)$`)) : null;
    if (activeOrder && beverageAction) {
      const [, beverageId, action] = beverageAction;
      activeOrder = {
        ...activeOrder,
        beverages: activeOrder.beverages.map((beverage) => beverage.id === beverageId ? {
          ...beverage,
          status: action === "complete" ? "completed" : "cancelled",
          completedAt: action === "complete" ? "2026-07-01T09:03:00.000Z" : null,
          cancelledAt: action === "cancel" ? "2026-07-01T09:03:00.000Z" : null,
          cancellationReason: action === "cancel" ? "Unavailable" : null
        } : beverage)
      };
      await fulfillJson(route, activeOrder);
      return;
    }
    if (activeOrder && path === `/orders/${activeOrder.id}/complete`) {
      const awarded = activeOrder.dailyOrderNumber === 51 ? 2 : 2;
      const historyEntry = loyaltyPointHistoryEntry({
        id: `earned-${activeOrder.dailyOrderNumber}`,
        pointsDelta: awarded,
        reason: activeOrder.dailyOrderNumber === 51
          ? "Earned 2 points from $26.25 eligible purchase amount."
          : "Earned 2 points from 2 non-cancelled beverages.",
        orderId: activeOrder.id,
        orderLabel: `2026-07-01 #${activeOrder.dailyOrderNumber}`,
        expirationBusinessDate: null
      });
      points = loyaltyPointsResponse({
        customer,
        summary: {
          ...points.summary,
          available: points.summary.available + awarded,
          lifetimeEarned: points.summary.lifetimeEarned + awarded
        },
        history: [...points.history, historyEntry]
      });
      activeOrder = { ...activeOrder, status: "completed", completedAt: "2026-07-01T09:04:00.000Z" };
      await fulfillJson(route, activeOrder);
      return;
    }
    if (await fulfillLoyaltyApiRoute(route, { customer, customers: [customer], rewards: [] })) return;
    await fulfillJson(route, { code: "NOT_FOUND", message: `Unhandled test route ${path}` }, 404);
  });

  await page.goto("/#counter");
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: "Increase quantity" }).click();
  }
  await page.getByRole("button", { name: "Customize & add" }).click();
  await expect(page.getByText("This order will earn 2 points when completed.")).toBeVisible();
  await page.getByRole("button", { name: "Create and queue order" }).click();
  await page.getByRole("link", { name: "Orders" }).click();
  await page.getByRole("button", { name: "Claim order #51" }).click();
  await page.getByRole("button", { name: "Complete Latte" }).click();
  await page.getByRole("button", { name: "Mark order #51 ready for pickup" }).click();

  await page.getByRole("link", { name: "Loyalty" }).click();
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  await expect(page.getByLabel("Point history")).toContainText("Earned 2 points from $26.25 eligible purchase amount.");

  await page.getByRole("radio", { name: "Beverage count" }).check();
  await page.getByRole("spinbutton", { name: "Beverage count" }).fill("1");
  await page.getByRole("button", { name: "Save earning rule" }).click();
  await page.getByRole("link", { name: "Counter Order" }).click();
  await expect(page.getByRole("heading", { name: "Counter order" })).toBeVisible();
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "Customize & add" }).click();
  }
  await page.getByRole("button", { name: "Create and queue order" }).click();
  await page.getByRole("link", { name: "Orders" }).click();
  await page.getByRole("button", { name: "Claim order #52" }).click();
  await page.getByRole("button", { name: "Cancel Latte" }).first().click();
  while (await page.getByRole("button", { name: "Complete Latte" }).count()) {
    await page.getByRole("button", { name: "Complete Latte" }).first().click();
  }
  await page.getByRole("button", { name: "Mark order #52 ready for pickup" }).click();

  await page.getByRole("link", { name: "Loyalty" }).click();
  await expect(page.getByRole("heading", { name: "Loyalty" })).toBeVisible();
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  const history = page.getByLabel("Point history");
  await expect(history).toContainText("2026-07-01 #51");
  await expect(history).toContainText("Earned 2 points from 2 non-cancelled beverages.");
  await expect(history.getByText("Available points").locator("..")).toContainText("4");
});

test("reward redemption, standalone cancellation, and target cancellation return exact points", async ({ page }) => {
  const customer = loyaltyCustomer();
  const reward = loyaltyRewardOption({ pointsCost: 10 });
  let points = loyaltyPointsResponse({
    customer,
    summary: { available: 12, lifetimeEarned: 12 },
    history: [loyaltyPointHistoryEntry({ pointsDelta: 12 })]
  });
  let activeOrder: OrderWithLoyalty | null = null;
  let redemptionNumber = 0;

  function returnReward(reason: string): void {
    if (!activeOrder?.loyalty) return;
    const applied = activeOrder.loyalty.rewards[0];
    if (!applied || applied.status === "returned") return;
    activeOrder = {
      ...activeOrder,
      loyaltyRewardDiscountTotal: "0.00",
      payableTotal: activeOrder.total,
      loyalty: {
        ...activeOrder.loyalty,
        rewards: [{ ...applied, status: "returned" }]
      }
    };
    points = loyaltyPointsResponse({
      customer,
      summary: {
        ...points.summary,
        available: points.summary.available + applied.pointsCost,
        returned: points.summary.returned + applied.pointsCost
      },
      history: [
        ...points.history,
        loyaltyPointHistoryEntry({
          id: `returned-${redemptionNumber}`,
          eventType: "returned",
          pointsDelta: applied.pointsCost,
          reason,
          orderId: activeOrder.id,
          orderLabel: `2026-07-01 #${activeOrder.dailyOrderNumber}`,
          rewardName: applied.name
        })
      ]
    });
  }

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    if (await fulfillCsrfToken(route, path)) return;
    if (path === "/menu/categories") {
      await fulfillJson(route, { categories: loyaltyMenu() });
      return;
    }
    if (path === `/loyalty/customers/${customer.id}/points`) {
      await fulfillJson(route, points);
      return;
    }
    if (path === "/orders" && route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { loyalty?: { customerId?: string; rewards?: Array<{ rewardOptionId: string; targetBeverageIndex: number }> } };
      expect(body.loyalty).toMatchObject({
        customerId: customer.id,
        rewards: [{ rewardOptionId: reward.id, targetBeverageIndex: 0 }]
      });
      redemptionNumber += 1;
      const orderId = `10000000-0000-4000-8000-${redemptionNumber.toString().padStart(12, "0")}`;
      const dailyOrderNumber = 60 + redemptionNumber;
      activeOrder = {
        id: orderId,
        businessDate: "2026-07-01",
        dailyOrderNumber,
        pickupName: "Ari",
        status: "created",
        createdByStaffId: "0a1b2c3d-4e5f-4000-8000-000000000002",
        assignedBaristaId: null,
        assignedBaristaDisplayName: null,
        total: "5.25",
        loyaltyRewardDiscountTotal: "5.25",
        payableTotal: "0.00",
        createdAt: "2026-07-01T09:00:00.000Z",
        queuedAt: null,
        inProgressAt: null,
        completedAt: null,
        pickedUpAt: null,
        cancelledAt: null,
        beverages: [{ id: `beverage-${redemptionNumber}`, orderId, sourceMenuItemId: loyaltyMenuIds.item, nameSnapshot: "Latte", quantity: 1, priceSnapshot: "5.25", selectedCustomizationsSnapshot: [{ groupName: "Milk", choices: [{ choiceName: "Oat Milk", priceAdjustment: "0.75" }] }], specialInstructions: null, status: "pending", completedAt: null, cancelledAt: null, cancellationReason: null }],
        loyalty: {
          customer,
          rewards: [{ id: `redemption-${redemptionNumber}`, name: reward.name, pointsCost: reward.pointsCost, benefitType: reward.benefitType, targetDescription: "Latte", coveredAmount: "5.25", status: "active" }]
        }
      };
      points = loyaltyPointsResponse({
        customer,
        summary: {
          ...points.summary,
          available: points.summary.available - reward.pointsCost,
          redeemed: points.summary.redeemed + reward.pointsCost
        },
        history: [
          ...points.history,
          loyaltyPointHistoryEntry({ id: `redeemed-${redemptionNumber}`, eventType: "redeemed", pointsDelta: -reward.pointsCost, reason: `Redeemed ${reward.name}.`, orderId, orderLabel: `2026-07-01 #${dailyOrderNumber}`, rewardName: reward.name })
        ]
      });
      await fulfillJson(route, activeOrder, 201);
      return;
    }
    if (activeOrder && path === `/orders/${activeOrder.id}/queue`) {
      activeOrder = { ...activeOrder, status: "queued", queuedAt: "2026-07-01T09:01:00.000Z" };
      await fulfillJson(route, activeOrder);
      return;
    }
    if (activeOrder?.loyalty && path === `/orders/${activeOrder.id}/loyalty-rewards/${activeOrder.loyalty.rewards[0]?.id}/cancel`) {
      returnReward("Returned points after standalone reward cancellation.");
      await fulfillJson(route, activeOrder);
      return;
    }
    if (path === "/queue/orders") {
      await fulfillJson(route, { orders: activeOrder ? [activeOrder] : [] });
      return;
    }
    if (activeOrder && path === `/queue/orders/${activeOrder.id}/claim`) {
      activeOrder = { ...activeOrder, status: "in_progress", assignedBaristaId: "0a1b2c3d-4e5f-4000-8000-000000000002", assignedBaristaDisplayName: "Demo Barista", inProgressAt: "2026-07-01T09:02:00.000Z" };
      await fulfillJson(route, activeOrder);
      return;
    }
    if (activeOrder && path === `/orders/${activeOrder.id}/beverages/${activeOrder.beverages[0]?.id}/cancel`) {
      returnReward("Returned points after the rewarded beverage was cancelled.");
      activeOrder = {
        ...activeOrder,
        beverages: activeOrder.beverages.map((beverage) => ({ ...beverage, status: "cancelled", cancelledAt: "2026-07-01T09:03:00.000Z", cancellationReason: "Unavailable" }))
      };
      await fulfillJson(route, activeOrder);
      return;
    }
    if (await fulfillLoyaltyApiRoute(route, { customer, customers: [customer], rewards: [reward] })) return;
    await fulfillJson(route, { code: "NOT_FOUND", message: `Unhandled test route ${path}` }, 404);
  });

  async function selectCustomerAndAddLatte(): Promise<void> {
    await page.getByLabel("Search customers").fill("Ari");
    await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
    await page.getByRole("button", { name: "Customize & add" }).click();
  }

  await page.goto("/#counter");
  await selectCustomerAndAddLatte();
  await page.getByLabel("1x Latte").selectOption(reward.id);
  await page.getByRole("button", { name: "Create and queue order" }).click();
  const createdBanner = page.locator(".order-created-banner");
  await expect(createdBanner.getByText("Free beverage", { exact: true })).toBeVisible();
  await expect(createdBanner.getByText("$0.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel Free beverage" }).click();
  await expect(createdBanner.getByText("Free beverage (Returned)", { exact: true })).toBeVisible();
  await expect(createdBanner.getByText("$5.25", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Loyalty" }).click();
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  let history = page.getByLabel("Point history");
  await expect(history.getByText("Available points").locator("..")).toContainText("12");
  await expect(history).toContainText("Returned points after standalone reward cancellation.");

  await page.getByRole("link", { name: "Counter Order" }).click();
  await selectCustomerAndAddLatte();
  await page.getByLabel("1x Latte").selectOption(reward.id);
  await page.getByRole("button", { name: "Create and queue order" }).click();
  await page.getByRole("link", { name: "Counter Order" }).click();
  await selectCustomerAndAddLatte();
  await expect(page.getByRole("option", { name: "Free beverage (10 pts)" })).toHaveAttribute("disabled", "");
  await expect(page.getByText("Free beverage: 8 more points needed.")).toBeVisible();

  await page.getByRole("link", { name: "Orders" }).click();
  await page.getByRole("button", { name: "Claim order #62" }).click();
  await page.getByRole("button", { name: "Cancel Latte" }).click();
  await expect(page.getByText("Free beverage (Returned): Latte | Payable $5.25")).toBeVisible();

  await page.getByRole("link", { name: "Loyalty" }).click();
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  history = page.getByLabel("Point history");
  await expect(history.getByText("Available points").locator("..")).toContainText("12");
  await expect(history.getByText("Returned").locator("..").first()).toContainText("20");
  await expect(history).toContainText("Returned points after the rewarded beverage was cancelled.");
});

test("a stale redemption conflict refreshes the balance and disables the reward", async ({ page }) => {
  const customer = loyaltyCustomer();
  const reward = loyaltyRewardOption({ pointsCost: 10 });
  let points = loyaltyPointsResponse({ customer, summary: { available: 12, lifetimeEarned: 12 } });

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    if (await fulfillCsrfToken(route, path)) return;
    if (path === "/menu/categories") {
      await fulfillJson(route, { categories: loyaltyMenu() });
      return;
    }
    if (path === `/loyalty/customers/${customer.id}/points`) {
      await fulfillJson(route, points);
      return;
    }
    if (path === "/orders" && route.request().method() === "POST") {
      points = loyaltyPointsResponse({ customer, summary: { available: 2, lifetimeEarned: 12, redeemed: 10 } });
      await fulfillJson(route, { code: "LOYALTY_REWARD_CONFLICT", message: "The loyalty balance changed. Refresh rewards and try again." }, 409);
      return;
    }
    if (await fulfillLoyaltyApiRoute(route, { customer, customers: [customer], rewards: [reward] })) return;
    await fulfillJson(route, { code: "NOT_FOUND", message: `Unhandled test route ${path}` }, 404);
  });

  await page.goto("/#counter");
  await page.getByLabel("Search customers").fill("Ari");
  await page.getByRole("button", { name: "Select Ari Srisuk" }).click();
  await page.getByRole("button", { name: "Customize & add" }).click();
  await page.getByLabel("1x Latte").selectOption(reward.id);
  await page.getByRole("button", { name: "Create and queue order" }).click();
  await expect(page.getByText("The loyalty balance changed. Refresh rewards and try again.")).toBeVisible();
  await expect(page.getByRole("option", { name: "Free beverage (10 pts)" })).toHaveAttribute("disabled", "");
  await expect(page.getByText("Free beverage: 8 more points needed.")).toBeVisible();
});

test("loyalty and counter controls remain labelled, focusable, and contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    if (await fulfillCsrfToken(route, path)) return;
    if (path === "/menu/categories") {
      await fulfillJson(route, { categories: loyaltyMenu() });
      return;
    }
    if (await fulfillLoyaltyApiRoute(route)) return;
    await fulfillJson(route, { code: "NOT_FOUND", message: `Unhandled test route ${path}` }, 404);
  });

  await page.goto("/#loyalty");
  const loyaltyLink = page.getByRole("link", { name: "Loyalty" });
  await loyaltyLink.focus();
  await expect(loyaltyLink).toBeFocused();
  await expect(loyaltyLink).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Search staff workspace")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole("link", { name: "Counter Order" }).click();
  await expect(page.getByRole("heading", { name: "Counter order" })).toBeVisible();
  await expect(page.getByLabel("Search customers")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create and queue order" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
