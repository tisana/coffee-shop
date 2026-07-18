import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { LoyaltyPointsResponse } from "@coffee-shop/shared/contracts/api";

import { badRequest, notFound } from "../routes/errors";
import { type Transaction, withTransaction } from "../storage/db";
import { loyaltyCustomers, loyaltyPointAllocations, loyaltyPointLedgerEntries, loyaltyOrderAssociations, loyaltyRewardRedemptions, orders, orderBeverages } from "../storage/schema";
import { currentBusinessDate } from "./businessDate";
import { calculateEarningPoints, calculateExpirationBusinessDate, getActiveEarningRule, getActiveExpirationPolicy } from "./loyaltyConfigurationService";

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
  const expirationPolicy = await getActiveExpirationPolicy();

  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return;
  const beverages = await tx.select().from(orderBeverages).where(eq(orderBeverages.orderId, orderId));
  const activeRewards = await tx.select().from(loyaltyRewardRedemptions)
    .where(and(eq(loyaltyRewardRedemptions.orderId, orderId), eq(loyaltyRewardRedemptions.status, "active")));
  const activeBeverages = beverages.filter((beverage) => beverage.status !== "cancelled");
  const eligibleAmount = (
    activeBeverages.reduce((total, beverage) => total + Number(beverage.priceSnapshot) * beverage.quantity, 0) -
    activeRewards.reduce((total, reward) => total + Number(reward.coveredAmountSnapshot), 0)
  ).toFixed(2);
  const eligibleBeverageCount = activeBeverages.reduce((total, beverage) => total + beverage.quantity, 0) - activeRewards.reduce((total, reward) => total + reward.coveredBeverageQuantity, 0);
  const points = calculateEarningPoints(rule, { amount: eligibleAmount, beverageCount: eligibleBeverageCount });
  if (points <= 0) return;

  const earnedBusinessDate = currentBusinessDate();
  await tx.insert(loyaltyPointLedgerEntries).values({
    customerId: association.customerId,
    eventType: "earned",
    pointsDelta: points,
    orderId,
    earningRuleId: rule.id,
    expirationPolicyId: expirationPolicy?.id,
    earnedBusinessDate,
    expirationBusinessDate: expirationPolicy?.enabled && expirationPolicy.expirationMonths
      ? calculateExpirationBusinessDate(earnedBusinessDate, expirationPolicy.expirationMonths)
      : null,
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

export async function redeemPoints(
  tx: Transaction, customerId: string, rewardRedemptionId: string | null, pointsCost: number, reason: string, staffId?: string
): Promise<string> {
  await materializeExpiredPoints(tx, customerId);
  const credits = await tx.select().from(loyaltyPointLedgerEntries)
    .where(eq(loyaltyPointLedgerEntries.customerId, customerId))
    .orderBy(asc(loyaltyPointLedgerEntries.expirationBusinessDate), asc(loyaltyPointLedgerEntries.occurredAt));
  const creditEntries = credits.filter((entry) => entry.pointsDelta > 0 && (entry.eventType === "earned" || entry.eventType === "returned"));
  const allocations = creditEntries.length === 0 ? [] : await tx.select().from(loyaltyPointAllocations)
    .where(inArray(loyaltyPointAllocations.creditEntryId, creditEntries.map((entry) => entry.id)));
  const usedByCredit = new Map<string, number>();
  for (const allocation of allocations) usedByCredit.set(allocation.creditEntryId, (usedByCredit.get(allocation.creditEntryId) ?? 0) + allocation.points);
  let remaining = pointsCost;
  const selections: Array<{ creditId: string; points: number }> = [];
  for (const credit of creditEntries) {
    const available = credit.pointsDelta - (usedByCredit.get(credit.id) ?? 0);
    const points = Math.min(available, remaining);
    if (points > 0) selections.push({ creditId: credit.id, points });
    remaining -= points;
    if (remaining === 0) break;
  }
  if (remaining > 0) throw badRequest("Customer does not have enough points for this reward.");
  const [debit] = await tx.insert(loyaltyPointLedgerEntries).values({ customerId, eventType: "redeemed", pointsDelta: -pointsCost, rewardRedemptionId: rewardRedemptionId ?? undefined, reason, createdByStaffId: staffId }).returning();
  if (!debit) throw new Error("Unable to redeem loyalty points.");
  if (selections.length > 0) await tx.insert(loyaltyPointAllocations).values(selections.map((selection) => ({ customerId, creditEntryId: selection.creditId, debitEntryId: debit.id, points: selection.points })));
  return debit.id;
}

export async function returnRedeemedPoints(
  tx: Transaction, customerId: string, debitEntryId: string, rewardRedemptionId: string | null, reason: string, staffId?: string
): Promise<void> {
  if (rewardRedemptionId) {
    const existingReturns = await tx.select({ id: loyaltyPointLedgerEntries.id }).from(loyaltyPointLedgerEntries)
      .where(eq(loyaltyPointLedgerEntries.rewardRedemptionId, rewardRedemptionId));
    if (existingReturns.some((entry) => entry.id !== debitEntryId)) return;
  }
  const allocations = await tx.select({ allocation: loyaltyPointAllocations, credit: loyaltyPointLedgerEntries })
    .from(loyaltyPointAllocations).innerJoin(loyaltyPointLedgerEntries, eq(loyaltyPointAllocations.creditEntryId, loyaltyPointLedgerEntries.id))
    .where(eq(loyaltyPointAllocations.debitEntryId, debitEntryId));
  for (const { allocation, credit } of allocations) {
    await tx.insert(loyaltyPointLedgerEntries).values({ customerId, eventType: "returned", pointsDelta: allocation.points, rewardRedemptionId: rewardRedemptionId ?? undefined, expirationPolicyId: credit.expirationPolicyId, earnedBusinessDate: currentBusinessDate(), expirationBusinessDate: credit.expirationBusinessDate, reason, createdByStaffId: staffId });
  }
}

export async function materializeExpiredPoints(
  tx: Transaction,
  customerId: string,
  asOfBusinessDate = currentBusinessDate()
): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${customerId}))`);
  const entries = await tx
    .select()
    .from(loyaltyPointLedgerEntries)
    .where(eq(loyaltyPointLedgerEntries.customerId, customerId));
  const credits = entries.filter((entry) => entry.pointsDelta > 0 && (entry.eventType === "earned" || entry.eventType === "returned"));
  const allocations = credits.length === 0
    ? []
    : await tx.select().from(loyaltyPointAllocations).where(inArray(loyaltyPointAllocations.creditEntryId, credits.map((entry) => entry.id)));
  const usedByCredit = new Map<string, number>();
  for (const allocation of allocations) {
    usedByCredit.set(allocation.creditEntryId, (usedByCredit.get(allocation.creditEntryId) ?? 0) + allocation.points);
  }

  for (const credit of credits) {
    if (!credit.expirationBusinessDate || credit.expirationBusinessDate >= asOfBusinessDate) continue;
    const remaining = credit.pointsDelta - (usedByCredit.get(credit.id) ?? 0);
    if (remaining <= 0) continue;
    const [debit] = await tx.insert(loyaltyPointLedgerEntries).values({
      customerId,
      eventType: "expired",
      pointsDelta: -remaining,
      expirationPolicyId: credit.expirationPolicyId,
      earnedBusinessDate: asOfBusinessDate,
      expirationBusinessDate: credit.expirationBusinessDate,
      reason: `Expired ${remaining} point${remaining === 1 ? "" : "s"} after ${credit.expirationBusinessDate}.`
    }).returning();
    if (!debit) throw new Error("Unable to expire loyalty points.");
    await tx.insert(loyaltyPointAllocations).values({ customerId, creditEntryId: credit.id, debitEntryId: debit.id, points: remaining });
  }
}

export async function getLoyaltyPoints(customerId: string): Promise<LoyaltyPointsResponse> {
  return withTransaction(async (tx) => {
    await materializeExpiredPoints(tx, customerId);
    const [customer] = await tx.select().from(loyaltyCustomers).where(eq(loyaltyCustomers.id, customerId)).limit(1);
    if (!customer) throw notFound("Loyalty customer not found.");

    const entries = await tx
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
  });
}
