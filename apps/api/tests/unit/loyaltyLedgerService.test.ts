import { afterEach, describe, expect, it } from "vitest";

import { createLoyaltyCustomer } from "../../src/domain/loyaltyCustomerService";
import { getLoyaltyPoints, redeemPoints, returnRedeemedPoints } from "../../src/domain/loyaltyLedgerService";
import { cleanupLoyaltyFixtureData } from "../integration/testFixtures";
import { withTransaction } from "../../src/storage/db";
import { loyaltyPointLedgerEntries } from "../../src/storage/schema";

describe("loyalty point ledger", () => {
  afterEach(cleanupLoyaltyFixtureData);

  it("returns zero balances and readable empty history for a newly registered customer", async () => {
    const customer = await createLoyaltyCustomer({ name: "Ledger Ari", phone: "085-234-5678" });
    await expect(getLoyaltyPoints(customer.id)).resolves.toMatchObject({
      customer: { id: customer.id },
      summary: { available: 0, lifetimeEarned: 0, redeemed: 0, returned: 0, expired: 0, adjusted: 0 },
      history: []
    });
  });

  it("allocates a redemption from the earliest expiring credits and returns the original expiration bucket", async () => {
    const customer = await createLoyaltyCustomer({ name: "Allocation Ari", phone: "084-234-5678" });
    const debitId = await withTransaction(async (tx) => {
      const [first] = await tx.insert(loyaltyPointLedgerEntries).values({ customerId: customer.id, eventType: "earned", pointsDelta: 3, earnedBusinessDate: "2026-07-01", expirationBusinessDate: "2026-08-31", reason: "First credit." }).returning();
      const [second] = await tx.insert(loyaltyPointLedgerEntries).values({ customerId: customer.id, eventType: "earned", pointsDelta: 4, earnedBusinessDate: "2026-07-02", expirationBusinessDate: "2026-09-30", reason: "Second credit." }).returning();
      if (!first || !second) throw new Error("Expected credits.");
      return redeemPoints(tx, customer.id, null, 5, "Reward redemption.");
    });

    await withTransaction((tx) => returnRedeemedPoints(tx, customer.id, debitId, null, "Reward returned."));
    const history = (await getLoyaltyPoints(customer.id)).history;
    expect(history.filter((entry) => entry.eventType === "returned")).toEqual(expect.arrayContaining([
      expect.objectContaining({ pointsDelta: 3, expirationBusinessDate: "2026-08-31" }),
      expect.objectContaining({ pointsDelta: 2, expirationBusinessDate: "2026-09-30" })
    ]));
  });
});
