import { afterEach, describe, expect, it } from "vitest";

import { createLoyaltyCustomer } from "../../src/domain/loyaltyCustomerService";
import { getLoyaltyPoints } from "../../src/domain/loyaltyLedgerService";
import { cleanupLoyaltyFixtureData } from "../integration/testFixtures";

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
});
