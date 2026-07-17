import { and, eq, inArray, sql } from "drizzle-orm";

import type { LoyaltyRewardSelection } from "@coffee-shop/shared/contracts/api";
import type { OrderBeverage } from "@coffee-shop/shared/domain/types";

import { badRequest, conflict, notFound } from "../routes/errors";
import { type Transaction } from "../storage/db";
import {
  customizationChoices,
  loyaltyPointLedgerEntries,
  loyaltyRewardOptions,
  loyaltyRewardRedemptions,
  orders
} from "../storage/schema";
import { redeemPoints, returnRedeemedPoints } from "./loyaltyLedgerService";

type RedemptionRow = typeof loyaltyRewardRedemptions.$inferSelect;

export async function applyRewardSelections(
  tx: Transaction,
  staffId: string,
  orderId: string,
  customerId: string,
  beverages: OrderBeverage[],
  selections: LoyaltyRewardSelection[]
): Promise<void> {
  if (selections.length === 0) return;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${customerId}))`);
  const rewardIds = [...new Set(selections.map((selection) => selection.rewardOptionId))];
  const options = await tx.select().from(loyaltyRewardOptions)
    .where(and(inArray(loyaltyRewardOptions.id, rewardIds), eq(loyaltyRewardOptions.active, true)));
  const optionById = new Map(options.map((option) => [option.id, option]));
  const targetCounts = new Map<number, number>();

  for (const selection of selections) {
    const option = optionById.get(selection.rewardOptionId);
    const beverage = beverages[selection.targetBeverageIndex];
    if (!option) throw badRequest("Selected loyalty reward is no longer active.");
    if (!beverage || beverage.status === "cancelled") throw badRequest("Reward target beverage is not available.");
    const used = (targetCounts.get(selection.targetBeverageIndex) ?? 0) + 1;
    if (used > beverage.quantity) throw badRequest("A beverage unit cannot receive more than one reward.");
    targetCounts.set(selection.targetBeverageIndex, used);

    let targetCustomizationChoiceId: string | null = null;
    let coveredAmount = Number(beverage.priceSnapshot);
    let targetDescription = beverage.nameSnapshot;
    if (option.benefitType === "size_upgrade") {
      if (!selection.targetCustomizationChoiceId) throw badRequest("A size-upgrade reward requires a selected size adjustment.");
      const [choice] = await tx.select().from(customizationChoices)
        .where(eq(customizationChoices.id, selection.targetCustomizationChoiceId)).limit(1);
      const selected = beverage.selectedCustomizationsSnapshot.flatMap((group) => group.choices)
        .find((candidate) => candidate.choiceName === choice?.name && candidate.priceAdjustment === choice?.priceAdjustment);
      if (!choice || !selected || Number(choice.priceAdjustment) <= 0) throw badRequest("The reward target must be a selected positive-price size adjustment.");
      targetCustomizationChoiceId = choice.id;
      coveredAmount = Number(choice.priceAdjustment);
      targetDescription = `${beverage.nameSnapshot}: ${choice.name}`;
    }

    const [redemption] = await tx.insert(loyaltyRewardRedemptions).values({
      orderId, customerId, rewardOptionId: option.id, targetOrderBeverageId: beverage.id, targetCustomizationChoiceId,
      rewardNameSnapshot: option.name, pointsCostSnapshot: option.pointsCost, benefitTypeSnapshot: option.benefitType,
      benefitDescriptionSnapshot: option.benefitDescription, targetDescriptionSnapshot: targetDescription,
      coveredAmountSnapshot: coveredAmount.toFixed(2), coveredBeverageQuantity: option.benefitType === "free_beverage" ? 1 : 0,
      redeemedByStaffId: staffId
    }).returning();
    if (!redemption) throw new Error("Unable to apply loyalty reward.");
    await redeemPoints(tx, customerId, redemption.id, option.pointsCost, `Redeemed ${option.name}.`, staffId);
  }
  const active = await tx.select().from(loyaltyRewardRedemptions)
    .where(and(eq(loyaltyRewardRedemptions.orderId, orderId), eq(loyaltyRewardRedemptions.status, "active")));
  const total = active.reduce((sum, reward) => sum + Number(reward.coveredAmountSnapshot), 0).toFixed(2);
  await tx.update(orders).set({ loyaltyRewardDiscountTotal: total }).where(eq(orders.id, orderId));
}

export async function cancelLoyaltyReward(
  tx: Transaction,
  staffId: string,
  orderId: string,
  redemptionId: string,
  reason = "Reward cancelled before pickup."
): Promise<void> {
  const [redemption] = await tx.select().from(loyaltyRewardRedemptions)
    .where(and(eq(loyaltyRewardRedemptions.id, redemptionId), eq(loyaltyRewardRedemptions.orderId, orderId))).limit(1);
  if (!redemption) throw notFound("Loyalty reward redemption not found.");
  if (redemption.status !== "active") throw conflict("This loyalty reward has already been returned.");
  await returnRedemption(tx, redemption, staffId, reason);
}

export async function returnRewardsForTarget(
  tx: Transaction, staffId: string, orderId: string, beverageId: string, reason: string
): Promise<void> {
  const redemptions = await tx.select().from(loyaltyRewardRedemptions)
    .where(and(eq(loyaltyRewardRedemptions.orderId, orderId), eq(loyaltyRewardRedemptions.targetOrderBeverageId, beverageId), eq(loyaltyRewardRedemptions.status, "active")));
  for (const redemption of redemptions) await returnRedemption(tx, redemption, staffId, reason);
}

export async function returnRewardsForOrder(tx: Transaction, staffId: string, orderId: string, reason: string): Promise<void> {
  const redemptions = await tx.select().from(loyaltyRewardRedemptions)
    .where(and(eq(loyaltyRewardRedemptions.orderId, orderId), eq(loyaltyRewardRedemptions.status, "active")));
  for (const redemption of redemptions) await returnRedemption(tx, redemption, staffId, reason);
}

async function returnRedemption(tx: Transaction, redemption: RedemptionRow, staffId: string, reason: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${redemption.customerId}))`);
  const [debit] = await tx.select().from(loyaltyPointLedgerEntries)
    .where(and(eq(loyaltyPointLedgerEntries.rewardRedemptionId, redemption.id), eq(loyaltyPointLedgerEntries.eventType, "redeemed"))).limit(1);
  if (!debit) throw new Error("Reward redemption ledger entry is missing.");
  await returnRedeemedPoints(tx, redemption.customerId, debit.id, redemption.id, reason, staffId);
  await tx.update(loyaltyRewardRedemptions).set({ status: "returned", returnedAt: new Date(), returnedReason: reason, returnedByStaffId: staffId })
    .where(and(eq(loyaltyRewardRedemptions.id, redemption.id), eq(loyaltyRewardRedemptions.status, "active")));
  const active = await tx.select().from(loyaltyRewardRedemptions)
    .where(and(eq(loyaltyRewardRedemptions.orderId, redemption.orderId), eq(loyaltyRewardRedemptions.status, "active")));
  const total = active.reduce((sum, reward) => sum + Number(reward.coveredAmountSnapshot), 0).toFixed(2);
  await tx.update(orders).set({ loyaltyRewardDiscountTotal: total }).where(eq(orders.id, redemption.orderId));
}
