import { describe, expect, it } from "vitest";

import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { createTestMenuFixture, createTestStaff } from "./testFixtures";

describe("US1 daily order numbers", () => {
  it("issues unique daily order numbers during concurrent order creation", async () => {
    const { staff } = await createTestStaff();
    const menu = await createTestMenuFixture();

    const orders = await Promise.all(
      Array.from({ length: 5 }, () =>
        createOrderForStaff(staff.id, {
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
        })
      )
    );

    const dailyNumbers = orders.map((order) => order.dailyOrderNumber);

    expect(new Set(dailyNumbers)).toHaveProperty("size", dailyNumbers.length);
    expect(dailyNumbers.every((dailyNumber) => dailyNumber > 0)).toBe(true);
    expect(new Set(orders.map((order) => order.businessDate))).toHaveProperty("size", 1);
  });
});
