import { afterEach, describe, expect, it } from "vitest";

import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { cancelOrder, completeOrder } from "../../src/domain/orderFulfillmentService";
import { cancelOrderBeverage, completeOrderBeverage } from "../../src/domain/beverageService";
import { claimQueuedOrder } from "../../src/domain/queueClaimService";
import { submitOrderToQueue } from "../../src/domain/queueSubmissionService";
import { replaceActiveEarningRule } from "../../src/domain/loyaltyConfigurationService";
import { createLoyaltyCustomer } from "../../src/domain/loyaltyCustomerService";
import { getLoyaltyPoints } from "../../src/domain/loyaltyLedgerService";
import { cleanupLoyaltyFixtureData, createTestMenuFixture, createTestStaff } from "./testFixtures";

describe("loyalty order lifecycle", () => {
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
});
