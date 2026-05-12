import { expect, test } from "@playwright/test";

test("staff creates a counter order with pickup name and sends it to the brew queue", async ({
  page
}) => {
  let sessionActive = false;
  const menuItemId = "2d20d6c7-337e-4216-a900-b7dcdf4fc2eb";
  const groupId = "8a7ea15d-9d7f-4d95-859d-5eb0c5a40f4f";
  const choiceId = "91e6d2ab-5519-4a2d-b5f7-c8cf38b5a1f0";
  const createdAt = new Date().toISOString();
  const createdOrder = {
    id: "6d8d6e6a-86d4-4f2f-b472-a7f96917908b",
    businessDate: createdAt.slice(0, 10),
    dailyOrderNumber: 42,
    pickupName: "Ari",
    status: "created",
    createdByStaffId: "5e2a85b5-30e5-4b37-9b7c-122229476d62",
    assignedBaristaId: null,
    total: "5.25",
    createdAt,
    queuedAt: null,
    inProgressAt: null,
    completedAt: null,
    pickedUpAt: null,
    cancelledAt: null,
    beverages: [
      {
        id: "7555deef-07d8-42fd-a51e-c38f204283ea",
        orderId: "6d8d6e6a-86d4-4f2f-b472-a7f96917908b",
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
        status: "pending",
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null
      }
    ]
  };

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");

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
          id: createdOrder.createdByStaffId,
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

    if (path === "/menu/categories") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          categories: [
            {
              id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
              name: "Coffee",
              displayOrder: 1,
              active: true,
              menuItems: [
                {
                  id: menuItemId,
                  categoryId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
                  name: "Latte",
                  description: "Espresso with steamed milk",
                  price: "4.50",
                  available: true,
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
          ]
        })
      });
      return;
    }

    if (path === `/orders/${createdOrder.id}/queue`) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...createdOrder,
          status: "queued",
          queuedAt: new Date().toISOString()
        })
      });
      return;
    }

    if (path === "/orders") {
      expect(route.request().method()).toBe("POST");
      const body = route.request().postDataJSON();

      expect(body.pickupName).toBe("Ari");
      expect(body.beverages).toHaveLength(1);
      expect(body.beverages[0]).toMatchObject({
        menuItemId,
        quantity: 1,
        specialInstructions: "Extra hot"
      });

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(createdOrder)
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
  await page.getByLabel("Special instructions").fill("Extra hot");
  await page.getByRole("button", { name: "Customize & add" }).click();
  await expect(page.getByText("Milk: Oat Milk")).toBeVisible();
  await expect(page.getByText("Note: Extra hot")).toBeVisible();
  await page.getByRole("button", { name: "Create counter order" }).click();

  await expect(page.getByText("#42")).toBeVisible();
  expect(Date.now() - startedAt).toBeLessThan(60_000);

  await page.getByRole("button", { name: "Send to brew queue" }).click();
  await expect(page.getByRole("button", { name: "Queued" })).toBeVisible();
});
