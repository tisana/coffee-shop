import { describe, expect, it } from "vitest";

import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { claimQueuedOrder } from "../../src/domain/queueClaimService";
import { submitOrderToQueue } from "../../src/domain/queueSubmissionService";
import { createLoggedInAgent, createTestMenuFixture } from "./testFixtures";

async function createInProgressOrder(staffId: string) {
  const menu = await createTestMenuFixture();
  const createdOrder = await createOrderForStaff(staffId, {
    pickupName: "Lena",
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
      },
      {
        menuItemId: menu.menuItemId,
        quantity: 1,
        selectedCustomizations: [
          {
            customizationGroupId: menu.groupId,
            customizationChoiceIds: [menu.oatMilkChoiceId]
          }
        ],
        specialInstructions: "No foam"
      }
    ]
  });
  const queuedOrder = await submitOrderToQueue(createdOrder.id);

  return claimQueuedOrder(queuedOrder.id, staffId);
}

describe("US3 order fulfillment contract", () => {
  it("completes beverages, cancels one beverage, completes an order, and confirms pickup", async () => {
    const { agent, staff } = await createLoggedInAgent();
    const inProgressOrder = await createInProgressOrder(staff.id);
    const [firstBeverage, secondBeverage] = inProgressOrder.beverages;

    if (!firstBeverage || !secondBeverage) {
      throw new Error("Expected two beverages in the test order.");
    }

    const completeBeverageResponse = await agent
      .post(`/orders/${inProgressOrder.id}/beverages/${firstBeverage.id}/complete`)
      .send();

    expect(completeBeverageResponse.status).toBe(200);
    expect(completeBeverageResponse.body.beverages).toContainEqual(
      expect.objectContaining({
        id: firstBeverage.id,
        status: "completed",
        completedAt: expect.any(String)
      })
    );
    expect(completeBeverageResponse.body.status).toBe("in_progress");

    const cancelBeverageResponse = await agent
      .post(`/orders/${inProgressOrder.id}/beverages/${secondBeverage.id}/cancel`)
      .send({ reason: "Customer changed drink" });

    expect(cancelBeverageResponse.status).toBe(200);
    expect(cancelBeverageResponse.body.beverages).toContainEqual(
      expect.objectContaining({
        id: secondBeverage.id,
        status: "cancelled",
        cancelledAt: expect.any(String),
        cancellationReason: "Customer changed drink"
      })
    );
    expect(cancelBeverageResponse.body.status).toBe("in_progress");

    const completeOrderResponse = await agent.post(`/orders/${inProgressOrder.id}/complete`).send();

    expect(completeOrderResponse.status).toBe(200);
    expect(completeOrderResponse.body).toMatchObject({
      id: inProgressOrder.id,
      status: "completed",
      completedAt: expect.any(String),
      dailyOrderNumber: inProgressOrder.dailyOrderNumber
    });

    const pickupResponse = await agent.post(`/orders/${inProgressOrder.id}/pickup`).send();

    expect(pickupResponse.status).toBe(200);
    expect(pickupResponse.body).toMatchObject({
      id: inProgressOrder.id,
      status: "picked_up",
      pickedUpAt: expect.any(String)
    });
  });

  it("cancels a whole active order and records the cancellation timestamp", async () => {
    const { agent, staff } = await createLoggedInAgent();
    const inProgressOrder = await createInProgressOrder(staff.id);

    const cancelOrderResponse = await agent.post(`/orders/${inProgressOrder.id}/cancel`).send();

    expect(cancelOrderResponse.status).toBe(200);
    expect(cancelOrderResponse.body).toMatchObject({
      id: inProgressOrder.id,
      status: "cancelled",
      cancelledAt: expect.any(String)
    });
  });

  it("rejects order completion while any remaining beverage is still pending", async () => {
    const { agent, staff } = await createLoggedInAgent();
    const inProgressOrder = await createInProgressOrder(staff.id);

    const response = await agent.post(`/orders/${inProgressOrder.id}/complete`).send();

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      code: "CONFLICT",
      details: {
        status: "in_progress",
        pendingBeverageCount: 2
      }
    });
  });
});
