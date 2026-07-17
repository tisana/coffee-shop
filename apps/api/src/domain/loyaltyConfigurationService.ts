import { asc, desc, eq } from "drizzle-orm";

import type { LoyaltyEarningRuleInput, LoyaltyRewardOptionInput, LoyaltyRewardOptionUpdate } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyEarningRule, LoyaltyRewardOption } from "@coffee-shop/shared/domain/types";

import { badRequest } from "../routes/errors";
import { db, withTransaction } from "../storage/db";
import { loyaltyEarningRules, loyaltyRewardOptions } from "../storage/schema";

type EarningRuleRow = typeof loyaltyEarningRules.$inferSelect;
type RewardOptionRow = typeof loyaltyRewardOptions.$inferSelect;

export function calculateEarningPoints(
  rule: Pick<LoyaltyEarningRule, "earningType" | "amountThreshold" | "beverageCountThreshold" | "pointsAwarded">,
  eligible: { amount: string; beverageCount: number }
): number {
  if (rule.earningType === "purchase_amount") {
    return Math.floor(Number(eligible.amount) / Number(rule.amountThreshold)) * rule.pointsAwarded;
  }

  return Math.floor(eligible.beverageCount / Number(rule.beverageCountThreshold)) * rule.pointsAwarded;
}

export async function getActiveEarningRule(): Promise<LoyaltyEarningRule | null> {
  const [rule] = await db
    .select()
    .from(loyaltyEarningRules)
    .where(eq(loyaltyEarningRules.active, true))
    .orderBy(desc(loyaltyEarningRules.effectiveAt))
    .limit(1);

  return rule ? toEarningRule(rule) : null;
}

export async function replaceActiveEarningRule(
  staffId: string,
  input: LoyaltyEarningRuleInput
): Promise<LoyaltyEarningRule> {
  assertEarningRule(input);

  return withTransaction(async (tx) => {
    const now = new Date();
    await tx
      .update(loyaltyEarningRules)
      .set({ active: false, retiredAt: now })
      .where(eq(loyaltyEarningRules.active, true));

    const [rule] = await tx
      .insert(loyaltyEarningRules)
      .values({
        earningType: input.earningType,
        amountThreshold: input.earningType === "purchase_amount" ? input.amountThreshold : null,
        beverageCountThreshold: input.earningType === "beverage_count" ? input.beverageCountThreshold : null,
        pointsAwarded: input.pointsAwarded,
        active: true,
        effectiveAt: now,
        createdByStaffId: staffId
      })
      .returning();

    if (!rule) {
      throw new Error("Unable to save loyalty earning rule.");
    }

    return toEarningRule(rule);
  });
}

export async function listLoyaltyRewardOptions(activeOnly = false): Promise<LoyaltyRewardOption[]> {
  const query = db.select().from(loyaltyRewardOptions).orderBy(asc(loyaltyRewardOptions.effectiveAt));
  const rows = activeOnly ? await query.where(eq(loyaltyRewardOptions.active, true)) : await query;
  return rows.map(toRewardOption);
}

export async function createLoyaltyRewardOption(staffId: string, input: LoyaltyRewardOptionInput): Promise<LoyaltyRewardOption> {
  assertRewardInput(input);
  const [reward] = await db.insert(loyaltyRewardOptions).values({
    name: input.name.trim(), pointsCost: input.pointsCost, benefitType: input.benefitType,
    benefitDescription: input.benefitDescription.trim(), active: input.active ?? true,
    createdByStaffId: staffId, updatedByStaffId: staffId
  }).returning();
  if (!reward) throw new Error("Unable to create loyalty reward.");
  return toRewardOption(reward);
}

export async function updateLoyaltyRewardOption(staffId: string, rewardId: string, input: LoyaltyRewardOptionUpdate): Promise<LoyaltyRewardOption> {
  if (Object.keys(input).length === 0) throw badRequest("At least one reward field is required.");
  assertRewardInput({ name: input.name ?? "saved", pointsCost: input.pointsCost ?? 1, benefitType: "free_beverage", benefitDescription: input.benefitDescription ?? "saved" });
  const [reward] = await db.update(loyaltyRewardOptions).set({
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.pointsCost !== undefined ? { pointsCost: input.pointsCost } : {}),
    ...(input.benefitDescription !== undefined ? { benefitDescription: input.benefitDescription.trim() } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}), updatedAt: new Date(), updatedByStaffId: staffId
  }).where(eq(loyaltyRewardOptions.id, rewardId)).returning();
  if (!reward) throw badRequest("Loyalty reward does not exist.");
  return toRewardOption(reward);
}

function assertEarningRule(input: LoyaltyEarningRuleInput): void {
  const isAmount = input.earningType === "purchase_amount";
  const validAmount = typeof input.amountThreshold === "string" && Number(input.amountThreshold) > 0;
  const validCount = Number.isInteger(input.beverageCountThreshold) && Number(input.beverageCountThreshold) > 0;

  if (!Number.isInteger(input.pointsAwarded) || input.pointsAwarded <= 0 || (isAmount ? !validAmount || input.beverageCountThreshold !== undefined : !validCount || input.amountThreshold !== undefined)) {
    throw badRequest("Earning type must have one positive matching threshold and positive whole points.");
  }
}

function assertRewardInput(input: LoyaltyRewardOptionInput): void {
  if (!input.name.trim() || !input.benefitDescription.trim() || !Number.isInteger(input.pointsCost) || input.pointsCost <= 0) {
    throw badRequest("Reward name, description, and a positive whole point cost are required.");
  }
}

function toEarningRule(rule: EarningRuleRow): LoyaltyEarningRule {
  return {
    id: rule.id,
    earningType: rule.earningType,
    amountThreshold: rule.amountThreshold,
    beverageCountThreshold: rule.beverageCountThreshold,
    pointsAwarded: rule.pointsAwarded,
    active: rule.active,
    effectiveAt: rule.effectiveAt.toISOString(),
    retiredAt: rule.retiredAt?.toISOString() ?? null
  };
}

function toRewardOption(reward: RewardOptionRow): LoyaltyRewardOption {
  return { id: reward.id, name: reward.name, pointsCost: reward.pointsCost, benefitType: reward.benefitType, benefitDescription: reward.benefitDescription, active: reward.active, effectiveAt: reward.effectiveAt.toISOString(), updatedAt: reward.updatedAt.toISOString() };
}
