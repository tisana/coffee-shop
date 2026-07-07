import "dotenv/config";
import { and, eq, inArray, notInArray } from "drizzle-orm";

import { hashPassword } from "../auth/passwords";
import { currentBusinessDate } from "../domain/businessDate";
import { closeDatabase, db } from "./db";
import { buildReportDemoOrderSeeds, type ReportDemoOrderSeed } from "./reportDemoSeedData";
import {
  customizationChoices,
  customizationGroups,
  menuCategories,
  menuItems,
  orderBeverages,
  orders,
  staffUsers
} from "./schema";

interface SeedItem {
  category: string;
  name: string;
  description: string;
  price: string;
  displayOrder: number;
  imageUrl?: string;
  customizable?: boolean;
}

const menuImages: Record<string, string> = {
  Americano:
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=320&q=80",
  Cappuccino:
    "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=320&q=80",
  "Caramel Macchiato":
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=320&q=80",
  "Cold Brew":
    "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=320&q=80",
  "Drip Coffee":
    "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=320&q=80",
  Espresso:
    "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=320&q=80",
  "Flat White":
    "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=320&q=80",
  Latte:
    "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=320&q=80",
  Mocha:
    "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=320&q=80",
  "Matcha Latte":
    "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=320&q=80",
  "Hot Chocolate":
    "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?auto=format&fit=crop&w=320&q=80",
  Croissant:
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=320&q=80",
  "Blueberry Muffin":
    "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=320&q=80"
};

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
  const seedStaffUsername = process.env.SEED_STAFF_USERNAME ?? "barista";
  const passwordHash = await hashPassword(process.env.SEED_STAFF_PASSWORD ?? "barista-pass");

  await db
    .insert(staffUsers)
    .values({
      username: seedStaffUsername,
      passwordHash,
      displayName: "Demo Barista",
      authorizationStatus: "authorized"
    })
    .onConflictDoNothing({ target: staffUsers.username });
  const seedStaffUser = await db.query.staffUsers.findFirst({
    where: eq(staffUsers.username, seedStaffUsername)
  });

  if (!seedStaffUser) {
    throw new Error("Unable to create or locate seed staff user.");
  }

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

  await seedReportDemoOrders(seedStaffUser.id);
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
        imageUrl: item.imageUrl ?? menuImages[item.name] ?? null,
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
      imageUrl: item.imageUrl ?? menuImages[item.name] ?? null,
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

async function seedReportDemoOrders(staffId: string): Promise<void> {
  const demoOrders = buildReportDemoOrderSeeds(currentBusinessDate());
  const requiredMenuItemNames = Array.from(
    new Set(demoOrders.flatMap((order) => order.beverages.map((beverage) => beverage.itemName)))
  );
  const demoMenuItems = await db
    .select({ id: menuItems.id, name: menuItems.name })
    .from(menuItems)
    .where(inArray(menuItems.name, requiredMenuItemNames));
  const menuItemIdByName = new Map(demoMenuItems.map((item) => [item.name, item.id]));

  for (const itemName of requiredMenuItemNames) {
    if (!menuItemIdByName.has(itemName)) {
      throw new Error(`Unable to locate ${itemName} for report demo seed orders.`);
    }
  }

  for (const demoOrder of demoOrders) {
    await upsertReportDemoOrder(staffId, menuItemIdByName, demoOrder);
  }
}

async function upsertReportDemoOrder(
  staffId: string,
  menuItemIdByName: ReadonlyMap<string, string>,
  demoOrder: ReportDemoOrderSeed
): Promise<void> {
  const existingOrder = await db.query.orders.findFirst({
    where: and(eq(orders.businessDate, demoOrder.businessDate), eq(orders.pickupName, demoOrder.pickupName))
  });
  const dailyOrderNumber = await availableDailyOrderNumber(
    demoOrder.businessDate,
    demoOrder.dailyOrderNumber,
    existingOrder?.id
  );
  const orderValues = {
    businessDate: demoOrder.businessDate,
    dailyOrderNumber,
    pickupName: demoOrder.pickupName,
    status: demoOrder.status,
    createdByStaffId: staffId,
    assignedBaristaId: staffId,
    total: demoOrder.total,
    createdAt: toDate(demoOrder.createdAt),
    queuedAt: toDate(demoOrder.queuedAt),
    inProgressAt: toDate(demoOrder.inProgressAt),
    completedAt: toDate(demoOrder.completedAt),
    pickedUpAt: demoOrder.pickedUpAt ? toDate(demoOrder.pickedUpAt) : null,
    cancelledAt: null
  };
  const orderId = existingOrder
    ? await updateReportDemoOrder(existingOrder.id, orderValues)
    : await insertReportDemoOrder(orderValues);

  await db.delete(orderBeverages).where(eq(orderBeverages.orderId, orderId));
  await db.insert(orderBeverages).values(
    demoOrder.beverages.map((beverage) => {
      const sourceMenuItemId = menuItemIdByName.get(beverage.itemName);

      if (!sourceMenuItemId) {
        throw new Error(`Unable to locate ${beverage.itemName} for report demo seed beverage.`);
      }

      return {
        orderId,
        sourceMenuItemId,
        nameSnapshot: beverage.itemName,
        quantity: beverage.quantity,
        priceSnapshot: beverage.priceSnapshot,
        selectedCustomizationsSnapshot: beverage.selectedCustomizationsSnapshot,
        specialInstructions: beverage.specialInstructions,
        status: beverage.status,
        completedAt: toDate(demoOrder.completedAt),
        cancelledAt: null,
        cancellationReason: null
      };
    })
  );
}

async function insertReportDemoOrder(orderValues: typeof orders.$inferInsert): Promise<string> {
  const [insertedOrder] = await db.insert(orders).values(orderValues).returning({ id: orders.id });

  if (!insertedOrder) {
    throw new Error("Unable to create report demo seed order.");
  }

  return insertedOrder.id;
}

async function updateReportDemoOrder(
  orderId: string,
  orderValues: typeof orders.$inferInsert
): Promise<string> {
  const [updatedOrder] = await db
    .update(orders)
    .set(orderValues)
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id });

  if (!updatedOrder) {
    throw new Error("Unable to update report demo seed order.");
  }

  return updatedOrder.id;
}

async function availableDailyOrderNumber(
  businessDate: string,
  preferredDailyOrderNumber: number,
  existingOrderId: string | undefined
): Promise<number> {
  const sameDayOrders = await db
    .select({ id: orders.id, dailyOrderNumber: orders.dailyOrderNumber })
    .from(orders)
    .where(eq(orders.businessDate, businessDate));
  const usedDailyOrderNumbers = new Set(
    sameDayOrders
      .filter((order) => order.id !== existingOrderId)
      .map((order) => order.dailyOrderNumber)
  );
  let candidate = preferredDailyOrderNumber;

  while (usedDailyOrderNumbers.has(candidate)) {
    candidate += 1;
  }

  return candidate;
}

function toDate(value: string): Date {
  return new Date(value);
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
