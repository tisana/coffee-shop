import { expect, test } from "@playwright/test";

import type { OrderHistoryResponse } from "@coffee-shop/shared/contracts/api";
import type { Order } from "@coffee-shop/shared/domain/types";

const createdAt = "2026-05-30T15:42:00.000Z";
const staffId = "5e2a85b5-30e5-4b37-9b7c-122229476d62";

function historyOrder(overrides: Partial<Order>): Order {
  return {
    id: overrides.id ?? "6d8d6e6a-86d4-4f2f-b472-a7f96917908b",
    businessDate: createdAt.slice(0, 10),
    dailyOrderNumber: overrides.dailyOrderNumber ?? 44,
    pickupName: overrides.pickupName ?? "Lena Ortiz",
    status: overrides.status ?? "picked_up",
    createdByStaffId: staffId,
    assignedBaristaId: staffId,
    total: "5.25",
    createdAt,
    queuedAt: createdAt,
    inProgressAt: createdAt,
    completedAt: createdAt,
    pickedUpAt: createdAt,
    cancelledAt: null,
    beverages: [
      {
        id: "7555deef-07d8-42fd-a51e-c38f204283ea",
        orderId: overrides.id ?? "6d8d6e6a-86d4-4f2f-b472-a7f96917908b",
        sourceMenuItemId: "2d20d6c7-337e-4216-a900-b7dcdf4fc2eb",
        nameSnapshot: "Latte",
        quantity: 1,
        priceSnapshot: "5.25",
        selectedCustomizationsSnapshot: [
          {
            groupName: "Milk",
            choices: [{ choiceName: "Oat Milk", priceAdjustment: "0.75" }]
          }
        ],
        specialInstructions: "Extra hot",
        status: "completed",
        completedAt: createdAt,
        cancelledAt: null,
        cancellationReason: null
      }
    ]
  };
}

test("staff searches current-day activity by number, status, and pickup name", async ({
  page
}) => {
  const fullHistory: OrderHistoryResponse = {
    orders: [
      historyOrder({ id: "6d8d6e6a-86d4-4f2f-b472-a7f96917908b", dailyOrderNumber: 44 }),
      historyOrder({
        id: "2f739a95-80cd-431a-8a0d-350e18d43601",
        dailyOrderNumber: 45,
        pickupName: "Marco",
        status: "cancelled",
        cancelledAt: createdAt,
        pickedUpAt: null
      })
    ]
  };
  const historyRequests: string[] = [];

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/staff/session") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: staffId,
          username: "barista",
          displayName: "Demo Barista",
          authorizationStatus: "authorized"
        })
      });
      return;
    }

    if (path === "/orders/history") {
      historyRequests.push(url.search);
      const number = url.searchParams.get("dailyOrderNumber");
      const status = url.searchParams.get("status");
      const pickupName = url.searchParams.get("pickupName")?.toLowerCase();
      const orders = fullHistory.orders.filter((order) => {
        if (number && order.dailyOrderNumber !== Number(number)) {
          return false;
        }

        if (status && order.status !== status) {
          return false;
        }

        return !pickupName || order.pickupName?.toLowerCase().includes(pickupName);
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orders })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", message: `Unhandled test route ${path}` })
    });
  });

  await page.goto("/#history");

  const startedAt = Date.now();
  await expect(page.getByRole("heading", { name: "Daily activity" })).toBeVisible();
  await expect(page.getByText("#44")).toBeVisible();
  await expect(page.getByText("#45")).toBeVisible();
  await expect(page.getByText("Received 2026-05-30 15:42 UTC")).toHaveCount(2);

  await page.getByLabel("Daily order number").fill("44");
  await page.getByRole("button", { name: "Search history" }).click();
  await expect(page.getByText("Lena Ortiz")).toBeVisible();
  await expect(page.getByText("Marco")).toHaveCount(0);

  await page.getByLabel("Daily order number").fill("");
  await page.getByLabel("Status").selectOption("cancelled");
  await page.getByRole("button", { name: "Search history" }).click();
  await expect(page.getByText("Marco")).toBeVisible();
  await expect(page.getByText("Lena Ortiz")).toHaveCount(0);

  await page.getByLabel("Status").selectOption("");
  await page.getByLabel("Pickup name").fill("lena");
  await page.getByRole("button", { name: "Search history" }).click();
  await expect(page.getByText("Lena Ortiz")).toBeVisible();
  expect(historyRequests).toContain("?dailyOrderNumber=44");
  expect(historyRequests).toContain("?status=cancelled");
  expect(historyRequests).toContain("?pickupName=lena");
  expect(Date.now() - startedAt).toBeLessThan(45_000);
});
