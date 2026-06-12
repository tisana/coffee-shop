import { describe, expect, it } from "vitest";

import {
  assertCanCancelOrder,
  assertCanCompleteBeverage,
  assertCanCompleteOrder,
  assertCanConfirmPickup,
  assertCanTransitionOrder
} from "../../src/domain/orderStateMachine";

describe("US3 order state machine", () => {
  it("allows valid fulfillment transitions and rejects invalid reversals", () => {
    expect(() => assertCanTransitionOrder("in_progress", "completed")).not.toThrow();
    expect(() => assertCanTransitionOrder("completed", "picked_up")).not.toThrow();

    expect(() => assertCanTransitionOrder("completed", "in_progress")).toThrow(
      "Order cannot transition from completed to in_progress."
    );
    expect(() => assertCanTransitionOrder("picked_up", "cancelled")).toThrow(
      "Order cannot transition from picked_up to cancelled."
    );
  });

  it("guards beverage completion and whole-order completion rules", () => {
    expect(() => assertCanCompleteBeverage("in_progress", "pending")).not.toThrow();
    expect(() => assertCanCompleteBeverage("queued", "pending")).toThrow(
      "Beverages can be completed only while an order is in progress."
    );
    expect(() => assertCanCompleteBeverage("in_progress", "cancelled")).toThrow(
      "Only pending beverages can be completed."
    );

    expect(() => assertCanCompleteOrder("in_progress", 0, 1)).not.toThrow();
    expect(() => assertCanCompleteOrder("in_progress", 1, 1)).toThrow(
      "Order cannot be completed while beverages are still pending."
    );
    expect(() => assertCanCompleteOrder("in_progress", 0, 0)).toThrow(
      "Order cannot be completed when all beverages are cancelled."
    );
  });

  it("guards pickup confirmation and active order cancellation", () => {
    expect(() => assertCanConfirmPickup("completed")).not.toThrow();
    expect(() => assertCanConfirmPickup("in_progress")).toThrow(
      "Pickup can be confirmed only after an order is completed."
    );

    expect(() => assertCanCancelOrder("created")).not.toThrow();
    expect(() => assertCanCancelOrder("completed")).not.toThrow();
    expect(() => assertCanCancelOrder("picked_up")).toThrow("Picked-up orders cannot be cancelled.");
  });
});
