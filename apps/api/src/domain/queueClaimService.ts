import { and, eq } from "drizzle-orm";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";

import { conflict, notFound } from "../routes/errors";
import { db } from "../storage/db";
import { orders } from "../storage/schema";
import { getOrderById } from "./orderCreationService";
import { getQueueOrderById } from "./queueService";

export async function claimQueuedOrder(orderId: string, staffId: string): Promise<QueueOrder> {
  const [updatedOrder] = await db
    .update(orders)
    .set({
      status: "in_progress",
      assignedBaristaId: staffId,
      inProgressAt: new Date()
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "queued")))
    .returning();

  if (!updatedOrder) {
    const existingOrder = await getOrderById(orderId);

    if (!existingOrder) {
      throw notFound("Order not found.");
    }

    throw conflict("Only queued orders can be claimed from the brew queue.", {
      status: existingOrder.status,
      assignedBaristaId: existingOrder.assignedBaristaId
    });
  }

  const order = await getQueueOrderById(updatedOrder.id);

  if (!order) {
    throw notFound("Order not found.");
  }

  return order;
}
