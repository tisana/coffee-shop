import { afterEach, describe, expect, it } from "vitest";

import {
  calculateEarningPoints,
  createLoyaltyRewardOption,
  getActiveEarningRule,
  listLoyaltyRewardOptions,
  replaceActiveEarningRule
} from "../../src/domain/loyaltyConfigurationService";
import { cleanupLoyaltyFixtureData, createTestStaff } from "../integration/testFixtures";

describe("loyalty earning configuration", () => {
  afterEach(cleanupLoyaltyFixtureData);

  it("calculates whole points without carrying a remainder between orders", () => {
    expect(calculateEarningPoints({ earningType: "purchase_amount", amountThreshold: "10.00", beverageCountThreshold: null, pointsAwarded: 1 }, { amount: "25.00", beverageCount: 0 })).toBe(2);
    expect(calculateEarningPoints({ earningType: "beverage_count", amountThreshold: null, beverageCountThreshold: 2, pointsAwarded: 3 }, { amount: "0.00", beverageCount: 3 })).toBe(3);
  });

  it("retires the active rule before inserting a new active version", async () => {
    const { staff } = await createTestStaff();
    const first = await replaceActiveEarningRule(staff.id, {
      earningType: "purchase_amount",
      amountThreshold: "10.00",
      pointsAwarded: 1
    });
    const second = await replaceActiveEarningRule(staff.id, {
      earningType: "beverage_count",
      beverageCountThreshold: 1,
      pointsAwarded: 2
    });

    expect(second.id).not.toBe(first.id);
    expect(await getActiveEarningRule()).toMatchObject({ id: second.id, earningType: "beverage_count" });
  });

  it("creates active rewards and does not let a later edit change the benefit type", async () => {
    const { staff } = await createTestStaff();
    const reward = await createLoyaltyRewardOption(staff.id, {
      name: "Free drink",
      pointsCost: 10,
      benefitType: "free_beverage",
      benefitDescription: "One drink on us"
    });

    expect(reward).toMatchObject({ name: "Free drink", pointsCost: 10, benefitType: "free_beverage", active: true });
    await expect(listLoyaltyRewardOptions(true)).resolves.toEqual([expect.objectContaining({ id: reward.id })]);
  });
});
