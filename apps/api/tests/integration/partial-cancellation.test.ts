import { describe, expect, it } from "vitest";

import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { claimQueuedOrder } from "../../src/domain/queueClaimService";
import { submitOrderToQueue } from "../../src/domain/queueSubmissionService";
import { createLoggedInAgent, createTestMenuFixture } from "./testFixtures";

describe("US3 partial beverage cancellation", () => {
  it("lets remaining beverages complete after one beverage in a multi-beverage order is cancelled", async () => {
    const { agent, staff } = await createLoggedInAgent();
    const menu = await createTestMenuFixture();
    const createdOrder = await createOrderForStaff(staff.id, {
      pickupName: "Nico",
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
          ]
        }
      ]
    });
    const queuedOrder = await submitOrderToQueue(createdOrder.id);
    const inProgressOrder = await claimQueuedOrder(queuedOrder.id, staff.id);
    const [cancelledBeverage, completedBeverage] = inProgressOrder.beverages;

    if (!cancelledBeverage || !completedBeverage) {
      throw new Error("Expected two beverages in the test order.");
    }

    const cancelResponse = await agent
      .post(`/orders/${inProgressOrder.id}/beverages/${cancelledBeverage.id}/cancel`)
      .send({ reason: "Out of syrup" });
    const completeBeverageResponse = await agent
      .post(`/orders/${inProgressOrder.id}/beverages/${completedBeverage.id}/complete`)
      .send();
    const completeOrderResponse = await agent.post(`/orders/${inProgressOrder.id}/complete`).send();

    expect(cancelResponse.status).toBe(200);
    expect(completeBeverageResponse.status).toBe(200);
    expect(completeOrderResponse.status).toBe(200);
    expect(completeOrderResponse.body).toMatchObject({
      status: "completed",
      completedAt: expect.any(String)
    });
    expect(completeOrderResponse.body.beverages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: cancelledBeverage.id,
          status: "cancelled",
          cancellationReason: "Out of syrup"
        }),
        expect.objectContaining({
          id: completedBeverage.id,
          status: "completed",
          completedAt: expect.any(String)
        })
      ])
    );
  });
});
