import { eq } from "drizzle-orm";

import type { OrderLoyaltyDetails } from "@coffee-shop/shared/domain/types";

import { badRequest } from "../routes/errors";
import { type Database, type Transaction } from "../storage/db";
import { loyaltyCustomers, loyaltyOrderAssociations } from "../storage/schema";

type Queryable = Database | Transaction;

export async function associateCustomerWithOrder(
  tx: Transaction,
  orderId: string,
  customerId: string,
  staffId: string
): Promise<OrderLoyaltyDetails> {
  const [customer] = await tx.select().from(loyaltyCustomers).where(eq(loyaltyCustomers.id, customerId)).limit(1);

  if (!customer) {
    throw badRequest("Selected loyalty customer does not exist.");
  }

  await tx.insert(loyaltyOrderAssociations).values({ orderId, customerId, associatedByStaffId: staffId });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phoneDisplay,
      email: customer.email,
      enrolledAt: customer.enrolledAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString()
    },
    rewards: []
  };
}

export async function getOrderLoyaltyDetails(
  queryable: Queryable,
  orderId: string
): Promise<OrderLoyaltyDetails | null> {
  const [association] = await queryable
    .select({ customer: loyaltyCustomers })
    .from(loyaltyOrderAssociations)
    .innerJoin(loyaltyCustomers, eq(loyaltyOrderAssociations.customerId, loyaltyCustomers.id))
    .where(eq(loyaltyOrderAssociations.orderId, orderId))
    .limit(1);

  if (!association) {
    return null;
  }

  const { customer } = association;
  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phoneDisplay,
      email: customer.email,
      enrolledAt: customer.enrolledAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString()
    },
    rewards: []
  };
}
