import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app";
import { cleanupLoyaltyFixtureData, createLoggedInAgent } from "./testFixtures";

describe("loyalty customer contract", () => {
  afterEach(async () => {
    await cleanupLoyaltyFixtureData();
  });

  it("requires staff access and supports customer registration, search, retrieval, and editing", async () => {
    const unauthorized = await request(createApp()).get("/loyalty/customers?query=Ari");
    expect(unauthorized.status).toBe(401);

    const { agent } = await createLoggedInAgent();
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
});
