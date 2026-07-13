import { afterEach, describe, expect, it } from "vitest";

import {
  createLoyaltyCustomer,
  normalizeLoyaltyPhone,
  searchLoyaltyCustomers,
  updateLoyaltyCustomer
} from "../../src/domain/loyaltyCustomerService";
import { db } from "../../src/storage/db";
import { loyaltyCustomers } from "../../src/storage/schema";

const createdCustomerIds: string[] = [];

afterEach(async () => {
  if (createdCustomerIds.length > 0) {
    await db.delete(loyaltyCustomers);
    createdCustomerIds.length = 0;
  }
});

describe("loyalty customer service", () => {
  it("normalizes local, international, and IDD phone forms to one E.164 identity", () => {
    expect(normalizeLoyaltyPhone("081-234-5678")).toBe("+66812345678");
    expect(normalizeLoyaltyPhone("+66 81-234-5678")).toBe("+66812345678");
    expect(normalizeLoyaltyPhone("0066 81-234-5678")).toBe("+66812345678");
    expect(() => normalizeLoyaltyPhone("not a phone")).toThrow("configured shop region");
  });

  it("creates, searches, and updates a stable customer identity while rejecting equivalent duplicate phones", async () => {
    const suffix = String(Date.now()).slice(-7);
    const phone = `081${suffix}`;

    const customer = await createLoyaltyCustomer({
      name: "Ari Srisuk",
      phone,
      email: ""
    });
    createdCustomerIds.push(customer.id);

    expect(customer).toMatchObject({
      name: "Ari Srisuk",
      phone,
      email: null
    });

    await expect(
      createLoyaltyCustomer({
        name: "Duplicate Ari",
        phone: `0066${phone.slice(1)}`
      })
    ).rejects.toThrow("already belongs to a customer");

    const internationalPhone = `+66${phone.slice(1)}`;
    const nameMatch = await createLoyaltyCustomer({
      name: internationalPhone,
      phone: `084${suffix}`
    });
    createdCustomerIds.push(nameMatch.id);

    const matches = await searchLoyaltyCustomers(internationalPhone);
    expect(matches[0]?.id).toBe(customer.id);
    expect(matches.map((match) => match.id)).toContain(nameMatch.id);

    const updated = await updateLoyaltyCustomer(customer.id, {
      name: "Ari Updated",
      phone: "082-234-5678",
      email: "ari@example.test"
    });

    expect(updated).toMatchObject({
      id: customer.id,
      name: "Ari Updated",
      phone: "082-234-5678",
      email: "ari@example.test"
    });
  });
});
