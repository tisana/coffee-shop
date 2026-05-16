import { expect, test } from "@playwright/test";

import type { Order } from "@coffee-shop/shared/domain/types";

test("barista claims a queued order within the brew queue", async ({ page }) => {
  const createdAt = new Date().toISOString();
  const staffId = "5e2a85b5-30e5-4b37-9b7c-122229476d62";
  const queuedOrder: Order = {
    id: "6d8d6e6a-86d4-4f2f-b472-a7f96917908b",
    businessDate: createdAt.slice(0, 10),
    dailyOrderNumber: 43,
    pickupName: "Mina",
    status: "queued",
    createdByStaffId: staffId,
    assignedBaristaId: null,
    total: "9.75",
    createdAt,
    queuedAt: createdAt,
    inProgressAt: null,
    completedAt: null,
    pickedUpAt: null,
    cancelledAt: null,
    beverages: [
      {
        id: "7555deef-07d8-42fd-a51e-c38f204283ea",
        orderId: "6d8d6e6a-86d4-4f2f-b472-a7f96917908b",
        sourceMenuItemId: "2d20d6c7-337e-4216-a900-b7dcdf4fc2eb",
        nameSnapshot: "Latte",
        quantity: 2,
        priceSnapshot: "4.50",
        selectedCustomizationsSnapshot: [
          {
            groupName: "Milk",
            choices: [{ choiceName: "Oat Milk", priceAdjustment: "0.75" }]
          }
        ],
        specialInstructions: "Extra hot",
        status: "pending",
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null
      }
    ]
  };
  let activeOrder = queuedOrder;

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");

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

    if (path === "/queue/orders") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orders: [activeOrder] })
      });
      return;
    }

    if (path === `/queue/orders/${queuedOrder.id}/claim`) {
      expect(route.request().method()).toBe("POST");
      activeOrder = {
        ...queuedOrder,
        status: "in_progress",
        assignedBaristaId: staffId,
        inProgressAt: new Date().toISOString()
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeOrder)
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", message: `Unhandled test route ${path}` })
    });
  });

  await page.goto("/#queue");

  await expect(page.getByRole("heading", { name: "Brew queue" })).toBeVisible();
  await expect(page.locator(".daily-number").filter({ hasText: "#43" })).toBeVisible();
  await expect(page.getByText("Mina")).toBeVisible();
  await expect(page.getByText("2x Latte")).toBeVisible();

  const startedAt = Date.now();
  await page.getByRole("button", { name: "Claim order #43" }).click();

  await expect(page.locator(".queue-status-in_progress").filter({ hasText: "In progress" })).toBeVisible();
  await expect(page.getByText("Assigned to Demo Barista")).toBeVisible();
  expect(Date.now() - startedAt).toBeLessThan(15_000);
});
