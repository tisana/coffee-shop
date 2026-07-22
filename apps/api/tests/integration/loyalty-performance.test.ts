import { performance } from "node:perf_hooks";

import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/storage/db";
import { loyaltyCustomers, loyaltyPointLedgerEntries } from "../../src/storage/schema";
import {
  cleanupLoyaltyFixtureData,
  createLoggedInAgent,
  createTestMenuFixture
} from "./testFixtures";

const API_TARGET_MS = 500;

async function expectWithinTarget<T>(operation: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  const result = await operation();
  expect(performance.now() - startedAt).toBeLessThan(API_TARGET_MS);
  return result;
}

describe("loyalty indexed API performance", () => {
  afterEach(cleanupLoyaltyFixtureData);

  it("keeps lookup, balance, history, and redemption below 500 ms with large fixtures", async () => {
    const { agent } = await createLoggedInAgent();
    const target = await agent.post("/loyalty/customers").send({
      name: "Performance Target",
      phone: "+66999999999"
    });
    expect(target.status).toBe(201);

    await db.insert(loyaltyCustomers).values(
      Array.from({ length: 2_000 }, (_, index) => ({
        name: `Fixture Customer ${index.toString().padStart(4, "0")}`,
        phoneDisplay: `+669${index.toString().padStart(8, "0")}`,
        phoneNormalized: `+669${index.toString().padStart(8, "0")}`,
        email: null
      }))
    );
    await db.insert(loyaltyPointLedgerEntries).values(
      Array.from({ length: 1_000 }, (_, index) => ({
        customerId: target.body.id as string,
        eventType: "earned" as const,
        pointsDelta: 1,
        earnedBusinessDate: "2026-07-01",
        reason: `Performance earning ${index + 1}.`,
        occurredAt: new Date(Date.UTC(2026, 6, 1, 0, 0, index))
      }))
    );

    const lookup = await expectWithinTarget(() =>
      agent.get("/loyalty/customers?query=Performance%20Target")
    );
    expect(lookup.status).toBe(200);
    expect(lookup.body.customers[0]).toMatchObject({ id: target.body.id });

    const points = await expectWithinTarget(() =>
      agent.get(`/loyalty/customers/${target.body.id}/points`)
    );
    expect(points.status).toBe(200);
    expect(points.body).toMatchObject({
      summary: { available: 1_000, lifetimeEarned: 1_000 }
    });
    expect(points.body.history).toHaveLength(1_000);

    const reward = await agent.post("/loyalty/rewards").send({
      name: "Performance reward",
      pointsCost: 10,
      benefitType: "free_beverage",
      benefitDescription: "Covers one beverage."
    });
    expect(reward.status).toBe(201);
    const menu = await createTestMenuFixture();

    const redemption = await expectWithinTarget(() =>
      agent.post("/orders").send({
        beverages: [
          {
            menuItemId: menu.menuItemId,
            quantity: 1,
            selectedCustomizations: [
              {
                customizationGroupId: menu.groupId,
                customizationChoiceIds: [menu.wholeMilkChoiceId]
              }
            ]
          }
        ],
        loyalty: {
          customerId: target.body.id,
          rewards: [{ rewardOptionId: reward.body.id, targetBeverageIndex: 0 }]
        }
      })
    );
    expect(redemption.status).toBe(201);
    expect(redemption.body.loyalty.rewards).toEqual([
      expect.objectContaining({ name: "Performance reward", pointsCost: 10 })
    ]);
  });
});
