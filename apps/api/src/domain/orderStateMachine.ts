import type { BeverageStatus, OrderStatus } from "@coffee-shop/shared/domain/types";
import { canTransitionBeverage, canTransitionOrder } from "@coffee-shop/shared/domain/status";

import { conflict } from "../routes/errors";

export function assertCanTransitionOrder(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw conflict(`Order cannot transition from ${from} to ${to}.`, {
      status: from,
      targetStatus: to
    });
  }
}

export function assertCanTransitionBeverage(from: BeverageStatus, to: BeverageStatus): void {
  if (!canTransitionBeverage(from, to)) {
    throw conflict(`Beverage cannot transition from ${from} to ${to}.`, {
      status: from,
      targetStatus: to
    });
  }
}

export function assertCanCompleteBeverage(
  orderStatus: OrderStatus,
  beverageStatus: BeverageStatus
): void {
  if (orderStatus !== "in_progress") {
    throw conflict("Beverages can be completed only while an order is in progress.", {
      status: orderStatus
    });
  }

  if (beverageStatus !== "pending") {
    throw conflict("Only pending beverages can be completed.", {
      status: beverageStatus
    });
  }
}

export function assertCanCancelBeverage(
  orderStatus: OrderStatus,
  beverageStatus: BeverageStatus
): void {
  if (orderStatus !== "in_progress") {
    throw conflict("Beverages can be cancelled only while an order is in progress.", {
      status: orderStatus
    });
  }

  if (beverageStatus !== "pending") {
    throw conflict("Only pending beverages can be cancelled.", {
      status: beverageStatus
    });
  }
}

export function assertCanCompleteOrder(
  orderStatus: OrderStatus,
  pendingBeverageCount: number,
  activeBeverageCount: number
): void {
  if (orderStatus !== "in_progress") {
    throw conflict("Only in-progress orders can be completed.", {
      status: orderStatus
    });
  }

  if (pendingBeverageCount > 0) {
    throw conflict("Order cannot be completed while beverages are still pending.", {
      status: orderStatus,
      pendingBeverageCount
    });
  }

  if (activeBeverageCount === 0) {
    throw conflict("Order cannot be completed when all beverages are cancelled.", {
      status: orderStatus,
      activeBeverageCount
    });
  }
}

export function assertCanConfirmPickup(orderStatus: OrderStatus): void {
  if (orderStatus !== "completed") {
    throw conflict("Pickup can be confirmed only after an order is completed.", {
      status: orderStatus
    });
  }
}

export function assertCanCancelOrder(orderStatus: OrderStatus): void {
  if (orderStatus === "picked_up") {
    throw conflict("Picked-up orders cannot be cancelled.", {
      status: orderStatus
    });
  }

  if (orderStatus === "cancelled") {
    throw conflict("Order is already cancelled.", {
      status: orderStatus
    });
  }
}
