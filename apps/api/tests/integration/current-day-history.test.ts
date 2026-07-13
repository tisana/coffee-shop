import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { listCurrentDayOrderHistory } from "../../src/domain/orderHistoryService";
import { db } from "../../src/storage/db";
import { orders } from "../../src/storage/schema";
import { createTestMenuFixture, createTestStaff } from "./testFixtures";

async function createSimpleOrder(staffId: string, pickupName: string) {
  const menu = await createTestMenuFixture();

  return createOrderForStaff(staffId, {
    pickupName,
    beverages: [
      {
        menuItemId: menu.menuItemId,
        quantity: 1,
        selectedCustomizations: [
          {
            customizationGroupId: menu.groupId,
            customizationChoiceIds: [menu.oatMilkChoiceId]
          }
        ]
      }
    ]
  });
}

describe("US5 current-day order history", () => {
  it("returns only orders from the current business day", async () => {
    const { staff } = await createTestStaff();
    const currentOrder = await createSimpleOrder(staff.id, "Today Guest");
    const previousOrder = await createSimpleOrder(staff.id, "Yesterday Guest");
    const previousBusinessDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    await db
      .update(orders)
      .set({
        businessDate: previousBusinessDate,
        dailyOrderNumber: previousOrder.dailyOrderNumber + 1_000_000
      })
      .where(eq(orders.id, previousOrder.id));

    const result = await listCurrentDayOrderHistory({});

    expect(result.map((order) => order.id)).toContain(currentOrder.id);
    expect(result.map((order) => order.id)).not.toContain(previousOrder.id);
  });
});
