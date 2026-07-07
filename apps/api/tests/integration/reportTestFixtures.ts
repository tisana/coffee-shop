import { eq } from "drizzle-orm";

import type { Order } from "@coffee-shop/shared/domain/types";

import { cancelOrderBeverage, completeOrderBeverage } from "../../src/domain/beverageService";
import { createOrderForStaff, getOrderById } from "../../src/domain/orderCreationService";
import {
  cancelOrder,
  completeOrder,
  confirmOrderPickup
} from "../../src/domain/orderFulfillmentService";
import { claimQueuedOrder } from "../../src/domain/queueClaimService";
import { submitOrderToQueue } from "../../src/domain/queueSubmissionService";
import { db } from "../../src/storage/db";
import {
  customizationChoices,
  customizationGroups,
  menuCategories,
  menuItems,
  orderBeverages,
  orders
} from "../../src/storage/schema";

export type ReportOrderLifecycleStatus = Extract<Order["status"], "completed" | "picked_up" | "cancelled">;
export type ReportMenuItemKey = "latte" | "cappuccino" | "mocha";
export type ReportMilkChoice = "whole" | "oat";

export interface ReportMenuItemFixture {
  categoryId: string;
  menuItemId: string;
  groupId: string;
  wholeMilkChoiceId: string;
  oatMilkChoiceId: string;
  name: string;
}

export interface ReportTestMenuFixture {
  categoryId: string;
  categoryName: string;
  items: Record<ReportMenuItemKey, ReportMenuItemFixture>;
}

export interface ReportOrderBeverageFixtureInput {
  itemKey?: ReportMenuItemKey;
  quantity?: number;
  milk?: ReportMilkChoice;
  specialInstructions?: string;
  cancel?: boolean;
}

export interface ReportOrderFixtureOptions {
  pickupName?: string;
  businessDate?: string;
  dailyOrderNumber?: number;
  beverages?: ReportOrderBeverageFixtureInput[];
}

export interface CreateReportOrderOptions extends ReportOrderFixtureOptions {
  status: ReportOrderLifecycleStatus;
}

const reportMenuItems: Array<{ key: ReportMenuItemKey; name: string; price: string; displayOrder: number }> = [
  { key: "latte", name: "Report Latte", price: "4.50", displayOrder: 1 },
  { key: "cappuccino", name: "Report Cappuccino", price: "4.25", displayOrder: 2 },
  { key: "mocha", name: "Report Mocha", price: "5.00", displayOrder: 3 }
];

let generatedDailyOrderNumber = 10_000;

export async function createReportTestMenuFixture(): Promise<ReportTestMenuFixture> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const categoryName = `Report Coffee ${suffix}`;
  const [category] = await db
    .insert(menuCategories)
    .values({
      name: categoryName,
      displayOrder: 90,
      active: true
    })
    .returning();

  if (!category) {
    throw new Error("Unable to create report test category.");
  }

  const items = {} as Record<ReportMenuItemKey, ReportMenuItemFixture>;

  for (const definition of reportMenuItems) {
    items[definition.key] = await createReportMenuItemFixture({
      categoryId: category.id,
      suffix,
      ...definition
    });
  }

  return {
    categoryId: category.id,
    categoryName,
    items
  };
}

export async function createCompletedReportOrder(
  staffId: string,
  menu: ReportTestMenuFixture,
  options: ReportOrderFixtureOptions = {}
): Promise<Order> {
  return createReportOrder(staffId, menu, { ...options, status: "completed" });
}

export async function createPickedUpReportOrder(
  staffId: string,
  menu: ReportTestMenuFixture,
  options: ReportOrderFixtureOptions = {}
): Promise<Order> {
  return createReportOrder(staffId, menu, { ...options, status: "picked_up" });
}

export async function createFullyCancelledReportOrder(
  staffId: string,
  menu: ReportTestMenuFixture,
  options: ReportOrderFixtureOptions = {}
): Promise<Order> {
  return createReportOrder(staffId, menu, { ...options, status: "cancelled" });
}

