import { describe, expect, it } from "vitest";

import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { submitOrderToQueue } from "../../src/domain/queueSubmissionService";
import { createLoggedInAgent, createTestMenuFixture } from "./testFixtures";

async function createQueuedOrderForStaff(staffId: string) {
  const menu = await createTestMenuFixture();
  const order = await createOrderForStaff(staffId, {
    pickupName: "Riley",
    beverages: [
      {
        menuItemId: menu.menuItemId,
        quantity: 1,
        selectedCustomizations: [
          {
            customizationGroupId: menu.groupId,
            customizationChoiceIds: [menu.wholeMilkChoiceId]
          }
        ],
        specialInstructions: "For here"
      }
    ]
  });

  return submitOrderToQueue(order.id);
}

describe("US2 brew queue contract", () => {
  it("lists queued orders and claims a waiting order", async () => {
    const { agent, staff } = await createLoggedInAgent();
    const queuedOrder = await createQueuedOrderForStaff(staff.id);

    const listResponse = await agent.get("/queue/orders");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.orders).toContainEqual(
      expect.objectContaining({
        id: queuedOrder.id,
        status: "queued",
        pickupName: "Riley"
      })
    );
    const listedOrder = listResponse.body.orders.find(
      (order: { id: string }) => order.id === queuedOrder.id
    );

    expect(listedOrder.beverages[0].selectedCustomizationsSnapshot[0].choices[0].choiceName).toBe(
      "Whole Milk"
    );

    const claimResponse = await agent.post(`/queue/orders/${queuedOrder.id}/claim`).send();

    expect(claimResponse.status).toBe(200);
    expect(claimResponse.body).toMatchObject({
      id: queuedOrder.id,
      status: "in_progress",
      assignedBaristaId: staff.id,
      assignedBaristaDisplayName: staff.displayName
    });
    expect(claimResponse.body.inProgressAt).toEqual(expect.any(String));

    const claimedListResponse = await agent.get("/queue/orders");
    const claimedListOrder = claimedListResponse.body.orders.find(
      (order: { id: string }) => order.id === queuedOrder.id
    );

    expect(claimedListOrder).toMatchObject({
      id: queuedOrder.id,
      status: "in_progress",
      assignedBaristaId: staff.id,
      assignedBaristaDisplayName: staff.displayName
    });

    const alreadyClaimedResponse = await agent.post(`/queue/orders/${queuedOrder.id}/claim`).send();

    expect(alreadyClaimedResponse.status).toBe(409);
    expect(alreadyClaimedResponse.body).toMatchObject({
      code: "CONFLICT",
      details: {
        status: "in_progress"
      }
    });
  });
});
