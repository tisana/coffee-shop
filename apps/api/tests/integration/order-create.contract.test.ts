import { describe, expect, it } from "vitest";

import { createLoggedInAgent, createTestMenuFixture } from "./testFixtures";

describe("US1 order creation contract", () => {
  it("logs in, returns current staff, creates an order with pickup name, and queues it", async () => {
    const { agent, staff } = await createLoggedInAgent();
    const menu = await createTestMenuFixture();

    const sessionResponse = await agent.get("/staff/session");

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body).toMatchObject({
      id: staff.id,
      username: staff.username,
      displayName: staff.displayName,
      authorizationStatus: "authorized"
    });

    const createResponse = await agent.post("/orders").send({
      pickupName: "Ari",
      beverages: [
        {
          menuItemId: menu.menuItemId,
          quantity: 2,
          selectedCustomizations: [
            {
              customizationGroupId: menu.groupId,
              customizationChoiceIds: [menu.oatMilkChoiceId]
            }
          ],
          specialInstructions: "Extra hot"
        }
      ]
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      pickupName: "Ari",
      status: "created",
      total: "10.50"
    });
    expect(createResponse.body.dailyOrderNumber).toBeGreaterThan(0);
    expect(createResponse.body.beverages).toHaveLength(1);
    expect(createResponse.body.beverages[0]).toMatchObject({
      quantity: 2,
      priceSnapshot: "5.25",
      specialInstructions: "Extra hot",
      status: "pending"
    });

    const queueResponse = await agent.post(`/orders/${createResponse.body.id}/queue`).send();

    expect(queueResponse.status).toBe(200);
    expect(queueResponse.body).toMatchObject({
      id: createResponse.body.id,
      status: "queued"
    });
    expect(queueResponse.body.queuedAt).toEqual(expect.any(String));
  });

  it("rejects staff routes without a session cookie", async () => {
    const { agent } = await createLoggedInAgent();
    await agent.post("/auth/logout").send();

    const response = await agent.post("/orders").send({ beverages: [] });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
  });
});
