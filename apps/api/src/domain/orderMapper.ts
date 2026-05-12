import type { Order, OrderBeverage } from "@coffee-shop/shared/domain/types";

import type { orderBeverages, orders } from "../storage/schema";

type OrderRow = typeof orders.$inferSelect;
type OrderBeverageRow = typeof orderBeverages.$inferSelect;

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toIsoDateTime(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

export function mapOrderBeverage(row: OrderBeverageRow): OrderBeverage {
  return {
    id: row.id,
    orderId: row.orderId,
    sourceMenuItemId: row.sourceMenuItemId,
    nameSnapshot: row.nameSnapshot,
    quantity: row.quantity,
    priceSnapshot: row.priceSnapshot,
    selectedCustomizationsSnapshot: row.selectedCustomizationsSnapshot,
    specialInstructions: row.specialInstructions,
    status: row.status,
    completedAt: toIsoDateTime(row.completedAt),
    cancelledAt: toIsoDateTime(row.cancelledAt),
    cancellationReason: row.cancellationReason
  };
}

export function mapOrder(row: OrderRow, beverages: OrderBeverageRow[]): Order {
  return {
    id: row.id,
    businessDate: toIsoDate(row.businessDate),
    dailyOrderNumber: row.dailyOrderNumber,
    pickupName: row.pickupName,
    status: row.status,
    createdByStaffId: row.createdByStaffId,
    assignedBaristaId: row.assignedBaristaId,
    total: row.total,
    createdAt: toIsoDateTime(row.createdAt) ?? "",
    queuedAt: toIsoDateTime(row.queuedAt),
    inProgressAt: toIsoDateTime(row.inProgressAt),
    completedAt: toIsoDateTime(row.completedAt),
    pickedUpAt: toIsoDateTime(row.pickedUpAt),
    cancelledAt: toIsoDateTime(row.cancelledAt),
    beverages: beverages.map(mapOrderBeverage)
  };
}
