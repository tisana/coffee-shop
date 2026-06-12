import { asc, eq } from "drizzle-orm";

import type { MenuCategory, MenuItem } from "@coffee-shop/shared/domain/types";

import { db } from "../storage/db";
import { customizationChoices, customizationGroups, menuCategories, menuItems } from "../storage/schema";

export async function listMenuCategoriesForOrderTaking(): Promise<MenuCategory[]> {
  const categoryRows = await db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.active, true))
    .orderBy(asc(menuCategories.displayOrder), asc(menuCategories.name));

  const itemRows = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.active, true))
    .orderBy(asc(menuItems.displayOrder), asc(menuItems.name));

  const groupRows = await db
    .select()
    .from(customizationGroups)
    .where(eq(customizationGroups.active, true))
    .orderBy(asc(customizationGroups.displayOrder), asc(customizationGroups.name));

  const choiceRows = await db
    .select()
    .from(customizationChoices)
    .where(eq(customizationChoices.active, true))
    .orderBy(asc(customizationChoices.displayOrder), asc(customizationChoices.name));

  const choicesByGroup = new Map<string, typeof choiceRows>();
  for (const choice of choiceRows) {
    const choices = choicesByGroup.get(choice.customizationGroupId) ?? [];
    choices.push(choice);
    choicesByGroup.set(choice.customizationGroupId, choices);
  }

  const groupsByItem = new Map<string, typeof groupRows>();
  for (const group of groupRows) {
    const groups = groupsByItem.get(group.menuItemId) ?? [];
    groups.push(group);
    groupsByItem.set(group.menuItemId, groups);
  }

  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const item of itemRows) {
    const items = itemsByCategory.get(item.categoryId) ?? [];
    items.push({
      ...item,
      description: item.description,
      customizationGroups: (groupsByItem.get(item.id) ?? []).map((group) => ({
        ...group,
        choices: choicesByGroup.get(group.id) ?? []
      }))
    });
    itemsByCategory.set(item.categoryId, items);
  }

  return categoryRows.map((category) => ({
    ...category,
    menuItems: itemsByCategory.get(category.id) ?? []
  }));
}
