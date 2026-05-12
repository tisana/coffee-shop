import { randomUUID } from "node:crypto";

import request from "supertest";

import { hashPassword } from "../../src/auth/passwords";
import { createApp } from "../../src/app";
import { db } from "../../src/storage/db";
import {
  customizationChoices,
  customizationGroups,
  menuCategories,
  menuItems,
  staffUsers
} from "../../src/storage/schema";

export interface TestMenuFixture {
  categoryId: string;
  menuItemId: string;
  groupId: string;
  wholeMilkChoiceId: string;
  oatMilkChoiceId: string;
}

export async function createTestStaff(password = "barista-pass") {
  const suffix = randomUUID().slice(0, 8);
  const [staff] = await db
    .insert(staffUsers)
    .values({
      username: `barista-${suffix}`,
      passwordHash: await hashPassword(password),
      displayName: `Barista ${suffix}`,
      authorizationStatus: "authorized"
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
      active: true
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
      displayOrder: 1
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
      active: true
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
        displayOrder: 1
      },
      {
        customizationGroupId: group.id,
        name: "Oat Milk",
        priceAdjustment: "0.75",
        available: true,
        active: true,
        displayOrder: 2
      }
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
    oatMilkChoiceId: oatMilk.id
  };
}

export async function createLoggedInAgent() {
  const credentials = await createTestStaff();
  const agent = request.agent(createApp());
  const loginResponse = await agent.post("/auth/login").send({
    username: credentials.staff.username,
    password: credentials.password
  });

  if (loginResponse.status !== 204) {
    throw new Error(`Test login failed with status ${loginResponse.status}.`);
  }

  return {
    agent,
    staff: credentials.staff
  };
}
