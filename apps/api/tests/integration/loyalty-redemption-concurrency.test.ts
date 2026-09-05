import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLoyaltyCustomer } from "../../src/domain/loyaltyCustomerService";
import { getLoyaltyPoints, redeemPoints } from "../../src/domain/loyaltyLedgerService";
import { db, withTransaction } from "../../src/storage/db";
import { loyaltyPointLedgerEntries } from "../../src/storage/schema";
import { cleanupLoyaltyFixtureData } from "./testFixtures";

describe("loyalty redemption concurrency", () => {
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

  it("serializes simultaneous redemptions for one customer and prevents overspending", async () => {
    const customer = await createLoyaltyCustomer({ name: "Concurrent Ari", phone: "088-234-5678" });
    await db.insert(loyaltyPointLedgerEntries).values({
      customerId: customer.id, eventType: "earned", pointsDelta: 5,
      earnedBusinessDate: "2026-07-01", expirationBusinessDate: "2026-08-31", reason: "Seed credit."
    });

    const results = await Promise.allSettled([
      withTransaction((tx) => redeemPoints(tx, customer.id, null, 5, "First redemption.")),
      withTransaction((tx) => redeemPoints(tx, customer.id, null, 5, "Second redemption."))
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await getLoyaltyPoints(customer.id)).summary.available).toBe(0);
  });
});
