import { describe, expect, it } from "vitest";

import {
  createOrderRequestSchema,
  historyQuerySchema,
  loginRequestSchema,
  menuItemInputSchema
} from "../../src/routes/validators";

const categoryId = "8a7ea15d-9d7f-4d95-859d-5eb0c5a40f4f";
const menuItemId = "2d20d6c7-337e-4216-a900-b7dcdf4fc2eb";

describe("route validators", () => {
  it("accepts valid login and rejects empty credentials", () => {
    expect(loginRequestSchema.parse({ username: "sam", password: "secret" })).toEqual({
      username: "sam",
      password: "secret"
    });

    expect(() => loginRequestSchema.parse({ username: "", password: "" })).toThrow();
  });

  it("requires at least one beverage for order creation", () => {
    expect(
      createOrderRequestSchema.parse({
        pickupName: "Ari",
        beverages: [{ menuItemId, quantity: 2 }]
      })
    ).toEqual({
      pickupName: "Ari",
      beverages: [{ menuItemId, quantity: 2, selectedCustomizations: [] }]
    });

    expect(() => createOrderRequestSchema.parse({ beverages: [] })).toThrow();
  });

  it("validates menu item maintenance and history filters", () => {
    expect(
      menuItemInputSchema.parse({
        categoryId,
        name: "Latte",
        price: "4.50"
      })
    ).toMatchObject({ price: "4.50", available: true, active: true });

    expect(historyQuerySchema.parse({ dailyOrderNumber: "7", status: "queued" })).toEqual({
      dailyOrderNumber: 7,
      status: "queued"
    });
  });
});
