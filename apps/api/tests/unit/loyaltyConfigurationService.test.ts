import { afterEach, describe, expect, it } from "vitest";

import {
  calculateEarningPoints,
  calculateExpirationBusinessDate,
  createLoyaltyRewardOption,
  getActiveExpirationPolicy,
  getActiveEarningRule,
  listLoyaltyRewardOptions,
  replaceActiveEarningRule,
  replaceActiveExpirationPolicy,
  updateLoyaltyRewardOption
} from "../../src/domain/loyaltyConfigurationService";
import { cleanupLoyaltyFixtureData, createTestStaff } from "../integration/testFixtures";
import { currentBusinessDate } from "../../src/domain/businessDate";

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

  it("versions expiration policies and calculates an end-of-month cutoff", async () => {
    const { staff } = await createTestStaff();
    const first = await replaceActiveExpirationPolicy(staff.id, { enabled: true, expirationMonths: 3 });
    const second = await replaceActiveExpirationPolicy(staff.id, { enabled: false });

    expect(first).toMatchObject({ enabled: true, expirationMonths: 3, active: true });
    expect(second.id).not.toBe(first.id);
    expect(await getActiveExpirationPolicy()).toMatchObject({ id: second.id, enabled: false, expirationMonths: null });
    expect(calculateExpirationBusinessDate("2026-07-15", 3)).toBe("2026-10-31");
    expect(calculateExpirationBusinessDate("2026-11-30", 3)).toBe("2027-02-28");
  });

  it("rejects invalid expiration policy month combinations", async () => {
    const { staff } = await createTestStaff();
    await expect(replaceActiveExpirationPolicy(staff.id, { enabled: true })).rejects.toMatchObject({ message: expect.stringContaining("positive whole") });
    await expect(replaceActiveExpirationPolicy(staff.id, { enabled: true, expirationMonths: 0 })).rejects.toMatchObject({ message: expect.stringContaining("positive whole") });
    await expect(replaceActiveExpirationPolicy(staff.id, { enabled: false, expirationMonths: 3 })).rejects.toMatchObject({ message: expect.stringContaining("must be omitted") });
  });

  it("uses the configured shop time zone when resolving a business date", () => {
    const originalTimeZone = process.env.SHOP_TIME_ZONE;
    process.env.SHOP_TIME_ZONE = "Pacific/Kiritimati";
    try {
      expect(currentBusinessDate(new Date("2026-07-31T12:30:00.000Z"))).toBe("2026-08-01");
    } finally {
      if (originalTimeZone === undefined) delete process.env.SHOP_TIME_ZONE;
      else process.env.SHOP_TIME_ZONE = originalTimeZone;
    }
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

  it("updates mutable reward details, filters retired rewards, and retains the original benefit type", async () => {
    const { staff } = await createTestStaff();
    const reward = await createLoyaltyRewardOption(staff.id, {
      name: "Free drink",
      pointsCost: 10,
      benefitType: "free_beverage",
      benefitDescription: "One drink on us"
    });

    const updated = await updateLoyaltyRewardOption(staff.id, reward.id, {
      name: "Free cold drink",
      pointsCost: 12,
      benefitDescription: "One cold drink on us",
      active: false
    });

    expect(updated).toMatchObject({
      name: "Free cold drink",
      pointsCost: 12,
      benefitDescription: "One cold drink on us",
      benefitType: "free_beverage",
      active: false
    });
    await expect(listLoyaltyRewardOptions(true)).resolves.toEqual([]);
    await expect(listLoyaltyRewardOptions()).resolves.toEqual([expect.objectContaining({ id: reward.id, active: false })]);
  });
});
