import { expect, test } from "@playwright/test";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";
import { fulfillCsrfToken } from "./testApiMocks";

test("barista completes remaining beverages, calls out pickup, and confirms pickup", async ({
  page
}) => {
  const createdAt = new Date().toISOString();
  const staffId = "5e2a85b5-30e5-4b37-9b7c-122229476d62";
  const orderId = "6d8d6e6a-86d4-4f2f-b472-a7f96917908b";
  const firstBeverageId = "7555deef-07d8-42fd-a51e-c38f204283ea";
  const secondBeverageId = "b3d76cad-9610-44ce-9196-9aeb8b79e6dd";
  let activeOrder: QueueOrder = {
    id: orderId,
    businessDate: createdAt.slice(0, 10),
    dailyOrderNumber: 44,
    pickupName: "Lena",
    status: "in_progress",
    createdByStaffId: staffId,
    assignedBaristaId: staffId,
    assignedBaristaDisplayName: "Demo Barista",
    total: "10.50",
    createdAt,
    queuedAt: createdAt,
    inProgressAt: createdAt,
    completedAt: null,
    pickedUpAt: null,
    cancelledAt: null,
    beverages: [
      {
        id: firstBeverageId,
        orderId,
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
        status: "pending",
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null
      },
      {
        id: secondBeverageId,
        orderId,
        sourceMenuItemId: "2d20d6c7-337e-4216-a900-b7dcdf4fc2eb",
        nameSnapshot: "Mocha",
        quantity: 1,
        priceSnapshot: "5.25",
        selectedCustomizationsSnapshot: [],
        specialInstructions: null,
        status: "pending",
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null
      }
    ]
  };

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");

    if (await fulfillCsrfToken(route, path)) {
      return;
    }

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
        body: JSON.stringify({ orders: activeOrder.status === "picked_up" ? [] : [activeOrder] })
      });
      return;
    }

    if (path === `/orders/${orderId}/beverages/${secondBeverageId}/cancel`) {
      expect(route.request().method()).toBe("POST");
      activeOrder = {
        ...activeOrder,
        beverages: activeOrder.beverages.map((beverage) =>
          beverage.id === secondBeverageId
            ? {
                ...beverage,
                status: "cancelled",
                cancelledAt: new Date().toISOString(),
                cancellationReason: "Unavailable"
              }
            : beverage
        )
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(activeOrder) });
      return;
    }

    if (path === `/orders/${orderId}/beverages/${firstBeverageId}/complete`) {
      expect(route.request().method()).toBe("POST");
      activeOrder = {
        ...activeOrder,
        beverages: activeOrder.beverages.map((beverage) =>
          beverage.id === firstBeverageId
            ? { ...beverage, status: "completed", completedAt: new Date().toISOString() }
            : beverage
        )
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(activeOrder) });
      return;
    }

    if (path === `/orders/${orderId}/complete`) {
      expect(route.request().method()).toBe("POST");
      activeOrder = {
        ...activeOrder,
        status: "completed",
        completedAt: new Date().toISOString()
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(activeOrder) });
      return;
    }

    if (path === `/orders/${orderId}/pickup`) {
      expect(route.request().method()).toBe("POST");
      activeOrder = {
        ...activeOrder,
        status: "picked_up",
        pickedUpAt: new Date().toISOString()
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(activeOrder) });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", message: `Unhandled test route ${path}` })
    });
  });

  await page.goto("/#queue");

  await expect(page.getByText("Lena")).toBeVisible();
  await page.getByRole("button", { name: "Cancel Mocha" }).click();
  await expect(page.getByText("Cancelled")).toBeVisible();
  await page.getByRole("button", { name: "Complete Latte" }).click();
  await expect(page.getByText("Completed")).toBeVisible();

  const startedAt = Date.now();
  await page.getByRole("button", { name: "Mark order #44 ready for pickup" }).click();

  await expect(page.getByText("Call #44 for pickup")).toBeVisible();
  await expect(page.getByText("Lena is ready")).toBeVisible();
  await page.getByRole("button", { name: "Confirm pickup for order #44" }).click();
  await expect(page.getByText("Pickup confirmed for #44.")).toBeVisible();
  expect(Date.now() - startedAt).toBeLessThan(10_000);
});
