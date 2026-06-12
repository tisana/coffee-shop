import { and, asc, eq, inArray, notInArray } from "drizzle-orm";

import type {
  CustomizationChoiceInput,
  CustomizationGroupInput,
  MenuItemInput,
  MenuItemResponse
} from "@coffee-shop/shared/contracts/api";

import { badRequest, conflict, notFound } from "../routes/errors";
import { type Transaction, db, withTransaction } from "../storage/db";
import { customizationChoices, customizationGroups, menuCategories, menuItems } from "../storage/schema";

function itemValues(input: MenuItemInput) {
  return {
    categoryId: input.categoryId,
    name: input.name,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    price: input.price,
    available: input.available ?? true,
    active: input.active ?? true,
    updatedAt: new Date()
  };
}

async function assertCategoryExists(tx: Transaction, categoryId: string): Promise<void> {
  const [category] = await tx
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(eq(menuCategories.id, categoryId))
    .limit(1);

  if (!category) {
    throw badRequest("Menu category does not exist.");
  }
}

async function upsertChoice(
  tx: Transaction,
  groupId: string,
  choice: CustomizationChoiceInput
): Promise<string> {
  if (choice.id) {
    const [existingChoice] = await tx
      .select({ id: customizationChoices.id })
      .from(customizationChoices)
      .where(
        and(
          eq(customizationChoices.id, choice.id),
          eq(customizationChoices.customizationGroupId, groupId)
        )
      )
      .limit(1);

    if (!existingChoice) {
      throw badRequest("Customization choice does not belong to this group.");
    }

    await tx
      .update(customizationChoices)
      .set({
        name: choice.name,
        priceAdjustment: choice.priceAdjustment ?? "0.00",
        available: choice.available ?? true,
        displayOrder: choice.displayOrder ?? 0,
        active: choice.active ?? true,
        updatedAt: new Date()
      })
      .where(eq(customizationChoices.id, choice.id));

    return choice.id;
  }

  const [insertedChoice] = await tx
    .insert(customizationChoices)
    .values({
      customizationGroupId: groupId,
      name: choice.name,
      priceAdjustment: choice.priceAdjustment ?? "0.00",
      available: choice.available ?? true,
      displayOrder: choice.displayOrder ?? 0,
      active: choice.active ?? true
    })
    .returning({ id: customizationChoices.id });

  if (!insertedChoice) {
    throw new Error("Unable to create customization choice.");
  }

  return insertedChoice.id;
}

async function upsertGroup(
  tx: Transaction,
  itemId: string,
  group: CustomizationGroupInput
): Promise<string> {
  let groupId = group.id;

  if (groupId) {
    const [existingGroup] = await tx
      .select({ id: customizationGroups.id })
      .from(customizationGroups)
      .where(and(eq(customizationGroups.id, groupId), eq(customizationGroups.menuItemId, itemId)))
      .limit(1);

    if (!existingGroup) {
      throw badRequest("Customization group does not belong to this menu item.");
    }

    await tx
      .update(customizationGroups)
      .set({
        name: group.name,
        required: group.required ?? false,
        minSelections: group.minSelections ?? 0,
        maxSelections: group.maxSelections ?? 1,
        displayOrder: group.displayOrder ?? 0,
        active: group.active ?? true,
        updatedAt: new Date()
      })
      .where(eq(customizationGroups.id, groupId));
  } else {
    const [insertedGroup] = await tx
      .insert(customizationGroups)
      .values({
        menuItemId: itemId,
        name: group.name,
        required: group.required ?? false,
        minSelections: group.minSelections ?? 0,
        maxSelections: group.maxSelections ?? 1,
        displayOrder: group.displayOrder ?? 0,
        active: group.active ?? true
      })
      .returning({ id: customizationGroups.id });

    if (!insertedGroup) {
      throw new Error("Unable to create customization group.");
    }

    groupId = insertedGroup.id;
  }

  const retainedChoiceIds: string[] = [];
  for (const choice of group.choices ?? []) {
    retainedChoiceIds.push(await upsertChoice(tx, groupId, choice));
  }

  await tx
    .update(customizationChoices)
    .set({ active: false, updatedAt: new Date() })
    .where(
      retainedChoiceIds.length > 0
        ? and(
            eq(customizationChoices.customizationGroupId, groupId),
            notInArray(customizationChoices.id, retainedChoiceIds)
          )
        : eq(customizationChoices.customizationGroupId, groupId)
    );

  return groupId;
}

