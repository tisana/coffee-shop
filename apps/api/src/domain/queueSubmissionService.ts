import { and, eq } from "drizzle-orm";

import type { Order } from "@coffee-shop/shared/domain/types";

import { conflict, notFound } from "../routes/errors";
import { db } from "../storage/db";
import { orders } from "../storage/schema";
import { getOrderById } from "./orderCreationService";

export async function submitOrderToQueue(orderId: string): Promise<Order> {
  const [updatedOrder] = await db
    .update(orders)
    .set({
      status: "queued",
      queuedAt: new Date()
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "created")))
    .returning();

  if (!updatedOrder) {
    const existingOrder = await getOrderById(orderId);

    if (!existingOrder) {
      throw notFound("Order not found.");
    }

    throw conflict("Only created orders can be pushed to the brew queue.", {
      status: existingOrder.status
    });
  }

  const order = await getOrderById(updatedOrder.id);

  if (!order) {
    throw notFound("Order not found.");
  }

  return order;
}
