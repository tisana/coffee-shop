import { randomUUID } from "node:crypto";

import request from "supertest";

import { hashPassword } from "../../src/auth/passwords";
import { createApp } from "../../src/app";
import { db } from "../../src/storage/db";
import {
  customizationChoices,
  customizationGroups,
  loyaltyCustomers,
  loyaltyEarningRules,
  loyaltyExpirationPolicies,
  loyaltyOrderAssociations,
  loyaltyPointAllocations,
  loyaltyPointLedgerEntries,
  loyaltyRewardOptions,
  loyaltyRewardRedemptions,
  menuCategories,
  menuItems,
  staffUsers,
} from "../../src/storage/schema";

export interface TestMenuFixture {
  categoryId: string;
  menuItemId: string;
  groupId: string;
  wholeMilkChoiceId: string;
  oatMilkChoiceId: string;
}

type LoggedInAgent = ReturnType<typeof request.agent>;
type UnsafeAgentMethod = "delete" | "patch" | "post" | "put";

export async function createTestStaff(password = "barista-pass") {
  const suffix = randomUUID().slice(0, 8);
  const [staff] = await db
    .insert(staffUsers)
    .values({
      username: `barista-${suffix}`,
      passwordHash: await hashPassword(password),
      displayName: `Barista ${suffix}`,
      authorizationStatus: "authorized",
    })
    .returning();

  if (!staff) {
    throw new Error("Unable to create test staff.");
  }

  return { staff, password };
}

export async function createTestMenuFixture(): Promise<TestMenuFixture> {
  const suffix = randomUUID().slice(0, 8);
  const [category] = await db
    .insert(menuCategories)
    .values({
      name: `Coffee ${suffix}`,
      displayOrder: 1,
      active: true,
    })
    .returning();

  if (!category) {
    throw new Error("Unable to create test category.");
  }

  const [item] = await db
    .insert(menuItems)
    .values({
      categoryId: category.id,
      name: `Latte ${suffix}`,
      description: "Espresso with steamed milk",
      price: "4.50",
      available: true,
      active: true,
      displayOrder: 1,
    })
    .returning();

  if (!item) {
    throw new Error("Unable to create test menu item.");
  }

  const [group] = await db
    .insert(customizationGroups)
    .values({
      menuItemId: item.id,
      name: "Milk",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      displayOrder: 1,
      active: true,
    })
    .returning();

  if (!group) {
    throw new Error("Unable to create test customization group.");
  }

  const [wholeMilk, oatMilk] = await db
    .insert(customizationChoices)
    .values([
      {
        customizationGroupId: group.id,
        name: "Whole Milk",
        priceAdjustment: "0.00",
        available: true,
        active: true,
        displayOrder: 1,
      },
      {
        customizationGroupId: group.id,
        name: "Oat Milk",
        priceAdjustment: "0.75",
        available: true,
        active: true,
        displayOrder: 2,
      },
    ])
    .returning();

  if (!wholeMilk || !oatMilk) {
    throw new Error("Unable to create test customization choices.");
  }

  return {
    categoryId: category.id,
    menuItemId: item.id,
    groupId: group.id,
    wholeMilkChoiceId: wholeMilk.id,
    oatMilkChoiceId: oatMilk.id,
  };
}

export async function createLoggedInAgent() {
  const credentials = await createTestStaff();
  const agent = request.agent(createApp());
  const csrfResponse = await agent.get("/auth/csrf-token");

  if (
    csrfResponse.status !== 200 ||
    typeof csrfResponse.body.csrfToken !== "string"
  ) {
    throw new Error(
      `Test CSRF token request failed with status ${csrfResponse.status}.`,
    );
  }

  const loginResponse = await agent
    .post("/auth/login")
    .set("X-CSRF-Token", csrfResponse.body.csrfToken)
    .send({
      username: credentials.staff.username,
      password: credentials.password,
    });

  if (loginResponse.status !== 204) {
    throw new Error(`Test login failed with status ${loginResponse.status}.`);
  }

  attachCsrfToken(agent, csrfResponse.body.csrfToken);

  return {
    agent,
    staff: credentials.staff,
  };
}

export async function cleanupLoyaltyFixtureData(): Promise<void> {
  await db.delete(loyaltyPointAllocations);
  await db.delete(loyaltyPointLedgerEntries);
  await db.delete(loyaltyRewardRedemptions);
  await db.delete(loyaltyOrderAssociations);
  await db.delete(loyaltyRewardOptions);
  await db.delete(loyaltyExpirationPolicies);
  await db.delete(loyaltyEarningRules);
  await db.delete(loyaltyCustomers);
}

function attachCsrfToken(agent: LoggedInAgent, csrfToken: string): void {
  for (const method of [
    "delete",
    "patch",
    "post",
    "put",
  ] as const satisfies UnsafeAgentMethod[]) {
    const original = agent[method].bind(agent);

    agent[method] = ((url: string) =>
      original(url).set(
        "X-CSRF-Token",
        csrfToken,
      )) as LoggedInAgent[typeof method];
  }
}
