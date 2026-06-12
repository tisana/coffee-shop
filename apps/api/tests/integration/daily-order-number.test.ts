import { inArray } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { db } from "../../src/storage/db";
import { dailyOrderSequences, orders } from "../../src/storage/schema";
import { createTestMenuFixture, createTestStaff } from "./testFixtures";

describe("US1 daily order numbers", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.SHOP_TIME_ZONE;
  });

  function orderInput(menu: Awaited<ReturnType<typeof createTestMenuFixture>>) {
    return {
      beverages: [
        {
          menuItemId: menu.menuItemId,
          quantity: 1,
          selectedCustomizations: [
            {
              customizationGroupId: menu.groupId,
              customizationChoiceIds: [menu.wholeMilkChoiceId]
            }
          ]
        }
      ]
    };
  }

  it("issues unique daily order numbers during concurrent order creation", async () => {
    const { staff } = await createTestStaff();
    const menu = await createTestMenuFixture();

    const orders = await Promise.all(
      Array.from({ length: 5 }, () =>
        createOrderForStaff(staff.id, orderInput(menu))
      )
    );

    const dailyNumbers = orders.map((order) => order.dailyOrderNumber);

    expect(new Set(dailyNumbers)).toHaveProperty("size", dailyNumbers.length);
    expect(dailyNumbers.every((dailyNumber) => dailyNumber > 0)).toBe(true);
    expect(new Set(orders.map((order) => order.businessDate))).toHaveProperty("size", 1);
  });

  it("resets daily order numbers using the configured shop timezone", async () => {
    process.env.SHOP_TIME_ZONE = "America/New_York";
    vi.useFakeTimers();
    const businessDates = ["2036-05-29", "2036-05-30"];
    await db.delete(orders).where(inArray(orders.businessDate, businessDates));
    await db
      .delete(dailyOrderSequences)
      .where(inArray(dailyOrderSequences.businessDate, businessDates));
    const { staff } = await createTestStaff();
    const menu = await createTestMenuFixture();

    vi.setSystemTime(new Date("2036-05-30T03:59:00.000Z"));
    const previousBusinessDayOrder = await createOrderForStaff(staff.id, orderInput(menu));

    vi.setSystemTime(new Date("2036-05-30T04:01:00.000Z"));
    const nextBusinessDayOrder = await createOrderForStaff(staff.id, orderInput(menu));

    expect(previousBusinessDayOrder.businessDate).toBe("2036-05-29");
    expect(nextBusinessDayOrder.businessDate).toBe("2036-05-30");
    expect(previousBusinessDayOrder.dailyOrderNumber).toBe(1);
    expect(nextBusinessDayOrder.dailyOrderNumber).toBe(1);
  });
});