export async function createPartiallyCancelledReportOrder(
  staffId: string,
  menu: ReportTestMenuFixture,
  options: ReportOrderFixtureOptions = {}
): Promise<Order> {
  const beverages = options.beverages ?? [
    { itemKey: "latte", milk: "whole", cancel: true },
    { itemKey: "cappuccino", milk: "oat" }
  ];
  const hasCancelledBeverage = beverages.some((beverage) => beverage.cancel);
  const hasReportableBeverage = beverages.some((beverage) => !beverage.cancel);

  if (!hasCancelledBeverage || !hasReportableBeverage) {
    throw new Error("Partial cancellation fixtures need at least one cancelled and one reportable beverage.");
  }

  return createReportOrder(staffId, menu, {
    ...options,
    beverages,
    status: "completed"
  });
}

export async function createNinetyDayReportOrders(
  staffId: string,
  menu: ReportTestMenuFixture,
  options: { startDate?: string; count?: number } = {}
): Promise<Order[]> {
  const startDate = options.startDate ?? "2026-01-01";
  const count = options.count ?? 90;
  const createdOrders: Order[] = [];

  for (let index = 0; index < count; index += 1) {
    const businessDate = addDays(startDate, index);
    const itemKey: ReportMenuItemKey =
      index % 3 === 0 ? "latte" : index % 3 === 1 ? "cappuccino" : "mocha";
    const status: ReportOrderLifecycleStatus = index % 4 === 0 ? "picked_up" : "completed";

    createdOrders.push(
      await createReportOrder(staffId, menu, {
        status,
        businessDate,
        dailyOrderNumber: 1,
        pickupName: `Report Guest ${index + 1}`,
        beverages: [
          {
            itemKey,
            milk: index % 2 === 0 ? "whole" : "oat",
            quantity: (index % 3) + 1
          }
        ]
      })
    );
  }

  return createdOrders;
}

export async function createReportOrder(
  staffId: string,
  menu: ReportTestMenuFixture,
  options: CreateReportOrderOptions
): Promise<Order> {
  const beverageInputs = options.beverages ?? [{ itemKey: "latte", milk: "whole" }];

  if (options.status !== "cancelled" && beverageInputs.every((beverage) => beverage.cancel)) {
    throw new Error("Completed or picked-up report orders need at least one reportable beverage.");
  }

  const createdOrder = await createOrderForStaff(staffId, {
    pickupName: options.pickupName ?? "Report Guest",
    beverages: beverageInputs.map((beverage) => toCreateOrderBeverage(menu, beverage))
  });
  const queuedOrder = await submitOrderToQueue(createdOrder.id);
  const claimedOrder = await claimQueuedOrder(queuedOrder.id, staffId);

  if (options.status === "cancelled") {
    const cancelledOrder = await cancelOrder(claimedOrder.id);
    return applyReportOrderTimeline(cancelledOrder.id, options);
  }

  for (const [index, beverage] of claimedOrder.beverages.entries()) {
    const requestedBeverage = beverageInputs[index];

    if (!requestedBeverage) {
      throw new Error("Report fixture beverage inputs no longer match created beverages.");
    }

    if (requestedBeverage.cancel) {
      await cancelOrderBeverage(claimedOrder.id, beverage.id, "Report fixture cancellation");
    } else {
      await completeOrderBeverage(claimedOrder.id, beverage.id);
    }
  }

  const completedOrder = await completeOrder(claimedOrder.id);

  if (options.status === "picked_up") {
    await confirmOrderPickup(completedOrder.id);
  }

  return applyReportOrderTimeline(completedOrder.id, options);
}

