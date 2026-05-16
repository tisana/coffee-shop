import { asc, inArray } from "drizzle-orm";

import type { Order, OrderStatus } from "@coffee-shop/shared/domain/types";

import { db } from "../storage/db";
import { orderBeverages, orders } from "../storage/schema";
import { mapOrder } from "./orderMapper";

const activeQueueStatuses: OrderStatus[] = ["queued", "in_progress", "completed"];

export async function listActiveQueueOrders(): Promise<Order[]> {
  const activeOrders = await db
    .select()
    .from(orders)
    .where(inArray(orders.status, activeQueueStatuses))
    .orderBy(asc(orders.queuedAt), asc(orders.dailyOrderNumber));

  if (activeOrders.length === 0) {
    return [];
  }

  const beverages = await db
    .select()
    .from(orderBeverages)
    .where(
      inArray(
        orderBeverages.orderId,
        activeOrders.map((order) => order.id)
      )
    );
  const beveragesByOrderId = new Map<string, typeof beverages>();

  for (const beverage of beverages) {
    const existing = beveragesByOrderId.get(beverage.orderId) ?? [];
    existing.push(beverage);
    beveragesByOrderId.set(beverage.orderId, existing);
  }

  return activeOrders.map((order) => mapOrder(order, beveragesByOrderId.get(order.id) ?? []));
}
