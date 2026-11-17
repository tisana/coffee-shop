import { describe, expect, it } from "vitest";

import {
  createOrderRequestSchema,
  createOrderWithLoyaltyRequestSchema,
  historyQuerySchema,
  loyaltyCustomerUpdateSchema,
  loyaltyEarningRuleInputSchema,
  loginRequestSchema,
  menuItemInputSchema,
  menuItemUpdateInputSchema,
  reportOrdersQuerySchema,
  reportSalesQuerySchema
} from "../../src/routes/validators";

const categoryId = "8a7ea15d-9d7f-4d95-859d-5eb0c5a40f4f";
const menuItemId = "2d20d6c7-337e-4216-a900-b7dcdf4fc2eb";

describe("route validators", () => {
  it("preserves order and loyalty defaults when fields are omitted", () => {
    const beverages = [{ menuItemId, quantity: "2" }];
    expect(createOrderWithLoyaltyRequestSchema.parse({ beverages })).toEqual({
      beverages: [{ menuItemId, quantity: 2, selectedCustomizations: [] }]
    });
    expect(createOrderWithLoyaltyRequestSchema.parse({ beverages, loyalty: { customerId: categoryId } })).toMatchObject({
      loyalty: { customerId: categoryId, rewards: [] }
    });
  });

  it("preserves customer email omission, clearing, and trimming", () => {
    expect(loyaltyCustomerUpdateSchema.parse({ name: "Alex" })).toEqual({ name: "Alex" });
    expect(loyaltyCustomerUpdateSchema.parse({ email: "  " })).toEqual({ email: null });
    expect(loyaltyCustomerUpdateSchema.parse({ email: null })).toEqual({ email: null });
    expect(loyaltyCustomerUpdateSchema.parse({ email: " user@example.com " })).toEqual({ email: "user@example.com" });
    expect(() => loyaltyCustomerUpdateSchema.parse({})).toThrow("At least one customer field is required.");
  });

  it("preserves menu defaults and omitted update groups", () => {
    const input = { categoryId, name: "Latte", price: 4.5 };
    expect(menuItemInputSchema.parse({ ...input, customizationGroups: [{ name: "Milk", choices: [{ name: "Soy" }] }] })).toMatchObject({
      price: "4.50", available: true, active: true,
      customizationGroups: [{ required: false, minSelections: 0, maxSelections: 1, choices: [{ priceAdjustment: "0.00", available: true, active: true }] }]
    });
    expect(menuItemUpdateInputSchema.parse(input)).not.toHaveProperty("customizationGroups");
  });

  it("preserves report defaults and rejects invalid rule thresholds", () => {
    expect(reportSalesQuerySchema.parse({})).toEqual({ period: "daily", statuses: ["completed", "picked_up"] });
    expect(loyaltyEarningRuleInputSchema.safeParse({ earningType: "purchase_amount", pointsAwarded: 1 }).success).toBe(false);
  });

  it("rejects invalid order quantities and identifiers", () => {
    for (const quantity of [undefined, 1.5]) {
      expect(createOrderRequestSchema.safeParse({ beverages: [{ menuItemId, quantity }] }).success).toBe(false);
    }
    expect(createOrderRequestSchema.safeParse({ beverages: [{ menuItemId: "invalid", quantity: 1 }] }).success).toBe(false);
  });
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

  it("validates report filters and rejects invalid report ranges", () => {
    expect(
      reportSalesQuerySchema.parse({
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        period: "weekly",
        statuses: "completed,picked_up",
        menuCategoryId: categoryId,
        menuItemId
      })
    ).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "weekly",
      statuses: ["completed", "picked_up"],
      menuCategoryId: categoryId,
      menuItemId
    });

    expect(
      reportOrdersQuerySchema.parse({
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        period: "daily",
        periodKey: "2026-06-12",
        combinationKey: "latte:1|mocha:1"
      })
    ).toMatchObject({
      period: "daily",
      statuses: ["completed", "picked_up"],
      periodKey: "2026-06-12",
      combinationKey: "latte:1|mocha:1"
    });

    expect(() =>
      reportSalesQuerySchema.parse({
        startDate: "2026-06-30",
        endDate: "2026-06-01"
      })
    ).toThrow();
  });
});
