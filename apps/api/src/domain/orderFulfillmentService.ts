import { and, eq } from "drizzle-orm";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";
import type { Order, OrderWithLoyalty } from "@coffee-shop/shared/domain/types";

import { conflict, notFound } from "../routes/errors";
import { withTransaction } from "../storage/db";
import { orderBeverages, orders } from "../storage/schema";
import { getOrderById } from "./orderCreationService";
import { getQueueOrderById } from "./queueService";
import { postOrderEarning, reverseOrderEarning } from "./loyaltyLedgerService";
import { returnRewardsForOrder } from "./loyaltyRewardService";
import { cancelLoyaltyReward } from "./loyaltyRewardService";
import {
  assertCanCancelOrder,
  assertCanCompleteOrder,
  assertCanConfirmPickup,
  assertCanTransitionOrder
} from "./orderStateMachine";

async function getOrderOrThrow(orderId: string): Promise<Order> {
  const order = await getOrderById(orderId);

  if (!order) {
    throw notFound("Order not found.");
  }

  return order;
}

async function getQueueOrderOrThrow(orderId: string): Promise<QueueOrder> {
  const order = await getQueueOrderById(orderId);

  if (!order) {
    throw notFound("Order not found.");
  }

  return order;
}

export async function completeOrder(orderId: string): Promise<QueueOrder> {
  await withTransaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      throw notFound("Order not found.");
    }

    const beverages = await tx
      .select()
      .from(orderBeverages)
      .where(eq(orderBeverages.orderId, order.id));
    const pendingBeverageCount = beverages.filter((beverage) => beverage.status === "pending").length;
    const activeBeverageCount = beverages.filter((beverage) => beverage.status !== "cancelled").length;

    assertCanCompleteOrder(order.status, pendingBeverageCount, activeBeverageCount);
    assertCanTransitionOrder(order.status, "completed");

    const [updatedOrder] = await tx
      .update(orders)
      .set({
        status: "completed",
        completedAt: new Date()
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
      .returning();

    if (!updatedOrder) {
      throw conflict("Only in-progress orders can be completed.", {
        status: order.status
      });
    }

    await postOrderEarning(tx, order.id, order.createdByStaffId);
  });

  return getQueueOrderOrThrow(orderId);
}

export async function confirmOrderPickup(orderId: string): Promise<Order> {
  await withTransaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      throw notFound("Order not found.");
    }

    assertCanConfirmPickup(order.status);
    assertCanTransitionOrder(order.status, "picked_up");

    const [updatedOrder] = await tx
      .update(orders)
      .set({
        status: "picked_up",
        pickedUpAt: new Date()
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
      .returning();

    if (!updatedOrder) {
      throw conflict("Pickup can be confirmed only after an order is completed.", {
        status: order.status
      });
    }
  });

  return getOrderOrThrow(orderId);
}

export async function cancelOrder(orderId: string): Promise<Order> {
  await withTransaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      throw notFound("Order not found.");
    }

    assertCanCancelOrder(order.status);
    assertCanTransitionOrder(order.status, "cancelled");

    const [updatedOrder] = await tx
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: new Date()
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
      .returning();

    if (!updatedOrder) {
      throw conflict("Order cannot be cancelled from its current state.", {
        status: order.status
      });
    }

    await reverseOrderEarning(tx, order.id, order.createdByStaffId);
    await returnRewardsForOrder(tx, order.createdByStaffId, order.id, "Order cancelled before pickup.");
  });

  return getOrderOrThrow(orderId);
}

export async function cancelOrderLoyaltyReward(orderId: string, redemptionId: string, staffId: string): Promise<OrderWithLoyalty> {
  await withTransaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw notFound("Order not found.");
    assertCanCancelOrder(order.status);
    await cancelLoyaltyReward(tx, staffId, orderId, redemptionId);
  });
  const order = await getOrderById(orderId);
  if (!order) throw notFound("Order not found.");
  return order;
}
