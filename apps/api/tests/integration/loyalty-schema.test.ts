import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/storage/db";
import { loyaltyCustomers } from "../../src/storage/schema";
import { cleanupLoyaltyFixtureData, createTestStaff } from "./testFixtures";

const businessDate = "2099-01-01";

describe("loyalty schema constraints", () => {
  afterEach(async () => {
    await cleanupLoyaltyFixtureData();
  });

  it("enforces normalized phone uniqueness", async () => {
    const { staff } = await createTestStaff();
    const normalizedPhone = "+66812345678";

    await insertLoyaltyCustomer(staff.id, normalizedPhone);

    await expect(
      insertLoyaltyCustomer(staff.id, normalizedPhone),
    ).rejects.toThrow();
  });

  it("normalizes existing email data and enforces the named case-insensitive email identity", async () => {
    const migration = await readFile(
      new URL("../../drizzle/migrations/0004_loyalty_customer_email_identity.sql", import.meta.url),
      "utf8"
    );
    expect(migration).toContain("NULLIF(btrim(email), '')");
    expect(migration).toContain("HAVING count(*) > 1");
    expect(migration).toContain("RAISE EXCEPTION");
    expect(migration).toContain("loyalty_customers_email_ci_unique");
    expect(migration).toContain("lower(\"email\")");

    const { staff } = await createTestStaff();
    const legacyTrimmed = await insertLoyaltyCustomer(
      staff.id,
      `+6680${randomDigits(7)}`,
      "  Trimmed@Example.test  "
    );
    const legacyBlank = await insertLoyaltyCustomer(
      staff.id,
      `+6685${randomDigits(7)}`,
      "   "
    );
    await db.execute(sql`
      UPDATE loyalty_customers
      SET email = NULLIF(btrim(email), '')
      WHERE email IS NOT NULL
    `);
    const [trimmedRow] = await db
      .select()
      .from(loyaltyCustomers)
      .where(sql`${loyaltyCustomers.id} = ${legacyTrimmed.id}::uuid`);
    const [blankRow] = await db
      .select()
      .from(loyaltyCustomers)
      .where(sql`${loyaltyCustomers.id} = ${legacyBlank.id}::uuid`);
    expect(trimmedRow?.email).toBe("Trimmed@Example.test");
    expect(blankRow?.email).toBeNull();

    await insertLoyaltyCustomer(
      staff.id,
      `+6686${randomDigits(7)}`,
      "Legacy@Example.test"
    );
    await insertLoyaltyCustomer(
      staff.id,
      `+6687${randomDigits(7)}`,
      " legacy@example.test "
    );
    await expect(
      db.execute(sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM loyalty_customers
            WHERE NULLIF(btrim(email), '') IS NOT NULL
            GROUP BY lower(NULLIF(btrim(email), ''))
            HAVING count(*) > 1
          ) THEN
            RAISE EXCEPTION 'Cannot create loyalty email identity index: duplicate case-insensitive email values exist.';
          END IF;
        END $$;
      `)
    ).rejects.toThrow("duplicate case-insensitive email values exist");

    const primary = await insertLoyaltyCustomer(
      staff.id,
      `+6681${randomDigits(7)}`,
      "Ari@Example.test"
    );

    await expect(
      insertLoyaltyCustomer(staff.id, `+6682${randomDigits(7)}`, "ari@example.test")
    ).rejects.toThrow();

    const concurrent = await Promise.allSettled([
      insertLoyaltyCustomer(staff.id, `+6683${randomDigits(7)}`, "Nina@Example.test"),
      insertLoyaltyCustomer(staff.id, `+6684${randomDigits(7)}`, "nina@example.test")
    ]);
    expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1);

    expect(primary.id).toBeDefined();
  });

  it("allows only one active earning rule and expiration policy", async () => {
    const { staff } = await createTestStaff();

    await db.execute(sql`
      INSERT INTO loyalty_earning_rules (
        id, earning_type, amount_threshold, beverage_count_threshold, points_awarded, active, effective_at, created_by_staff_id
      )
      VALUES (${randomUUID()}::uuid, 'purchase_amount', 10.00, NULL, 1, true, now(), ${staff.id}::uuid)
    `);
    await expect(
      db.execute(sql`
        INSERT INTO loyalty_earning_rules (
          id, earning_type, amount_threshold, beverage_count_threshold, points_awarded, active, effective_at, created_by_staff_id
        )
        VALUES (${randomUUID()}::uuid, 'beverage_count', NULL, 1, 1, true, now(), ${staff.id}::uuid)
      `),
    ).rejects.toThrow();

    await db.execute(sql`
      INSERT INTO loyalty_expiration_policies (
        id, enabled, expiration_months, active, effective_at, created_by_staff_id
      )
      VALUES (${randomUUID()}::uuid, true, 3, true, now(), ${staff.id}::uuid)
    `);
    await expect(
      db.execute(sql`
        INSERT INTO loyalty_expiration_policies (
          id, enabled, expiration_months, active, effective_at, created_by_staff_id
        )
        VALUES (${randomUUID()}::uuid, false, NULL, true, now(), ${staff.id}::uuid)
      `),
    ).rejects.toThrow();
  });

  it("enforces ledger signs and allocation references", async () => {
    const { staff } = await createTestStaff();
    const customer = await insertLoyaltyCustomer(
      staff.id,
      `+6681${randomDigits(7)}`,
    );

    await expect(
      db.execute(sql`
        INSERT INTO loyalty_point_ledger_entries (
          id, customer_id, event_type, points_delta, reason, occurred_at
        )
        VALUES (${randomUUID()}::uuid, ${customer.id}::uuid, 'earned', -1, 'Invalid earned entry', now())
      `),
    ).rejects.toThrow();

    const creditEntryId = randomUUID();
    await db.execute(sql`
      INSERT INTO loyalty_point_ledger_entries (
        id, customer_id, event_type, points_delta, earned_business_date, expiration_business_date, reason, occurred_at
      )
      VALUES (
        ${creditEntryId}::uuid,
        ${customer.id}::uuid,
        'earned',
        10,
        ${businessDate}::date,
        '2099-04-30'::date,
        'Valid earned entry',
        now()
      )
    `);

    const debitEntryId = randomUUID();
    await db.execute(sql`
      INSERT INTO loyalty_point_ledger_entries (
        id, customer_id, event_type, points_delta, reason, occurred_at
      )
      VALUES (${debitEntryId}::uuid, ${customer.id}::uuid, 'redeemed', -10, 'Valid redemption', now())
    `);

    await expect(
      db.execute(sql`
        INSERT INTO loyalty_point_allocations (id, customer_id, credit_entry_id, debit_entry_id, points)
        VALUES (
          ${randomUUID()}::uuid,
          ${customer.id}::uuid,
          ${randomUUID()}::uuid,
          ${debitEntryId}::uuid,
          10
        )
      `),
    ).rejects.toThrow();

    await db.execute(sql`
      INSERT INTO loyalty_point_allocations (id, customer_id, credit_entry_id, debit_entry_id, points)
      VALUES (
        ${randomUUID()}::uuid,
        ${customer.id}::uuid,
        ${creditEntryId}::uuid,
        ${debitEntryId}::uuid,
        10
      )
    `);
  });

  it("bounds loyalty reward discounts to the captured order total", async () => {
    const { staff } = await createTestStaff();
    const orderId = randomUUID();

    await db.execute(sql`
      INSERT INTO orders (id, business_date, daily_order_number, created_by_staff_id, total)
      VALUES (
        ${orderId}::uuid,
        ${businessDate}::date,
        ${randomDailyOrderNumber()},
        ${staff.id}::uuid,
        10.00
      )
    `);

    await expect(
      db.execute(sql`
        UPDATE orders
        SET loyalty_reward_discount_total = -0.01
        WHERE id = ${orderId}::uuid
      `),
    ).rejects.toThrow();
    await expect(
      db.execute(sql`
        UPDATE orders
        SET loyalty_reward_discount_total = 10.01
        WHERE id = ${orderId}::uuid
      `),
    ).rejects.toThrow();
  });
});

async function insertLoyaltyCustomer(staffId: string, normalizedPhone: string, email: string | null = null) {
  const id = randomUUID();

  await db.execute(sql`
    INSERT INTO loyalty_customers (
      id, name, phone_display, phone_normalized, email, enrolled_at, updated_at
    )
    VALUES (
      ${id}::uuid,
      'Test Customer',
      ${normalizedPhone},
      ${normalizedPhone},
      ${email},
      now(),
      now()
    )
  `);

  return { id };
}

function randomDailyOrderNumber(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}
