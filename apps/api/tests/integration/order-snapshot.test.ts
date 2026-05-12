import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createOrderForStaff } from "../../src/domain/orderCreationService";
import { db } from "../../src/storage/db";
import { customizationChoices, menuItems } from "../../src/storage/schema";
import { createTestMenuFixture, createTestStaff } from "./testFixtures";

describe("US1 purchased beverage snapshots", () => {
  it("preserves beverage name, price, selected customization, and instructions after menu edits", async () => {
    const { staff } = await createTestStaff();
    const menu = await createTestMenuFixture();

    const order = await createOrderForStaff(staff.id, {
      pickupName: "Noor",
      beverages: [
        {
          menuItemId: menu.menuItemId,
          quantity: 1,
          selectedCustomizations: [
            {
              customizationGroupId: menu.groupId,
              customizationChoiceIds: [menu.oatMilkChoiceId]
            }
          ],
          specialInstructions: "Less foam"
        }
      ]
    });

    const beverage = order.beverages[0];

    expect(beverage).toMatchObject({
      priceSnapshot: "5.25",
      specialInstructions: "Less foam",
      selectedCustomizationsSnapshot: [
        {
          groupName: "Milk",
          choices: [{ choiceName: "Oat Milk", priceAdjustment: "0.75" }]
        }
      ]
    });

    await db
      .update(menuItems)
      .set({ name: "Renamed Latte", price: "9.00" })
      .where(eq(menuItems.id, menu.menuItemId));
    await db
      .update(customizationChoices)
      .set({ name: "Premium Oat", priceAdjustment: "2.50" })
      .where(eq(customizationChoices.id, menu.oatMilkChoiceId));

    expect(order.beverages[0]).toEqual(beverage);
  });
});
