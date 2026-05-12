import "dotenv/config";
import { and, eq, notInArray } from "drizzle-orm";

import { hashPassword } from "../auth/passwords";
import { closeDatabase, db } from "./db";
import {
  customizationChoices,
  customizationGroups,
  menuCategories,
  menuItems,
  staffUsers
} from "./schema";

interface SeedItem {
  category: string;
  name: string;
  description: string;
  price: string;
  displayOrder: number;
  customizable?: boolean;
}

const seedItems: SeedItem[] = [
  {
    category: "Hot Coffee",
    name: "Latte",
    description: "Espresso with steamed milk and a light foam finish",
    price: "5.25",
    displayOrder: 1,
    customizable: true
  },
  {
    category: "Hot Coffee",
    name: "Cappuccino",
    description: "Espresso, steamed milk, and thick microfoam",
    price: "5.00",
    displayOrder: 2,
    customizable: true
  },
  {
    category: "Hot Coffee",
    name: "Americano",
    description: "Espresso lengthened with hot water",
    price: "3.25",
    displayOrder: 3,
    customizable: true
  },
  {
    category: "Hot Coffee",
    name: "Mocha",
    description: "Espresso with chocolate, steamed milk, and cocoa",
    price: "5.75",
    displayOrder: 4,
    customizable: true
  },
  {
    category: "Hot Coffee",
    name: "Caramel Macchiato",
    description: "Vanilla milk, espresso, and caramel drizzle",
    price: "5.75",
    displayOrder: 5,
    customizable: true
  },
  {
    category: "Hot Coffee",
    name: "Flat White",
    description: "Double espresso with velvety steamed milk",
    price: "4.75",
    displayOrder: 6,
    customizable: true
  },
  {
    category: "Hot Coffee",
    name: "Drip Coffee",
    description: "Fresh batch-brewed house coffee",
    price: "2.75",
    displayOrder: 7
  },
  {
    category: "Hot Coffee",
    name: "Espresso",
    description: "Concentrated double shot",
    price: "2.50",
    displayOrder: 8
  },
  {
    category: "Iced Coffee",
    name: "Cold Brew",
    description: "Slow-steeped coffee served over ice",
    price: "4.25",
    displayOrder: 1,
    customizable: true
  },
  {
    category: "Non-Coffee",
    name: "Matcha Latte",
    description: "Ceremonial matcha with steamed milk",
    price: "5.50",
    displayOrder: 1,
    customizable: true
  },
  {
    category: "Non-Coffee",
    name: "Hot Chocolate",
    description: "Steamed milk and dark chocolate",
    price: "4.25",
    displayOrder: 2,
    customizable: true
  },
  {
    category: "Pastries",
    name: "Croissant",
    description: "Buttery laminated pastry",
    price: "3.75",
    displayOrder: 1
  },
  {
    category: "Pastries",
    name: "Blueberry Muffin",
    description: "Bakery muffin with blueberries and sugar top",
    price: "3.50",
    displayOrder: 2
  }
];

const categoryOrder = ["Hot Coffee", "Iced Coffee", "Non-Coffee", "Pastries", "Food", "Add-ons"];

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

  for (const categoryName of categoryOrder) {
    await upsertCategory(categoryName, categoryOrder.indexOf(categoryName) + 1);
  }

  for (const item of seedItems) {
    const category = await upsertCategory(
      item.category,
      categoryOrder.indexOf(item.category) + 1 || 99
    );
    const menuItem = await upsertMenuItem(category.id, item);

    if (item.customizable) {
      await seedMilkChoices(menuItem.id);
    }
  }

  await db
    .update(menuCategories)
    .set({ active: false })
    .where(notInArray(menuCategories.name, categoryOrder));
  await db
    .update(menuItems)
    .set({ active: false, available: false })
    .where(notInArray(menuItems.name, seedItems.map((item) => item.name)));
}

async function upsertCategory(name: string, displayOrder: number) {
  const existingCategory = await db.query.menuCategories.findFirst({
    where: eq(menuCategories.name, name)
  });

  if (existingCategory) {
    const [updatedCategory] = await db
      .update(menuCategories)
      .set({ displayOrder, active: true })
      .where(eq(menuCategories.id, existingCategory.id))
      .returning();

    if (!updatedCategory) {
      throw new Error(`Unable to update ${name} category.`);
    }

    return updatedCategory;
  }

  const [category] = await db
    .insert(menuCategories)
    .values({ name, displayOrder, active: true })
    .returning();

  if (!category) {
    throw new Error(`Unable to create ${name} category.`);
  }

  return category;
}

async function upsertMenuItem(categoryId: string, item: SeedItem) {
  const existingItem = await db.query.menuItems.findFirst({
    where: eq(menuItems.name, item.name)
  });

  if (existingItem) {
    const [updatedItem] = await db
      .update(menuItems)
      .set({
        categoryId,
        description: item.description,
        price: item.price,
        available: true,
        active: true,
        displayOrder: item.displayOrder
      })
      .where(eq(menuItems.id, existingItem.id))
      .returning();

    if (!updatedItem) {
      throw new Error(`Unable to update ${item.name} menu item.`);
    }

    return updatedItem;
  }

  const [menuItem] = await db
    .insert(menuItems)
    .values({
      categoryId,
      name: item.name,
      description: item.description,
      price: item.price,
      available: true,
      active: true,
      displayOrder: item.displayOrder
    })
    .returning();

  if (!menuItem) {
    throw new Error(`Unable to create ${item.name} menu item.`);
  }

  return menuItem;
}

async function seedMilkChoices(menuItemId: string): Promise<void> {
  const existingMilkGroup = await db.query.customizationGroups.findFirst({
    where: and(eq(customizationGroups.menuItemId, menuItemId), eq(customizationGroups.name, "Milk"))
  });

  const [milkGroup] = existingMilkGroup
    ? await db
        .update(customizationGroups)
        .set({
          required: true,
          minSelections: 1,
          maxSelections: 1,
          displayOrder: 1,
          active: true
        })
        .where(eq(customizationGroups.id, existingMilkGroup.id))
        .returning()
    : await db
        .insert(customizationGroups)
        .values({
          menuItemId,
          name: "Milk",
          required: true,
          minSelections: 1,
          maxSelections: 1,
          displayOrder: 1,
          active: true
        })
        .returning();

  if (!milkGroup) {
    throw new Error("Unable to create or locate Milk customization group.");
  }

  const choices = [
    { name: "Whole Milk", priceAdjustment: "0.00", displayOrder: 1 },
    { name: "Oat Milk", priceAdjustment: "0.00", displayOrder: 2 },
    { name: "Almond Milk", priceAdjustment: "0.75", displayOrder: 3 }
  ];

  for (const choice of choices) {
    const existingChoice = await db.query.customizationChoices.findFirst({
      where: and(
        eq(customizationChoices.customizationGroupId, milkGroup.id),
        eq(customizationChoices.name, choice.name)
      )
    });

    if (existingChoice) {
      await db
        .update(customizationChoices)
        .set({
          priceAdjustment: choice.priceAdjustment,
          available: true,
          active: true,
          displayOrder: choice.displayOrder
        })
        .where(eq(customizationChoices.id, existingChoice.id));
    } else {
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
