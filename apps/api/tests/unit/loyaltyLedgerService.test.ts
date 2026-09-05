import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLoyaltyCustomer } from "../../src/domain/loyaltyCustomerService";
import { getLoyaltyPoints, materializeExpiredPoints, redeemPoints, returnRedeemedPoints } from "../../src/domain/loyaltyLedgerService";
import { cleanupLoyaltyFixtureData } from "../integration/testFixtures";
import { withTransaction } from "../../src/storage/db";
import { loyaltyPointLedgerEntries } from "../../src/storage/schema";

describe("loyalty point ledger", () => {
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

  it("rejects a redemption when the customer does not have enough points", async () => {
    const customer = await createLoyaltyCustomer({ name: "Insufficient Ari", phone: "083-234-5678" });
    await withTransaction(async (tx) => {
      await tx.insert(loyaltyPointLedgerEntries).values({ customerId: customer.id, eventType: "earned", pointsDelta: 4, earnedBusinessDate: "2026-07-01", reason: "Four points." });
      await expect(redeemPoints(tx, customer.id, null, 5, "Too expensive reward.")).rejects.toMatchObject({ message: "Customer does not have enough points for this reward." });
    });

    await expect(getLoyaltyPoints(customer.id)).resolves.toMatchObject({ summary: { available: 4, redeemed: 0 } });
  });

  it("expires only unspent credits after their month-end cutoff and does not duplicate expiration", async () => {
    const customer = await createLoyaltyCustomer({ name: "Expiry Ari", phone: "082-234-5678" });
    await withTransaction(async (tx) => {
      const [credit] = await tx.insert(loyaltyPointLedgerEntries).values({ customerId: customer.id, eventType: "earned", pointsDelta: 5, earnedBusinessDate: "2026-07-15", expirationBusinessDate: "2026-10-31", reason: "July credit." }).returning();
      if (!credit) throw new Error("Expected credit.");
      await redeemPoints(tx, customer.id, null, 2, "Redeem before cutoff.");
    });

    vi.setSystemTime(new Date("2026-10-31T12:00:00.000Z"));
    await expect(getLoyaltyPoints(customer.id)).resolves.toMatchObject({ summary: { available: 3, expired: 0 } });
    vi.setSystemTime(new Date("2026-11-01T12:00:00.000Z"));
    await withTransaction((tx) => materializeExpiredPoints(tx, customer.id, "2026-11-01"));
    await withTransaction((tx) => materializeExpiredPoints(tx, customer.id, "2026-11-01"));

    const points = await getLoyaltyPoints(customer.id);
    expect(points.history.filter((entry) => entry.eventType === "expired")).toEqual([expect.objectContaining({ pointsDelta: -3, expirationBusinessDate: "2026-10-31" })]);
    await withTransaction((tx) => expect(redeemPoints(tx, customer.id, null, 1, "Redeem after cutoff.")).rejects.toMatchObject({ message: "Customer does not have enough points for this reward." }));
  });

  it("expires returned credits that retain an already elapsed original cutoff", async () => {
    const customer = await createLoyaltyCustomer({ name: "Returned expiry Ari", phone: "081-987-6543" });
    const debitId = await withTransaction(async (tx) => {
      const [credit] = await tx.insert(loyaltyPointLedgerEntries).values({ customerId: customer.id, eventType: "earned", pointsDelta: 2, earnedBusinessDate: "2026-07-15", expirationBusinessDate: "2026-10-31", reason: "July credit." }).returning();
      if (!credit) throw new Error("Expected credit.");
      return redeemPoints(tx, customer.id, null, 2, "Redeem before cutoff.");
    });

    vi.setSystemTime(new Date("2026-11-01T12:00:00.000Z"));
    await withTransaction((tx) => returnRedeemedPoints(tx, customer.id, debitId, null, "Reward returned after cutoff."));
    await withTransaction((tx) => materializeExpiredPoints(tx, customer.id, "2026-11-01"));
    const points = await getLoyaltyPoints(customer.id);
    expect(points.summary.available).toBe(0);
    expect(points.history).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventType: "returned", expirationBusinessDate: "2026-10-31" }),
      expect.objectContaining({ eventType: "expired", pointsDelta: -2, expirationBusinessDate: "2026-10-31" })
    ]));
  });
});
