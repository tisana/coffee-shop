import { describe, expect, it } from "vitest";

import {
  BEVERAGE_STATUSES,
  ORDER_STATUSES,
  canTransitionOrder,
  orderStatusTransitions
} from "./status";

describe("shared status rules", () => {
  it("defines the supported order and beverage statuses", () => {
    expect(ORDER_STATUSES).toEqual([
      "created",
      "queued",
      "in_progress",
      "completed",
      "picked_up",
      "cancelled"
    ]);
    expect(BEVERAGE_STATUSES).toEqual(["pending", "completed", "cancelled"]);
  });

  it("allows only constitution-approved order transitions", () => {
    expect(canTransitionOrder("created", "queued")).toBe(true);
    expect(canTransitionOrder("queued", "in_progress")).toBe(true);
    expect(canTransitionOrder("completed", "picked_up")).toBe(true);
    expect(canTransitionOrder("picked_up", "cancelled")).toBe(false);
    expect(canTransitionOrder("completed", "in_progress")).toBe(false);
    expect(orderStatusTransitions.in_progress).toEqual(["completed", "cancelled"]);
  });
});
