import { asc, eq, ilike, or, sql } from "drizzle-orm";
import {
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode
} from "libphonenumber-js";

import type {
  LoyaltyCustomerInput,
  LoyaltyCustomerUpdate
} from "@coffee-shop/shared/contracts/api";
import type { LoyaltyCustomer } from "@coffee-shop/shared/domain/types";

import { badRequest, conflict, notFound } from "../routes/errors";
import { db } from "../storage/db";
import { loyaltyCustomers } from "../storage/schema";

const DEFAULT_SEARCH_LIMIT = 20;

type LoyaltyCustomerRow = typeof loyaltyCustomers.$inferSelect;

export function normalizeLoyaltyPhone(phone: string): string {
  const region = configuredPhoneRegion();
  const input = phone.trim().replace(/^00/, "+");
  const parsed = parsePhoneNumberFromString(input, region);

  if (!parsed || !parsed.isValid()) {
    throw badRequest("Phone number must be valid for the configured shop region.");
  }

  return parsed.number;
}

export async function createLoyaltyCustomer(input: LoyaltyCustomerInput): Promise<LoyaltyCustomer> {
  const phoneNormalized = normalizeLoyaltyPhone(input.phone);

  try {
    const [customer] = await db
      .insert(loyaltyCustomers)
      .values({
        name: input.name.trim(),
        phoneDisplay: input.phone.trim(),
        phoneNormalized,
        email: normalizeOptionalEmail(input.email)
      })
      .returning();

    if (!customer) {
      throw new Error("Unable to create loyalty customer.");
    }

    return toLoyaltyCustomer(customer);
  } catch (error) {
    throwPhoneConflict(error);
  }
}

export async function getLoyaltyCustomer(customerId: string): Promise<LoyaltyCustomer> {
  const [customer] = await db
    .select()
    .from(loyaltyCustomers)
    .where(eq(loyaltyCustomers.id, customerId))
    .limit(1);

  if (!customer) {
    throw notFound("Loyalty customer not found.");
  }

  return toLoyaltyCustomer(customer);
}

export async function searchLoyaltyCustomers(query: string, limit = DEFAULT_SEARCH_LIMIT): Promise<LoyaltyCustomer[]> {
  const normalizedQuery = tryNormalizePhone(query);
  const nameMatches = ilike(loyaltyCustomers.name, `%${query.trim()}%`);
  const where = normalizedQuery
    ? or(eq(loyaltyCustomers.phoneNormalized, normalizedQuery), nameMatches)
    : nameMatches;

  const rows = await db
    .select()
    .from(loyaltyCustomers)
    .where(where)
    .orderBy(
      normalizedQuery
        ? sql`CASE WHEN ${loyaltyCustomers.phoneNormalized} = ${normalizedQuery} THEN 0 ELSE 1 END`
        : asc(loyaltyCustomers.name),
      asc(loyaltyCustomers.name),
      asc(loyaltyCustomers.enrolledAt)
    )
    .limit(limit);

  return rows.map(toLoyaltyCustomer);
}

export async function updateLoyaltyCustomer(
  customerId: string,
  input: LoyaltyCustomerUpdate
): Promise<LoyaltyCustomer> {
  const updates: Partial<typeof loyaltyCustomers.$inferInsert> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    updates.name = input.name.trim();
  }

  if (input.phone !== undefined) {
    updates.phoneDisplay = input.phone.trim();
    updates.phoneNormalized = normalizeLoyaltyPhone(input.phone);
  }

  if (input.email !== undefined) {
    updates.email = normalizeOptionalEmail(input.email);
  }

  try {
    const [customer] = await db
      .update(loyaltyCustomers)
      .set(updates)
      .where(eq(loyaltyCustomers.id, customerId))
      .returning();

    if (!customer) {
      throw notFound("Loyalty customer not found.");
    }

    return toLoyaltyCustomer(customer);
  } catch (error) {
    throwPhoneConflict(error);
  }
}

function configuredPhoneRegion(): CountryCode {
  const configured = process.env.SHOP_PHONE_REGION?.trim().toUpperCase();

  if (!configured || !isSupportedCountry(configured)) {
    throw badRequest("SHOP_PHONE_REGION must be a supported ISO 3166-1 alpha-2 country code.");
  }

  return configured;
}

function tryNormalizePhone(value: string): string | undefined {
  try {
    return normalizeLoyaltyPhone(value);
  } catch {
    return undefined;
  }
}

function normalizeOptionalEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim();
  return normalized ? normalized : null;
}

function toLoyaltyCustomer(customer: LoyaltyCustomerRow): LoyaltyCustomer {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phoneDisplay,
    email: customer.email,
    enrolledAt: customer.enrolledAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString()
  };
}

function throwPhoneConflict(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw conflict("Phone number already belongs to a customer.");
  }

  throw error;
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown; cause?: unknown };
  return candidate.code === "23505" || isUniqueViolation(candidate.cause);
}
