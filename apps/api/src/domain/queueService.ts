import { asc, eq, inArray } from "drizzle-orm";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";
import type { OrderStatus } from "@coffee-shop/shared/domain/types";

import { db } from "../storage/db";
import { orderBeverages, orders, staffUsers } from "../storage/schema";
import { mapOrder } from "./orderMapper";

const activeQueueStatuses: OrderStatus[] = ["queued", "in_progress", "completed"];

function mapQueueOrder(
  row: typeof orders.$inferSelect,
  beverages: Array<typeof orderBeverages.$inferSelect>,
  assignedBaristaDisplayName: string | null
): QueueOrder {
  return {
    ...mapOrder(row, beverages),
    assignedBaristaDisplayName
  };
}

export async function listActiveQueueOrders(): Promise<QueueOrder[]> {
  const activeOrders = await db
    .select({
      order: orders,
      assignedBaristaDisplayName: staffUsers.displayName
    })
    .from(orders)
    .leftJoin(staffUsers, eq(orders.assignedBaristaId, staffUsers.id))
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
        activeOrders.map(({ order }) => order.id)
      )
    );
  const beveragesByOrderId = new Map<string, typeof beverages>();

  for (const beverage of beverages) {
    const existing = beveragesByOrderId.get(beverage.orderId) ?? [];
    existing.push(beverage);
    beveragesByOrderId.set(beverage.orderId, existing);
  }

  return activeOrders.map(({ order, assignedBaristaDisplayName }) =>
    mapQueueOrder(order, beveragesByOrderId.get(order.id) ?? [], assignedBaristaDisplayName)
  );
}

export async function getQueueOrderById(orderId: string): Promise<QueueOrder | null> {
  const [result] = await db
    .select({
      order: orders,
      assignedBaristaDisplayName: staffUsers.displayName
    })
    .from(orders)
    .leftJoin(staffUsers, eq(orders.assignedBaristaId, staffUsers.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!result) {
    return null;
  }

  const beverages = await db
    .select()
    .from(orderBeverages)
    .where(eq(orderBeverages.orderId, result.order.id));

  return mapQueueOrder(result.order, beverages, result.assignedBaristaDisplayName);
}
