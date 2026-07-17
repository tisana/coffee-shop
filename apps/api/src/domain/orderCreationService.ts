import { and, eq, inArray, sql } from "drizzle-orm";

import type {
  OrderWithLoyalty,
  SelectedCustomization,
  SelectedCustomizationSnapshot
} from "@coffee-shop/shared/domain/types";

import { badRequest } from "../routes/errors";
import { type Transaction, db, withTransaction } from "../storage/db";
import {
  customizationChoices,
  customizationGroups,
  dailyOrderSequences,
  menuItems,
  orderBeverages,
  orders
} from "../storage/schema";
import { currentBusinessDate } from "./businessDate";
import { associateCustomerWithOrder, getOrderLoyaltyDetails } from "./loyaltyOrderService";
import { mapOrderWithLoyalty } from "./orderMapper";

export interface CreateOrderInput {
  pickupName?: string | undefined;
  beverages: Array<{
    menuItemId: string;
    quantity: number;
    selectedCustomizations?: SelectedCustomization[];
    specialInstructions?: string | undefined;
  }>;
  loyalty?: { customerId: string } | undefined;
}

interface BeverageSnapshotInput {
  sourceMenuItemId: string;
  nameSnapshot: string;
  quantity: number;
  priceSnapshot: string;
  selectedCustomizationsSnapshot: SelectedCustomizationSnapshot[];
  specialInstructions?: string | undefined;
}

function addMoney(left: string, right: string): string {
  return (Number(left) + Number(right)).toFixed(2);
}

function multiplyMoney(value: string, quantity: number): string {
  return (Number(value) * quantity).toFixed(2);
}

async function buildBeverageSnapshot(
  tx: Transaction,
  beverage: CreateOrderInput["beverages"][number]
): Promise<BeverageSnapshotInput> {
  const [item] = await tx
    .select()
    .from(menuItems)
    .where(
      and(
        eq(menuItems.id, beverage.menuItemId),
        eq(menuItems.active, true),
        eq(menuItems.available, true)
      )
    )
    .limit(1);

  if (!item) {
    throw badRequest("Selected menu item is not available for new orders.");
  }

  const groups = await tx
    .select()
    .from(customizationGroups)
    .where(and(eq(customizationGroups.menuItemId, item.id), eq(customizationGroups.active, true)));

  const groupById = new Map(groups.map((group) => [group.id, group]));
  const selectedCustomizations = beverage.selectedCustomizations ?? [];
  const selectedGroupIds = new Set(selectedCustomizations.map((selection) => selection.customizationGroupId));

  for (const group of groups) {
    const selection = selectedCustomizations.find(
      (candidate) => candidate.customizationGroupId === group.id
    );
    const count = selection?.customizationChoiceIds.length ?? 0;

    if (group.required && count < group.minSelections) {
      throw badRequest(`Customization group "${group.name}" requires a selection.`);
    }

    if (count < group.minSelections || count > group.maxSelections) {
      throw badRequest(`Customization group "${group.name}" has an invalid number of selections.`);
    }
  }

  for (const groupId of selectedGroupIds) {
    if (!groupById.has(groupId)) {
      throw badRequest("Selected customization group is not available for this item.");
    }
  }

  const selectedChoiceIds = selectedCustomizations.flatMap(
    (selection) => selection.customizationChoiceIds
  );
  const choiceRows =
    selectedChoiceIds.length > 0
      ? await tx
          .select()
          .from(customizationChoices)
          .where(
            and(
              inArray(customizationChoices.id, selectedChoiceIds),
              eq(customizationChoices.active, true),
              eq(customizationChoices.available, true)
            )
          )
      : [];

  const choiceById = new Map(choiceRows.map((choice) => [choice.id, choice]));
  let unitPrice = item.price;
  const selectedCustomizationsSnapshot: SelectedCustomizationSnapshot[] = [];

  for (const selection of selectedCustomizations) {
    const group = groupById.get(selection.customizationGroupId);

    if (!group) {
      throw badRequest("Selected customization group is not available for this item.");
    }

    const choices = selection.customizationChoiceIds.map((choiceId) => {
      const choice = choiceById.get(choiceId);

      if (!choice || choice.customizationGroupId !== group.id) {
        throw badRequest("Selected customization choice is not available for this group.");
      }

      unitPrice = addMoney(unitPrice, choice.priceAdjustment);

      return {
        choiceName: choice.name,
        priceAdjustment: choice.priceAdjustment
      };
    });

    selectedCustomizationsSnapshot.push({
      groupName: group.name,
      choices
    });
  }

  return {
    sourceMenuItemId: item.id,
    nameSnapshot: item.name,
    quantity: beverage.quantity,
    priceSnapshot: unitPrice,
    selectedCustomizationsSnapshot,
    ...(beverage.specialInstructions ? { specialInstructions: beverage.specialInstructions } : {})
  };
}

export async function createOrderForStaff(
  staffId: string,
  input: CreateOrderInput
): Promise<OrderWithLoyalty> {
  return withTransaction(async (tx) => {
    const businessDate = currentBusinessDate();
    const [sequence] = await tx
      .insert(dailyOrderSequences)
      .values({
        businessDate,
        lastIssuedNumber: 1,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: dailyOrderSequences.businessDate,
        set: {
          lastIssuedNumber: sql`${dailyOrderSequences.lastIssuedNumber} + 1`,
          updatedAt: new Date()
        }
      })
      .returning();

    if (!sequence) {
      throw new Error("Unable to issue a daily order number.");
    }

    const beverageSnapshots = await Promise.all(
      input.beverages.map((beverage) => buildBeverageSnapshot(tx, beverage))
    );
    const total = beverageSnapshots
      .reduce((sum, beverage) => sum + Number(multiplyMoney(beverage.priceSnapshot, beverage.quantity)), 0)
      .toFixed(2);

    const [order] = await tx
      .insert(orders)
      .values({
        businessDate,
        dailyOrderNumber: sequence.lastIssuedNumber,
        ...(input.pickupName ? { pickupName: input.pickupName } : {}),
        status: "created",
        createdByStaffId: staffId,
        total
      })
      .returning();

    if (!order) {
      throw new Error("Unable to create order.");
    }

    const insertedBeverages = await tx
      .insert(orderBeverages)
      .values(
        beverageSnapshots.map((beverage) => ({
          orderId: order.id,
          sourceMenuItemId: beverage.sourceMenuItemId,
          nameSnapshot: beverage.nameSnapshot,
          quantity: beverage.quantity,
          priceSnapshot: beverage.priceSnapshot,
          selectedCustomizationsSnapshot: beverage.selectedCustomizationsSnapshot,
          ...(beverage.specialInstructions
            ? { specialInstructions: beverage.specialInstructions }
            : {})
        }))
      )
      .returning();

    const loyalty = input.loyalty
      ? await associateCustomerWithOrder(tx, order.id, input.loyalty.customerId, staffId)
      : null;

    return mapOrderWithLoyalty(order, insertedBeverages, loyalty);
  });
}

export async function getOrderById(orderId: string): Promise<OrderWithLoyalty | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

  if (!order) {
    return null;
  }

  const beverages = await db
    .select()
    .from(orderBeverages)
    .where(eq(orderBeverages.orderId, order.id));

  return mapOrderWithLoyalty(order, beverages, await getOrderLoyaltyDetails(db, order.id));
}
