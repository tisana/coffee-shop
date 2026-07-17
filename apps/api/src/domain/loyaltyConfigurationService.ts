import { desc, eq } from "drizzle-orm";

import type { LoyaltyEarningRuleInput } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyEarningRule } from "@coffee-shop/shared/domain/types";

import { badRequest } from "../routes/errors";
import { db, withTransaction } from "../storage/db";
import { loyaltyEarningRules } from "../storage/schema";

type EarningRuleRow = typeof loyaltyEarningRules.$inferSelect;

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

function assertEarningRule(input: LoyaltyEarningRuleInput): void {
  const isAmount = input.earningType === "purchase_amount";
  const validAmount = typeof input.amountThreshold === "string" && Number(input.amountThreshold) > 0;
  const validCount = Number.isInteger(input.beverageCountThreshold) && Number(input.beverageCountThreshold) > 0;

  if (!Number.isInteger(input.pointsAwarded) || input.pointsAwarded <= 0 || (isAmount ? !validAmount || input.beverageCountThreshold !== undefined : !validCount || input.amountThreshold !== undefined)) {
    throw badRequest("Earning type must have one positive matching threshold and positive whole points.");
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
