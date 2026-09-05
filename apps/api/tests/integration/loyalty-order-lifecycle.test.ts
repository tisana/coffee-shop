import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { cancelOrder, cancelOrderLoyaltyReward, completeOrder } from "../../src/domain/orderFulfillmentService";
import { cancelOrderBeverage, completeOrderBeverage } from "../../src/domain/beverageService";
import { claimQueuedOrder } from "../../src/domain/queueClaimService";
import { submitOrderToQueue } from "../../src/domain/queueSubmissionService";
import { calculateExpirationBusinessDate, replaceActiveEarningRule, replaceActiveExpirationPolicy } from "../../src/domain/loyaltyConfigurationService";
import { createLoyaltyCustomer } from "../../src/domain/loyaltyCustomerService";
import { getLoyaltyPoints } from "../../src/domain/loyaltyLedgerService";
import { createLoyaltyRewardOption } from "../../src/domain/loyaltyConfigurationService";
import { db } from "../../src/storage/db";
import { loyaltyPointLedgerEntries } from "../../src/storage/schema";
import { cleanupLoyaltyFixtureData, createTestMenuFixture, createTestStaff } from "./testFixtures";
import { currentBusinessDate } from "../../src/domain/businessDate";

describe("loyalty order lifecycle", () => {
  beforeEach(() => {
    // Keep dated point buckets valid without freezing database/network timers.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));
    vi.stubEnv("SHOP_TIME_ZONE", "UTC");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  afterEach(cleanupLoyaltyFixtureData);

  it("associates a customer at creation, earns once on completion, and reverses once on cancellation", async () => {
    const { staff } = await createTestStaff();
    const menu = await createTestMenuFixture();
    const customer = await createLoyaltyCustomer({ name: "Ari", phone: "081-234-5678" });
    await replaceActiveEarningRule(staff.id, {
      earningType: "purchase_amount",
      amountThreshold: "4.00",
      pointsAwarded: 1
    });
    const expirationPolicy = await replaceActiveExpirationPolicy(staff.id, { enabled: true, expirationMonths: 3 });

    const created = await createOrderForStaff(staff.id, {
      loyalty: { customerId: customer.id },
      beverages: [{
        menuItemId: menu.menuItemId,
        quantity: 2,
        selectedCustomizations: [{ customizationGroupId: menu.groupId, customizationChoiceIds: [menu.wholeMilkChoiceId] }]
      }]
    });
    expect(created.loyalty?.customer.id).toBe(customer.id);

    const queued = await submitOrderToQueue(created.id);
    const inProgress = await claimQueuedOrder(queued.id, staff.id);
    for (const beverage of inProgress.beverages) {
      await import("../../src/domain/beverageService").then(({ completeOrderBeverage }) => completeOrderBeverage(created.id, beverage.id));
    }

    await completeOrder(created.id);
    await completeOrder(created.id).catch(() => undefined);
    expect((await getLoyaltyPoints(customer.id)).summary).toMatchObject({ available: 2, lifetimeEarned: 2 });
    const [earned] = await db.select().from(loyaltyPointLedgerEntries).where(eq(loyaltyPointLedgerEntries.orderId, created.id));
    expect(earned).toMatchObject({
      eventType: "earned",
      expirationPolicyId: expirationPolicy.id,
      expirationBusinessDate: calculateExpirationBusinessDate(currentBusinessDate(), 3)
    });

    await cancelOrder(created.id);
    await cancelOrder(created.id).catch(() => undefined);
    expect((await getLoyaltyPoints(customer.id)).summary).toMatchObject({ available: 0, adjusted: -2 });
  });

  it("counts only non-cancelled beverage snapshots for a beverage earning rule", async () => {
    const { staff } = await createTestStaff();
    const menu = await createTestMenuFixture();
    const customer = await createLoyaltyCustomer({ name: "Beverage Ari", phone: "086-234-5678" });
    await replaceActiveEarningRule(staff.id, { earningType: "beverage_count", beverageCountThreshold: 1, pointsAwarded: 1 });
    const created = await createOrderForStaff(staff.id, {
      loyalty: { customerId: customer.id },
      beverages: [1, 2, 3].map(() => ({ menuItemId: menu.menuItemId, quantity: 1, selectedCustomizations: [{ customizationGroupId: menu.groupId, customizationChoiceIds: [menu.wholeMilkChoiceId] }] }))
    });
    const queued = await submitOrderToQueue(created.id);
    const inProgress = await claimQueuedOrder(queued.id, staff.id);
    const [cancelled, ...remaining] = inProgress.beverages;
    if (!cancelled) throw new Error("Expected a beverage to cancel.");
    await cancelOrderBeverage(created.id, cancelled.id, "Customer changed drink");
    for (const beverage of remaining) await completeOrderBeverage(created.id, beverage.id);
    await completeOrder(created.id);

    expect((await getLoyaltyPoints(customer.id)).summary).toMatchObject({ available: 2, lifetimeEarned: 2 });
  });

  it("redeems an active free-beverage reward during creation and returns its point bucket when the order is cancelled", async () => {
    const { staff } = await createTestStaff();
    const menu = await createTestMenuFixture();
    const customer = await createLoyaltyCustomer({ name: "Reward Ari", phone: "087-234-5678" });
    const reward = await createLoyaltyRewardOption(staff.id, { name: "Free drink", pointsCost: 5, benefitType: "free_beverage", benefitDescription: "One drink free" });
    await db.insert(loyaltyPointLedgerEntries).values({ customerId: customer.id, eventType: "earned", pointsDelta: 5, earnedBusinessDate: "2026-07-01", expirationBusinessDate: "2026-08-31", reason: "Seed credit." });

    const created = await createOrderForStaff(staff.id, { loyalty: { customerId: customer.id, rewards: [{ rewardOptionId: reward.id, targetBeverageIndex: 0 }] }, beverages: [{ menuItemId: menu.menuItemId, quantity: 1, selectedCustomizations: [{ customizationGroupId: menu.groupId, customizationChoiceIds: [menu.wholeMilkChoiceId] }] }] });
    expect(created).toMatchObject({ loyaltyRewardDiscountTotal: "4.50", payableTotal: "0.00", loyalty: { rewards: [expect.objectContaining({ name: "Free drink", status: "active" })] } });
    expect((await getLoyaltyPoints(customer.id)).summary.available).toBe(0);

    await cancelOrder(created.id);
    expect(await getLoyaltyPoints(customer.id)).toMatchObject({ summary: { available: 5, returned: 5 }, history: expect.arrayContaining([expect.objectContaining({ eventType: "returned", expirationBusinessDate: "2026-08-31" })]) });
  });

  it("covers only the selected size adjustment and returns points when staff cancels that reward", async () => {
    const { staff } = await createTestStaff();
    const menu = await createTestMenuFixture();
    const customer = await createLoyaltyCustomer({ name: "Size Reward Ari", phone: "082-345-6789" });
    const reward = await createLoyaltyRewardOption(staff.id, { name: "Size upgrade", pointsCost: 5, benefitType: "size_upgrade", benefitDescription: "Large size free" });
    await db.insert(loyaltyPointLedgerEntries).values({ customerId: customer.id, eventType: "earned", pointsDelta: 5, earnedBusinessDate: "2026-07-01", expirationBusinessDate: "2026-08-31", reason: "Seed credit." });

    const created = await createOrderForStaff(staff.id, { loyalty: { customerId: customer.id, rewards: [{ rewardOptionId: reward.id, targetBeverageIndex: 0, targetCustomizationChoiceId: menu.oatMilkChoiceId }] }, beverages: [{ menuItemId: menu.menuItemId, quantity: 1, selectedCustomizations: [{ customizationGroupId: menu.groupId, customizationChoiceIds: [menu.oatMilkChoiceId] }] }] });
    const applied = created.loyalty?.rewards[0];
    expect(applied).toMatchObject({ name: "Size upgrade", benefitType: "size_upgrade", coveredAmount: "0.75", status: "active" });
    if (!applied) throw new Error("Expected reward.");

    const returned = await cancelOrderLoyaltyReward(created.id, applied.id, staff.id);
    expect(returned).toMatchObject({ loyaltyRewardDiscountTotal: "0.00", payableTotal: created.total, loyalty: { rewards: [expect.objectContaining({ id: applied.id, status: "returned" })] } });
    expect((await getLoyaltyPoints(customer.id)).summary).toMatchObject({ available: 5, returned: 5 });
  });

  it("rejects stacked rewards on one beverage unit and returns its points when that target is cancelled", async () => {
    const { staff } = await createTestStaff();
    const menu = await createTestMenuFixture();
    const customer = await createLoyaltyCustomer({ name: "Target Cancel Ari", phone: "089-234-5678" });
    const reward = await createLoyaltyRewardOption(staff.id, { name: "Free drink", pointsCost: 5, benefitType: "free_beverage", benefitDescription: "One drink free" });
    await db.insert(loyaltyPointLedgerEntries).values({ customerId: customer.id, eventType: "earned", pointsDelta: 10, earnedBusinessDate: "2026-07-01", expirationBusinessDate: "2026-08-31", reason: "Seed credits." });
    const request = { loyalty: { customerId: customer.id, rewards: [{ rewardOptionId: reward.id, targetBeverageIndex: 0 }] }, beverages: [{ menuItemId: menu.menuItemId, quantity: 1, selectedCustomizations: [{ customizationGroupId: menu.groupId, customizationChoiceIds: [menu.wholeMilkChoiceId] }] }] };

    await expect(createOrderForStaff(staff.id, { ...request, loyalty: { ...request.loyalty, rewards: [...request.loyalty.rewards, ...request.loyalty.rewards] } })).rejects.toMatchObject({ message: "A beverage unit cannot receive more than one reward." });

    const created = await createOrderForStaff(staff.id, request);
    const queued = await submitOrderToQueue(created.id);
    const inProgress = await claimQueuedOrder(queued.id, staff.id);
    const beverage = inProgress.beverages[0];
    if (!beverage) throw new Error("Expected rewarded beverage.");
    await cancelOrderBeverage(created.id, beverage.id, "Customer changed drink");

    expect((await getLoyaltyPoints(customer.id)).summary).toMatchObject({ available: 10, returned: 5 });
  });
});
