import { describe, expect, it } from "vitest";

import { createLoggedInAgent, createTestMenuFixture } from "./testFixtures";

describe("US4 menu availability selection guard", () => {
  it("prevents unavailable items from being selected for new orders and allows restored items", async () => {
    const { agent } = await createLoggedInAgent();
    const menu = await createTestMenuFixture();

    const unavailableResponse = await agent.patch(`/menu/items/${menu.menuItemId}`).send({
      categoryId: menu.categoryId,
      name: "Latte",
      description: "Temporarily unavailable",
      price: "4.50",
      available: false,
      active: true
    });

    expect(unavailableResponse.status).toBe(200);
    expect(unavailableResponse.body.available).toBe(false);

    const rejectedOrderResponse = await agent.post("/orders").send({
      beverages: [
        {
          menuItemId: menu.menuItemId,
          quantity: 1,
          selectedCustomizations: [
            {
              customizationGroupId: menu.groupId,
              customizationChoiceIds: [menu.wholeMilkChoiceId]
            }
          ]
        }
      ]
    });

    expect(rejectedOrderResponse.status).toBe(400);
    expect(rejectedOrderResponse.body).toMatchObject({
      code: "BAD_REQUEST",
      message: "Selected menu item is not available for new orders."
    });

    const restoredResponse = await agent.patch(`/menu/items/${menu.menuItemId}`).send({
      categoryId: menu.categoryId,
      name: "Latte",
      description: "Espresso with steamed milk",
      price: "4.50",
      available: true,
      active: true
    });

    expect(restoredResponse.status).toBe(200);
    expect(restoredResponse.body.available).toBe(true);

    const acceptedOrderResponse = await agent.post("/orders").send({
      beverages: [
        {
          menuItemId: menu.menuItemId,
          quantity: 1,
          selectedCustomizations: [
            {
              customizationGroupId: menu.groupId,
              customizationChoiceIds: [menu.wholeMilkChoiceId]
            }
          ]
        }
      ]
    });

    expect(acceptedOrderResponse.status).toBe(201);
    expect(acceptedOrderResponse.body.beverages[0]).toMatchObject({
      nameSnapshot: "Latte",
      priceSnapshot: "4.50"
    });
  });
});
