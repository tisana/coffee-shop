import "dotenv/config";
import { eq } from "drizzle-orm";

import { hashPassword } from "../auth/passwords";
import { closeDatabase, db } from "./db";
import {
  customizationChoices,
  customizationGroups,
  menuCategories,
  menuItems,
  staffUsers
} from "./schema";

async function seed(): Promise<void> {
  const passwordHash = await hashPassword(process.env.SEED_STAFF_PASSWORD ?? "barista-pass");

  await db
    .insert(staffUsers)
    .values({
      username: process.env.SEED_STAFF_USERNAME ?? "barista",
      passwordHash,
      displayName: "Demo Barista",
      authorizationStatus: "authorized"
    })
    .onConflictDoNothing({ target: staffUsers.username });

  const existingCategory = await db.query.menuCategories.findFirst({
    where: eq(menuCategories.name, "Coffee")
  });

  const [category] = existingCategory
    ? [existingCategory]
    : await db
        .insert(menuCategories)
        .values({ name: "Coffee", displayOrder: 1, active: true })
        .returning();

  if (!category) {
    throw new Error("Unable to create or locate Coffee category.");
  }

  const existingLatte = await db.query.menuItems.findFirst({
    where: eq(menuItems.name, "Latte")
  });

  const [latte] = existingLatte
    ? [existingLatte]
    : await db
        .insert(menuItems)
        .values({
          categoryId: category.id,
          name: "Latte",
          description: "Espresso with steamed milk",
          price: "4.50",
          displayOrder: 1
        })
        .returning();

  if (!latte) {
    throw new Error("Unable to create or locate Latte menu item.");
  }

  const existingMilkGroup = await db.query.customizationGroups.findFirst({
    where: eq(customizationGroups.name, "Milk")
  });

  const [milkGroup] = existingMilkGroup
    ? [existingMilkGroup]
    : await db
        .insert(customizationGroups)
        .values({
          menuItemId: latte.id,
          name: "Milk",
          required: true,
          minSelections: 1,
          maxSelections: 1,
          displayOrder: 1
        })
        .returning();

  if (!milkGroup) {
    throw new Error("Unable to create or locate Milk customization group.");
  }

  const choices = [
    { name: "Whole Milk", priceAdjustment: "0.00", displayOrder: 1 },
    { name: "Oat Milk", priceAdjustment: "0.75", displayOrder: 2 }
  ];

  for (const choice of choices) {
    const existingChoice = await db.query.customizationChoices.findFirst({
      where: eq(customizationChoices.name, choice.name)
    });

    if (!existingChoice) {
      await db.insert(customizationChoices).values({
        customizationGroupId: milkGroup.id,
        ...choice
      });
    }
  }
}

seed()
  .then(async () => {
    await closeDatabase();
    console.warn("Database seed completed.");
  })
  .catch(async (error: unknown) => {
    await closeDatabase();
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  });