async function createReportMenuItemFixture(input: {
  categoryId: string;
  suffix: string;
  key: ReportMenuItemKey;
  name: string;
  price: string;
  displayOrder: number;
}): Promise<ReportMenuItemFixture> {
  const [item] = await db
    .insert(menuItems)
    .values({
      categoryId: input.categoryId,
      name: `${input.name} ${input.suffix}`,
      description: `${input.name} for report tests`,
      price: input.price,
      available: true,
      active: true,
      displayOrder: input.displayOrder
    })
    .returning();

  if (!item) {
    throw new Error(`Unable to create report menu item ${input.key}.`);
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
    throw new Error(`Unable to create report customization group for ${input.key}.`);
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
    throw new Error(`Unable to create report customization choices for ${input.key}.`);
  }

  return {
    categoryId: input.categoryId,
    menuItemId: item.id,
    groupId: group.id,
    wholeMilkChoiceId: wholeMilk.id,
    oatMilkChoiceId: oatMilk.id,
    name: item.name
  };
}

function toCreateOrderBeverage(menu: ReportTestMenuFixture, input: ReportOrderBeverageFixtureInput) {
  const item = menu.items[input.itemKey ?? "latte"];
  const choiceId = input.milk === "oat" ? item.oatMilkChoiceId : item.wholeMilkChoiceId;

  return {
    menuItemId: item.menuItemId,
    quantity: input.quantity ?? 1,
    selectedCustomizations: [
      {
        customizationGroupId: item.groupId,
        customizationChoiceIds: [choiceId]
      }
    ],
    ...(input.specialInstructions ? { specialInstructions: input.specialInstructions } : {})
  };
}

async function applyReportOrderTimeline(
  orderId: string,
  options: ReportOrderFixtureOptions
): Promise<Order> {
  const order = await getOrderById(orderId);

  if (!order) {
    throw new Error("Unable to reload report fixture order.");
  }

  const businessDate = options.businessDate ?? order.businessDate;
  const dailyOrderNumber =
    options.dailyOrderNumber ?? (options.businessDate ? nextGeneratedDailyOrderNumber() : order.dailyOrderNumber);
  const createdAt = dateTimeForBusinessDate(businessDate, 9, 0);
  const queuedAt = dateTimeForBusinessDate(businessDate, 9, 1);
  const inProgressAt = dateTimeForBusinessDate(businessDate, 9, 2);
  const completedAt = dateTimeForBusinessDate(businessDate, 9, 8);
  const pickedUpAt = dateTimeForBusinessDate(businessDate, 9, 12);
  const cancelledAt = dateTimeForBusinessDate(businessDate, 9, 5);

  await db
    .update(orders)
    .set({
      businessDate,
      dailyOrderNumber,
      createdAt,
      queuedAt: order.queuedAt ? queuedAt : null,
      inProgressAt: order.inProgressAt ? inProgressAt : null,
      completedAt: order.completedAt ? completedAt : null,
      pickedUpAt: order.pickedUpAt ? pickedUpAt : null,
      cancelledAt: order.cancelledAt ? cancelledAt : null
    })
    .where(eq(orders.id, orderId));

  for (const beverage of order.beverages) {
    await db
      .update(orderBeverages)
      .set({
        completedAt: beverage.completedAt ? completedAt : null,
        cancelledAt: beverage.cancelledAt ? cancelledAt : null
      })
      .where(eq(orderBeverages.id, beverage.id));
  }

  const updatedOrder = await getOrderById(orderId);

  if (!updatedOrder) {
    throw new Error("Unable to reload dated report fixture order.");
  }

  return updatedOrder;
}

function nextGeneratedDailyOrderNumber(): number {
  generatedDailyOrderNumber += 1;
  return generatedDailyOrderNumber;
}

function dateTimeForBusinessDate(businessDate: string, hour: number, minute: number): Date {
  return new Date(`${businessDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`);
}

function addDays(startDate: string, offsetDays: number): string {
  const [year, month, day] = startDate.split("-").map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid report fixture date ${startDate}.`);
  }

  const date = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return date.toISOString().slice(0, 10);
}
