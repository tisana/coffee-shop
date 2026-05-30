import { expect, test } from "@playwright/test";

import type { MenuCategory, Order } from "@coffee-shop/shared/domain/types";

const createdAt = new Date().toISOString();
const staffId = "5e2a85b5-30e5-4b37-9b7c-122229476d62";
const categoryId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const menuItemId = "2d20d6c7-337e-4216-a900-b7dcdf4fc2eb";
const groupId = "8a7ea15d-9d7f-4d95-859d-5eb0c5a40f4f";
const choiceId = "91e6d2ab-5519-4a2d-b5f7-c8cf38b5a1f0";
const beverageId = "7555deef-07d8-42fd-a51e-c38f204283ea";
const orderId = "6d8d6e6a-86d4-4f2f-b472-a7f96917908b";

function menuCatalog(available: boolean): MenuCategory[] {
  return [
    {
      id: categoryId,
      name: "Coffee",
      displayOrder: 1,
      active: true,
      menuItems: [
        {
          id: menuItemId,
          categoryId,
          name: "Latte",
          description: "Espresso with steamed milk",
          imageUrl: "https://cdn.example.test/menu/latte.jpg",
          price: "4.50",
          available,
          active: true,
          displayOrder: 1,
          customizationGroups: [
            {
              id: groupId,
              menuItemId,
              name: "Milk",
              required: true,
              minSelections: 1,
              maxSelections: 1,
              displayOrder: 1,
              active: true,
              choices: [
                {
                  id: choiceId,
                  customizationGroupId: groupId,
                  name: "Oat Milk",
                  priceAdjustment: "0.75",
                  available: true,
                  displayOrder: 1,
                  active: true
                }
              ]
            }
          ]
        }
      ]
    }
  ];
}

function workflowOrder(status: Order["status"], overrides: Partial<Order> = {}): Order {
  return {
    id: orderId,
    businessDate: createdAt.slice(0, 10),
    dailyOrderNumber: 51,
    pickupName: "Ari",
    status,
    createdByStaffId: staffId,
    assignedBaristaId: status === "created" || status === "queued" ? null : staffId,
    assignedBaristaDisplayName: status === "created" || status === "queued" ? null : "Demo Barista",
    total: "5.25",
    createdAt,
    queuedAt: status === "created" ? null : createdAt,
    inProgressAt:
      status === "in_progress" || status === "completed" || status === "picked_up" ? createdAt : null,
    completedAt: status === "completed" || status === "picked_up" ? createdAt : null,
    pickedUpAt: status === "picked_up" ? createdAt : null,
    cancelledAt: null,
    beverages: [
      {
        id: beverageId,
        orderId,
        sourceMenuItemId: menuItemId,
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
        status: status === "completed" || status === "picked_up" ? "completed" : "pending",
        completedAt: status === "completed" || status === "picked_up" ? createdAt : null,
        cancelledAt: null,
        cancellationReason: null
      }
    ],
    ...overrides
  };
}

test("staff completes the full counter-to-history workflow", async ({ page }) => {
  let sessionActive = false;
  let activeOrder: Order | null = null;
  let latteAvailable = true;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/staff/session") {
      if (!sessionActive) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ code: "UNAUTHORIZED", message: "Staff authorization required." })
        });
        return;
      }

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

    if (path === "/auth/login") {
      sessionActive = true;
      await route.fulfill({ status: 204 });
      return;
    }

    if (path === "/menu/categories" && route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ categories: menuCatalog(latteAvailable) })
      });
      return;
    }

    if (path === "/orders" && route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        pickupName: "Ari",
        beverages: [
          {
            menuItemId,
            quantity: 1,
            specialInstructions: "Extra hot"
          }
        ]
      });
      activeOrder = workflowOrder("created");
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(activeOrder)
      });
      return;
    }

    if (path === `/orders/${orderId}/queue`) {
      activeOrder = workflowOrder("queued");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeOrder)
      });
      return;
    }

    if (path === "/queue/orders") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          orders: activeOrder && activeOrder.status !== "picked_up" ? [activeOrder] : []
        })
      });
      return;
    }

    if (path === `/queue/orders/${orderId}/claim`) {
      activeOrder = workflowOrder("in_progress");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeOrder)
      });
      return;
    }

    if (path === `/orders/${orderId}/beverages/${beverageId}/complete`) {
      activeOrder = workflowOrder("in_progress", {
        beverages: workflowOrder("completed").beverages
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeOrder)
      });
      return;
    }

    if (path === `/orders/${orderId}/complete`) {
      activeOrder = workflowOrder("completed");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeOrder)
      });
      return;
    }

    if (path === `/orders/${orderId}/pickup`) {
      activeOrder = workflowOrder("picked_up");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeOrder)
      });
      return;
    }

    if (path === `/menu/items/${menuItemId}` && route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      expect(body.available).toBe(false);
      latteAvailable = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...menuCatalog(latteAvailable)[0].menuItems[0],
          ...body
        })
      });
      return;
    }

    if (path === "/orders/history") {
      const dailyOrderNumber = url.searchParams.get("dailyOrderNumber");
      if (dailyOrderNumber !== null) {
        expect(dailyOrderNumber).toBe("51");
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          orders:
            activeOrder && (dailyOrderNumber === null || dailyOrderNumber === "51")
              ? [activeOrder]
              : []
        })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", message: `Unhandled test route ${path}` })
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();

  const startedAt = Date.now();
  await page.getByLabel("Pickup name").fill("Ari");
  await page.locator(".popular-card").click();
  await page.getByLabel("Special instructions").fill("Extra hot");
  await page.getByRole("button", { name: "Customize & add" }).click();
  await page.getByRole("button", { name: "Create and queue order" }).click();
  await expect(page.getByText("Ari is in the brew queue.")).toBeVisible();

  await page.getByRole("link", { name: "Orders" }).click();
  await page.getByRole("button", { name: "Claim order #51" }).click();
  await page.getByRole("button", { name: "Complete Latte" }).click();
  await page.getByRole("button", { name: "Mark order #51 ready for pickup" }).click();
  await expect(page.getByText("Call #51 for pickup")).toBeVisible();
  await page.getByRole("button", { name: "Confirm pickup for order #51" }).click();
  await expect(page.getByText("Pickup confirmed for #51.")).toBeVisible();

  await page.getByRole("link", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Edit Latte" }).click();
  await page.getByLabel("Available for new orders").uncheck();
  await page.getByRole("button", { name: "Save menu item" }).click();
  await expect(page.getByText("Latte saved. Future counter orders will use the updated menu.")).toBeVisible();

  await page.getByRole("link", { name: "History" }).click();
  await page.getByLabel("Daily order number").fill("51");
  await page.getByRole("button", { name: "Search history" }).click();
  const historyResults = page.getByLabel("Order history results");
  await expect(historyResults.getByText("#51")).toBeVisible();
  await expect(historyResults.getByText("Picked up")).toBeVisible();
  expect(Date.now() - startedAt).toBeLessThan(60_000);
});
