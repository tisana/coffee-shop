import { asc, eq } from "drizzle-orm";

import type { LoyaltyPointsResponse } from "@coffee-shop/shared/contracts/api";

import { notFound } from "../routes/errors";
import { type Transaction, db } from "../storage/db";
import { loyaltyCustomers, loyaltyPointLedgerEntries, loyaltyOrderAssociations, orders, orderBeverages } from "../storage/schema";
import { currentBusinessDate } from "./businessDate";
import { calculateEarningPoints, getActiveEarningRule } from "./loyaltyConfigurationService";

export async function postOrderEarning(tx: Transaction, orderId: string, staffId: string): Promise<void> {
  const [association] = await tx.select().from(loyaltyOrderAssociations).where(eq(loyaltyOrderAssociations.orderId, orderId)).limit(1);
  if (!association) return;

  const [existing] = await tx
    .select({ id: loyaltyPointLedgerEntries.id })
    .from(loyaltyPointLedgerEntries)
    .where(eq(loyaltyPointLedgerEntries.orderId, orderId))
    .limit(1);
  if (existing) return;

  const rule = await getActiveEarningRule();
  if (!rule) return;

  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return;
  const beverages = await tx.select().from(orderBeverages).where(eq(orderBeverages.orderId, orderId));
  const activeBeverages = beverages.filter((beverage) => beverage.status !== "cancelled");
  const eligibleAmount = activeBeverages
    .reduce((total, beverage) => total + Number(beverage.priceSnapshot) * beverage.quantity, 0)
    .toFixed(2);
  const eligibleBeverageCount = activeBeverages.reduce((total, beverage) => total + beverage.quantity, 0);
  const points = calculateEarningPoints(rule, { amount: eligibleAmount, beverageCount: eligibleBeverageCount });
  if (points <= 0) return;

  await tx.insert(loyaltyPointLedgerEntries).values({
    customerId: association.customerId,
    eventType: "earned",
    pointsDelta: points,
    orderId,
    earningRuleId: rule.id,
    earnedBusinessDate: currentBusinessDate(),
    reason: `Earned ${points} point${points === 1 ? "" : "s"} from order #${order.dailyOrderNumber}.`,
    createdByStaffId: staffId
  });
}

export async function reverseOrderEarning(tx: Transaction, orderId: string, staffId: string): Promise<void> {
  const [earned] = await tx
    .select()
    .from(loyaltyPointLedgerEntries)
    .where(eq(loyaltyPointLedgerEntries.orderId, orderId))
    .limit(1);
  if (!earned || earned.eventType !== "earned") return;

  const [existingAdjustment] = await tx
    .select({ id: loyaltyPointLedgerEntries.id })
    .from(loyaltyPointLedgerEntries)
    .where(eq(loyaltyPointLedgerEntries.orderId, orderId))
    .limit(2);
  if (existingAdjustment) {
    const rows = await tx.select().from(loyaltyPointLedgerEntries).where(eq(loyaltyPointLedgerEntries.orderId, orderId));
    if (rows.some((entry) => entry.eventType === "adjusted")) return;
  }

  await tx.insert(loyaltyPointLedgerEntries).values({
    customerId: earned.customerId,
    eventType: "adjusted",
    pointsDelta: -earned.pointsDelta,
    orderId,
    earningRuleId: earned.earningRuleId,
    reason: "Reversed earned points after order cancellation.",
    createdByStaffId: staffId
  });
}

export async function getLoyaltyPoints(customerId: string): Promise<LoyaltyPointsResponse> {
  const [customer] = await db.select().from(loyaltyCustomers).where(eq(loyaltyCustomers.id, customerId)).limit(1);
  if (!customer) throw notFound("Loyalty customer not found.");

  const entries = await db
    .select({ entry: loyaltyPointLedgerEntries, order: orders })
    .from(loyaltyPointLedgerEntries)
    .leftJoin(orders, eq(loyaltyPointLedgerEntries.orderId, orders.id))
    .where(eq(loyaltyPointLedgerEntries.customerId, customerId))
    .orderBy(asc(loyaltyPointLedgerEntries.occurredAt));
  const deltas = entries.map(({ entry }) => entry.pointsDelta);
  const sum = (predicate: (entry: (typeof entries)[number]["entry"]) => boolean) => entries.filter(({ entry }) => predicate(entry)).reduce((total, { entry }) => total + entry.pointsDelta, 0);

  return {
    customer: { id: customer.id, name: customer.name, phone: customer.phoneDisplay, email: customer.email, enrolledAt: customer.enrolledAt.toISOString(), updatedAt: customer.updatedAt.toISOString() },
    asOfBusinessDate: currentBusinessDate(),
    summary: {
      available: deltas.reduce((total, delta) => total + delta, 0),
      lifetimeEarned: sum((entry) => entry.eventType === "earned"),
      redeemed: Math.max(0, -sum((entry) => entry.eventType === "redeemed")),
      returned: sum((entry) => entry.eventType === "returned"),
      expired: Math.max(0, -sum((entry) => entry.eventType === "expired")),
      adjusted: sum((entry) => entry.eventType === "adjusted")
    },
    history: entries.map(({ entry, order }) => ({
      id: entry.id,
      eventType: entry.eventType,
      pointsDelta: entry.pointsDelta,
      reason: entry.reason,
      businessDate: entry.earnedBusinessDate,
      expirationBusinessDate: entry.expirationBusinessDate,
      orderId: entry.orderId,
      orderLabel: order ? `${order.businessDate} #${order.dailyOrderNumber}` : null,
      rewardName: null,
      occurredAt: entry.occurredAt.toISOString()
    }))
  };
}
