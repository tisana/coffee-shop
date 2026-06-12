import { eq, and } from "drizzle-orm";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";

import { conflict, notFound } from "../routes/errors";
import { withTransaction } from "../storage/db";
import { orderBeverages, orders } from "../storage/schema";
import { getQueueOrderById } from "./queueService";
import { assertCanCancelBeverage, assertCanCompleteBeverage } from "./orderStateMachine";

async function getQueueOrderOrThrow(orderId: string): Promise<QueueOrder> {
  const order = await getQueueOrderById(orderId);

  if (!order) {
    throw notFound("Order not found.");
  }

  return order;
}

export async function completeOrderBeverage(
  orderId: string,
  beverageId: string
): Promise<QueueOrder> {
  await withTransaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      throw notFound("Order not found.");
    }

    const [beverage] = await tx
      .select()
      .from(orderBeverages)
      .where(and(eq(orderBeverages.id, beverageId), eq(orderBeverages.orderId, order.id)))
      .limit(1);

    if (!beverage) {
      throw notFound("Beverage not found.");
    }

    assertCanCompleteBeverage(order.status, beverage.status);

    const [updatedBeverage] = await tx
      .update(orderBeverages)
      .set({
        status: "completed",
        completedAt: new Date()
      })
      .where(and(eq(orderBeverages.id, beverage.id), eq(orderBeverages.status, "pending")))
      .returning();

    if (!updatedBeverage) {
      throw conflict("Only pending beverages can be completed.", {
        status: beverage.status
      });
    }
  });

  return getQueueOrderOrThrow(orderId);
}

export async function cancelOrderBeverage(
  orderId: string,
  beverageId: string,
  reason?: string | undefined
): Promise<QueueOrder> {
  await withTransaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      throw notFound("Order not found.");
    }

    const [beverage] = await tx
      .select()
      .from(orderBeverages)
      .where(and(eq(orderBeverages.id, beverageId), eq(orderBeverages.orderId, order.id)))
      .limit(1);

    if (!beverage) {
      throw notFound("Beverage not found.");
    }

    assertCanCancelBeverage(order.status, beverage.status);

    const [updatedBeverage] = await tx
      .update(orderBeverages)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        ...(reason ? { cancellationReason: reason } : {})
      })
      .where(and(eq(orderBeverages.id, beverage.id), eq(orderBeverages.status, "pending")))
      .returning();

    if (!updatedBeverage) {
      throw conflict("Only pending beverages can be cancelled.", {
        status: beverage.status
      });
    }
  });

  return getQueueOrderOrThrow(orderId);
}
