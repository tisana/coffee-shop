import type { BeverageStatus, OrderStatus } from "./types";

export const ORDER_STATUSES = [
  "created",
  "queued",
  "in_progress",
  "completed",
  "picked_up",
  "cancelled"
] as const satisfies readonly OrderStatus[];

export const BEVERAGE_STATUSES = [
  "pending",
  "completed",
  "cancelled"
] as const satisfies readonly BeverageStatus[];

export const orderStatusTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  created: ["queued", "cancelled"],
  queued: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["picked_up", "cancelled"],
  picked_up: [],
  cancelled: []
};

export const beverageStatusTransitions: Record<BeverageStatus, readonly BeverageStatus[]> = {
  pending: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return orderStatusTransitions[from].includes(to);
}

export function canTransitionBeverage(from: BeverageStatus, to: BeverageStatus): boolean {
  return beverageStatusTransitions[from].includes(to);
}
