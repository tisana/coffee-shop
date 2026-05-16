import { describe, expect, it } from "vitest";

import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { submitOrderToQueue } from "../../src/domain/queueSubmissionService";
import { createLoggedInAgent, createTestMenuFixture } from "./testFixtures";

describe("US2 queue claim concurrency", () => {
  it("allows exactly one barista to claim a queued order", async () => {
    const first = await createLoggedInAgent();
    const second = await createLoggedInAgent();
    const menu = await createTestMenuFixture();
    const createdOrder = await createOrderForStaff(first.staff.id, {
      beverages: [
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

    const responses = await Promise.all([
      first.agent.post(`/queue/orders/${queuedOrder.id}/claim`).send(),
      second.agent.post(`/queue/orders/${queuedOrder.id}/claim`).send()
    ]);

    const statuses = responses.map((response) => response.status).sort();
    const successfulClaim = responses.find((response) => response.status === 200);
    const rejectedClaim = responses.find((response) => response.status === 409);

    expect(statuses).toEqual([200, 409]);
    expect(successfulClaim?.body).toMatchObject({
      id: queuedOrder.id,
      status: "in_progress"
    });
    expect([first.staff.id, second.staff.id]).toContain(successfulClaim?.body.assignedBaristaId);
    expect(rejectedClaim?.body).toMatchObject({
      code: "CONFLICT",
      details: {
        status: "in_progress"
      }
    });
  });
});
