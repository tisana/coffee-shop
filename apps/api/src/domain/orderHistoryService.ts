import { and, asc, eq, ilike, inArray } from "drizzle-orm";

import type { OrderHistoryQuery } from "@coffee-shop/shared/contracts/api";
import type { Order } from "@coffee-shop/shared/domain/types";

import { db } from "../storage/db";
import { orderBeverages, orders } from "../storage/schema";
import { currentBusinessDate } from "./businessDate";
import { mapOrder } from "./orderMapper";

export async function listCurrentDayOrderHistory(
  query: OrderHistoryQuery
): Promise<Order[]> {
  const filters = [eq(orders.businessDate, currentBusinessDate())];

  if (query.dailyOrderNumber !== undefined) {
    filters.push(eq(orders.dailyOrderNumber, query.dailyOrderNumber));
  }

  if (query.status) {
    filters.push(eq(orders.status, query.status));
  }

  if (query.pickupName) {
    filters.push(ilike(orders.pickupName, `%${query.pickupName}%`));
  }

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(...filters))
    .orderBy(asc(orders.dailyOrderNumber));

  if (orderRows.length === 0) {
    return [];
  }

  const beverageRows = await db
    .select()
    .from(orderBeverages)
    .where(
      inArray(
        orderBeverages.orderId,
        orderRows.map((order) => order.id)
      )
    );
  const beveragesByOrderId = new Map<string, typeof beverageRows>();

  for (const beverage of beverageRows) {
    const existing = beveragesByOrderId.get(beverage.orderId) ?? [];
    existing.push(beverage);
    beveragesByOrderId.set(beverage.orderId, existing);
  }

  return orderRows.map((order) => mapOrder(order, beveragesByOrderId.get(order.id) ?? []));
}