async function replaceCustomizationGroups(
  tx: Transaction,
  itemId: string,
  groups: CustomizationGroupInput[]
): Promise<void> {
  const retainedGroupIds: string[] = [];

  for (const group of groups) {
    retainedGroupIds.push(await upsertGroup(tx, itemId, group));
  }

  await tx
    .update(customizationGroups)
    .set({ active: false, updatedAt: new Date() })
    .where(
      retainedGroupIds.length > 0
        ? and(
            eq(customizationGroups.menuItemId, itemId),
            notInArray(customizationGroups.id, retainedGroupIds)
          )
        : eq(customizationGroups.menuItemId, itemId)
    );
}

async function loadMenuItemForMaintenance(
  client: Transaction | typeof db,
  itemId: string
): Promise<MenuItemResponse | null> {
  const [item] = await client.select().from(menuItems).where(eq(menuItems.id, itemId)).limit(1);

  if (!item) {
    return null;
  }

  const groupRows = await client
    .select()
    .from(customizationGroups)
    .where(eq(customizationGroups.menuItemId, item.id))
    .orderBy(asc(customizationGroups.displayOrder), asc(customizationGroups.name));

  const choiceRows =
    groupRows.length > 0
      ? await client
          .select()
          .from(customizationChoices)
          .where(
            inArray(
              customizationChoices.customizationGroupId,
              groupRows.map((group) => group.id)
            )
          )
          .orderBy(asc(customizationChoices.displayOrder), asc(customizationChoices.name))
      : [];

  const choicesByGroup = new Map<string, typeof choiceRows>();
  for (const choice of choiceRows) {
    const choices = choicesByGroup.get(choice.customizationGroupId) ?? [];
    choices.push(choice);
    choicesByGroup.set(choice.customizationGroupId, choices);
  }

  return {
    ...item,
    customizationGroups: groupRows.map((group) => ({
      ...group,
      choices: choicesByGroup.get(group.id) ?? []
    }))
  };
}

export async function getMenuItemForMaintenance(itemId: string): Promise<MenuItemResponse | null> {
  return loadMenuItemForMaintenance(db, itemId);
}

export async function createMenuItem(input: MenuItemInput): Promise<MenuItemResponse> {
  return withTransaction(async (tx) => {
    await assertCategoryExists(tx, input.categoryId);

    const [item] = await tx.insert(menuItems).values(itemValues(input)).returning();

    if (!item) {
      throw new Error("Unable to create menu item.");
    }

    await replaceCustomizationGroups(tx, item.id, input.customizationGroups ?? []);
    const savedItem = await loadMenuItemForMaintenance(tx, item.id);

    if (!savedItem) {
      throw new Error("Unable to load created menu item.");
    }

    return savedItem;
  });
}

export async function updateMenuItem(
  itemId: string,
  input: MenuItemInput
): Promise<MenuItemResponse> {
  return withTransaction(async (tx) => {
    await assertCategoryExists(tx, input.categoryId);

    const [existingItem] = await tx
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.id, itemId))
      .limit(1);

    if (!existingItem) {
      throw notFound("Menu item not found.");
    }

    await tx.update(menuItems).set(itemValues(input)).where(eq(menuItems.id, itemId));

    if (input.customizationGroups) {
      await replaceCustomizationGroups(tx, itemId, input.customizationGroups);
    }

    const savedItem = await loadMenuItemForMaintenance(tx, itemId);

    if (!savedItem) {
      throw notFound("Menu item not found.");
    }

    return savedItem;
  });
}

export async function retireMenuItem(itemId: string): Promise<MenuItemResponse> {
  return withTransaction(async (tx) => {
    const [existingItem] = await tx
      .select({ id: menuItems.id, active: menuItems.active, available: menuItems.available })
      .from(menuItems)
      .where(eq(menuItems.id, itemId))
      .limit(1);

    if (!existingItem) {
      throw notFound("Menu item not found.");
    }

    if (existingItem.available || existingItem.active) {
      throw conflict("Menu item must be unavailable and inactive before it can be deleted.");
    }

    await tx
      .update(menuItems)
      .set({
        active: false,
        available: false,
        updatedAt: new Date()
      })
      .where(eq(menuItems.id, itemId));

    const retiredItem = await loadMenuItemForMaintenance(tx, itemId);

    if (!retiredItem) {
      throw notFound("Menu item not found.");
    }

    return retiredItem;
  });
}
