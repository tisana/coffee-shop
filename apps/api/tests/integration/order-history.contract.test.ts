import { describe, expect, it } from "vitest";

import { completeOrderBeverage } from "../../src/domain/beverageService";
import { cancelOrder, completeOrder, confirmOrderPickup } from "../../src/domain/orderFulfillmentService";
import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { claimQueuedOrder } from "../../src/domain/queueClaimService";
import { submitOrderToQueue } from "../../src/domain/queueSubmissionService";
import { createApp } from "../../src/app";
import { createLoggedInAgent, createTestMenuFixture } from "./testFixtures";
import request from "supertest";

async function createOrderWithPickupName(staffId: string, pickupName: string) {
  const menu = await createTestMenuFixture();

  return createOrderForStaff(staffId, {
    pickupName,
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
}

async function createPickedUpOrder(staffId: string, pickupName: string) {
  const createdOrder = await createOrderWithPickupName(staffId, pickupName);
  const queuedOrder = await submitOrderToQueue(createdOrder.id);
  const claimedOrder = await claimQueuedOrder(queuedOrder.id, staffId);
  const [beverage] = claimedOrder.beverages;

  if (!beverage) {
    throw new Error("Expected a beverage in the picked-up test order.");
  }

  await completeOrderBeverage(claimedOrder.id, beverage.id);
  await completeOrder(claimedOrder.id);
  return confirmOrderPickup(claimedOrder.id);
}

async function createCancelledOrder(staffId: string, pickupName: string) {
  const createdOrder = await createOrderWithPickupName(staffId, pickupName);
  const queuedOrder = await submitOrderToQueue(createdOrder.id);
  const claimedOrder = await claimQueuedOrder(queuedOrder.id, staffId);

  return cancelOrder(claimedOrder.id);
}

describe("US5 order history contract", () => {
  it("requires an authorized staff session", async () => {
    const response = await request(createApp()).get("/orders/history");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Staff authorization required."
    });
  });

  it("filters current-day orders by daily order number, status, and pickup name", async () => {
    const { agent, staff } = await createLoggedInAgent();
    const uniquePickupName = `Lena Ortiz ${staff.id.slice(0, 8)}`;
    const createdOrder = await createOrderWithPickupName(staff.id, "Amara");
    const pickedUpOrder = await createPickedUpOrder(staff.id, uniquePickupName);
    const cancelledOrder = await createCancelledOrder(staff.id, "Marco");

    const byNumberResponse = await agent
      .get("/orders/history")
      .query({ dailyOrderNumber: createdOrder.dailyOrderNumber });

    expect(byNumberResponse.status).toBe(200);
    expect(byNumberResponse.body.orders).toHaveLength(1);
    expect(byNumberResponse.body.orders[0]).toMatchObject({
      id: createdOrder.id,
      dailyOrderNumber: createdOrder.dailyOrderNumber,
      pickupName: "Amara",
      status: "created"
    });

    const byStatusResponse = await agent.get("/orders/history").query({ status: "picked_up" });

    expect(byStatusResponse.status).toBe(200);
    expect(byStatusResponse.body.orders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: pickedUpOrder.id,
          pickupName: uniquePickupName,
          status: "picked_up",
          pickedUpAt: expect.any(String)
        })
      ])
    );
    expect(byStatusResponse.body.orders).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: cancelledOrder.id })])
    );

    const byPickupNameResponse = await agent
      .get("/orders/history")
      .query({ pickupName: uniquePickupName.slice(-8) });

    expect(byPickupNameResponse.status).toBe(200);
    expect(byPickupNameResponse.body.orders).toEqual([
      expect.objectContaining({
        id: pickedUpOrder.id,
        dailyOrderNumber: pickedUpOrder.dailyOrderNumber,
        pickupName: uniquePickupName
      })
    ]);
  });

  it("returns request validation errors for invalid filters", async () => {
    const { agent } = await createLoggedInAgent();

    const response = await agent.get("/orders/history").query({ dailyOrderNumber: 0 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "BAD_REQUEST",
      message: "Request validation failed."
    });
  });
});
