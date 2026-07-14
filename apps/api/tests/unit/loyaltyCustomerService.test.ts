import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createLoyaltyCustomer,
  getLoyaltyCustomer,
  getLoyaltyPhoneRegion,
  normalizeLoyaltyPhone,
  searchLoyaltyCustomers,
  updateLoyaltyCustomer
} from "../../src/domain/loyaltyCustomerService";
import { loyaltyCustomerInputSchema } from "../../src/routes/validators";
import { db } from "../../src/storage/db";
import { loyaltyCustomers } from "../../src/storage/schema";

const createdCustomerIds: string[] = [];

afterEach(async () => {
  if (createdCustomerIds.length > 0) {
    await db.delete(loyaltyCustomers);
    createdCustomerIds.length = 0;
  }
  vi.unstubAllEnvs();
});

describe("loyalty customer service", () => {
  it("uses Thailand for local development and honors the configured shop phone region", () => {
    vi.stubEnv("SHOP_PHONE_REGION", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(getLoyaltyPhoneRegion()).toBe("TH");

    vi.stubEnv("SHOP_PHONE_REGION", "US");
    expect(getLoyaltyPhoneRegion()).toBe("US");
    expect(normalizeLoyaltyPhone("(415) 555-2671")).toBe("+14155552671");
  });

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

  it("validates, normalizes, and uniquely identifies supplied email addresses", async () => {
    const suffix = String(Date.now()).slice(-7);
    const email = `Ari.${suffix}@Example.test`;

    expect(() => loyaltyCustomerInputSchema.parse({
      name: "Malformed Email",
      phone: `081${suffix}`,
      email: "not-an-email"
    })).toThrow();

    const primary = await createLoyaltyCustomer({
      name: "Ari Srisuk",
      phone: `081${suffix}`,
      email: `  ${email}  `
    });
    createdCustomerIds.push(primary.id);
    expect(primary.email).toBe(email);

    await expect(
      createLoyaltyCustomer({
        name: "Duplicate Ari",
        phone: `082${suffix}`,
        email: `  ${email.toLowerCase()}  `
      })
    ).rejects.toThrow("Email address already belongs to a customer.");

    const other = await createLoyaltyCustomer({
      name: "Nina Saelim",
      phone: `083${suffix}`,
      email: "nina@example.test"
    });
    createdCustomerIds.push(other.id);

    await expect(
      updateLoyaltyCustomer(other.id, { email: email.toLowerCase() })
    ).rejects.toThrow("Email address already belongs to a customer.");
    await expect(
      updateLoyaltyCustomer(other.id, { phone: primary.phone })
    ).rejects.toThrow("Phone number already belongs to a customer.");

    expect(await getLoyaltyCustomer(other.id)).toMatchObject({
      id: other.id,
      phone: `083${suffix}`,
      email: "nina@example.test"
    });

    const unchanged = await updateLoyaltyCustomer(primary.id, {
      email: email.toLowerCase()
    });
    expect(unchanged.email).toBe(email.toLowerCase());

    const blank = await createLoyaltyCustomer({
      name: "No Email",
      phone: `084${suffix}`,
      email: "   "
    });
    createdCustomerIds.push(blank.id);
    expect(blank.email).toBeNull();
  });
});
