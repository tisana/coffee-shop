import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app";
import { cleanupLoyaltyFixtureData, createLoggedInAgent, createTestMenuFixture } from "./testFixtures";

describe("loyalty customer contract", () => {
  afterEach(async () => {
    await cleanupLoyaltyFixtureData();
  });

  it("requires staff access and supports customer registration, search, retrieval, and editing", async () => {
    const unauthorized = await request(createApp()).get("/loyalty/customers?query=Ari");
    expect(unauthorized.status).toBe(401);

    const { agent } = await createLoggedInAgent();
    const regionResponse = await agent.get("/loyalty/phone-region");
    expect(regionResponse.status).toBe(200);
    expect(regionResponse.body).toEqual({ region: "TH" });

    const createResponse = await agent.post("/loyalty/customers").send({
      name: "Ari Srisuk",
      phone: "081-234-5678",
      email: ""
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      name: "Ari Srisuk",
      phone: "081-234-5678",
      email: null
    });

    const duplicateResponse = await agent.post("/loyalty/customers").send({
      name: "Duplicate Ari",
      phone: "+66 81-234-5678"
    });
    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body).toMatchObject({ code: "CONFLICT" });

    const searchResponse = await agent.get("/loyalty/customers?query=%2B66812345678");
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.customers).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createResponse.body.id })])
    );

    const profileResponse = await agent.get(`/loyalty/customers/${createResponse.body.id}`);
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body).toMatchObject({ id: createResponse.body.id });

    const updateResponse = await agent.patch(`/loyalty/customers/${createResponse.body.id}`).send({
      phone: "082-234-5678",
      email: "ari@example.test"
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: createResponse.body.id,
      phone: "082-234-5678",
      email: "ari@example.test"
    });
  });

  it("returns request validation errors before customer service execution", async () => {
    const { agent } = await createLoggedInAgent();

    const response = await agent.post("/loyalty/customers").send({
      name: "",
      phone: "not a phone",
      email: "invalid-email"
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "BAD_REQUEST",
      message: "Request validation failed."
    });
  });

  it("validates email before identity conflicts and returns email-specific conflicts", async () => {
    const { agent } = await createLoggedInAgent();
    const primary = await agent.post("/loyalty/customers").send({
      name: "Ari Srisuk",
      phone: "081-234-5678",
      email: "  Ari@Example.test  "
    });
    expect(primary.status).toBe(201);
    expect(primary.body.email).toBe("Ari@Example.test");

    const malformed = await agent.post("/loyalty/customers").send({
      name: "Malformed Email",
      phone: "+66 81-234-5678",
      email: "not-an-email"
    });
    expect(malformed.status).toBe(400);
    expect(malformed.body).toMatchObject({
      code: "BAD_REQUEST",
      message: "Request validation failed."
    });

    const duplicateCreate = await agent.post("/loyalty/customers").send({
      name: "Duplicate Ari",
      phone: "082-234-5678",
      email: " ari@example.test "
    });
    expect(duplicateCreate.status).toBe(409);
    expect(duplicateCreate.body).toMatchObject({
      code: "CONFLICT",
      message: "Email address already belongs to a customer."
    });

    const other = await agent.post("/loyalty/customers").send({
      name: "Nina Saelim",
      phone: "083-234-5678",
      email: "nina@example.test"
    });
    expect(other.status).toBe(201);

    const duplicateUpdate = await agent.patch(`/loyalty/customers/${other.body.id}`).send({
      email: "ARI@example.test"
    });
    expect(duplicateUpdate.status).toBe(409);
    expect(duplicateUpdate.body).toMatchObject({
      code: "CONFLICT",
      message: "Email address already belongs to a customer."
    });

    const unchanged = await agent.get(`/loyalty/customers/${other.body.id}`);
    expect(unchanged.status).toBe(200);
    expect(unchanged.body).toMatchObject({
      id: other.body.id,
      phone: "083-234-5678",
      email: "nina@example.test"
    });

    const ownAddress = await agent.patch(`/loyalty/customers/${primary.body.id}`).send({
      email: "ari@example.test"
    });
    expect(ownAddress.status).toBe(200);
    expect(ownAddress.body.email).toBe("ari@example.test");
  });

  it("versions earning rules and exposes an associated customer's point balance", async () => {
    const { agent } = await createLoggedInAgent();
    const customer = await agent.post("/loyalty/customers").send({
      name: "Points Ari",
      phone: "084-234-5678"
    });

    const replace = await agent.put("/loyalty/config/earning-rule").send({
      earningType: "purchase_amount",
      amountThreshold: "10.00",
      pointsAwarded: 1
    });
    expect(replace.status).toBe(200);
    expect(replace.body).toMatchObject({ earningType: "purchase_amount", amountThreshold: "10.00" });

    const active = await agent.get("/loyalty/config/earning-rule");
    expect(active.status).toBe(200);
    expect(active.body.rule).toMatchObject({ id: replace.body.id, active: true });

    const points = await agent.get(`/loyalty/customers/${customer.body.id}/points`);
    expect(points.status).toBe(200);
    expect(points.body).toMatchObject({
      customer: { id: customer.body.id },
      summary: { available: 0, lifetimeEarned: 0 },
      history: []
    });

    const menu = await createTestMenuFixture();
    const order = await agent.post("/orders").send({
      beverages: [{
        menuItemId: menu.menuItemId,
        quantity: 1,
        selectedCustomizations: [{ customizationGroupId: menu.groupId, customizationChoiceIds: [menu.wholeMilkChoiceId] }]
      }],
      loyalty: { customerId: customer.body.id }
    });
    expect(order.status).toBe(201);
    expect(order.body.loyalty).toMatchObject({ customer: { id: customer.body.id }, rewards: [] });
  });

  it("creates, lists, and retires staff-managed reward options", async () => {
    const { agent } = await createLoggedInAgent();
    const created = await agent.post("/loyalty/rewards").send({
      name: "Free beverage",
      pointsCost: 10,
      benefitType: "free_beverage",
      benefitDescription: "One beverage free"
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ active: true, benefitType: "free_beverage" });

    const listed = await agent.get("/loyalty/rewards");
    expect(listed.status).toBe(200);
    expect(listed.body.rewards).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.body.id })]));

    const retired = await agent.patch(`/loyalty/rewards/${created.body.id}`).send({ active: false });
    expect(retired.status).toBe(200);
    expect(retired.body).toMatchObject({ id: created.body.id, active: false, benefitType: "free_beverage" });
  });
});
