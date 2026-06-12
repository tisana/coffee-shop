import { describe, expect, it } from "vitest";

import { createLoggedInAgent, createTestMenuFixture } from "./testFixtures";

describe("US4 menu maintenance contract", () => {
  it("creates and updates menu items with customization groups", async () => {
    const { agent } = await createLoggedInAgent();
    const existingMenu = await createTestMenuFixture();

    const createResponse = await agent.post("/menu/items").send({
      categoryId: existingMenu.categoryId,
      name: "Honey Lavender Latte",
      description: "Espresso, steamed milk, honey, and lavender",
      imageUrl: "https://cdn.example.test/menu/honey-lavender-latte.jpg",
      price: "5.75",
      available: true,
      active: true,
      customizationGroups: [
        {
          name: "Milk",
          required: true,
          minSelections: 1,
          maxSelections: 1,
          displayOrder: 1,
          active: true,
          choices: [
            {
              name: "Whole Milk",
              priceAdjustment: "0.00",
              available: true,
              displayOrder: 1,
              active: true
            },
            {
              name: "Oat Milk",
              priceAdjustment: "0.75",
              available: true,
              displayOrder: 2,
              active: true
            }
          ]
        }
      ]
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      categoryId: existingMenu.categoryId,
      name: "Honey Lavender Latte",
      price: "5.75",
      imageUrl: "https://cdn.example.test/menu/honey-lavender-latte.jpg",
      available: true,
      active: true
    });
    expect(createResponse.body.customizationGroups).toHaveLength(1);
    expect(createResponse.body.customizationGroups[0]).toMatchObject({
      name: "Milk",
      required: true,
      minSelections: 1,
      maxSelections: 1
    });
    expect(createResponse.body.customizationGroups[0].choices).toHaveLength(2);

    const group = createResponse.body.customizationGroups[0];
    const oatMilk = group.choices.find((choice: { name: string }) => choice.name === "Oat Milk");

    const updateResponse = await agent.patch(`/menu/items/${createResponse.body.id}`).send({
      categoryId: existingMenu.categoryId,
      name: "Lavender Latte",
      description: "Seasonal espresso and lavender",
      imageUrl: "https://cdn.example.test/menu/lavender-latte.jpg",
      price: "5.95",
      available: false,
      active: true,
      customizationGroups: [
        {
          id: group.id,
          name: "Milk options",
          required: true,
          minSelections: 1,
          maxSelections: 1,
          displayOrder: 1,
          active: true,
          choices: [
            {
              id: oatMilk.id,
              name: "Oat Milk",
              priceAdjustment: "0.50",
              available: false,
              displayOrder: 1,
              active: true
            },
            {
              name: "Almond Milk",
              priceAdjustment: "0.80",
              available: true,
              displayOrder: 2,
              active: true
            }
          ]
        }
      ]
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: createResponse.body.id,
      name: "Lavender Latte",
      description: "Seasonal espresso and lavender",
      imageUrl: "https://cdn.example.test/menu/lavender-latte.jpg",
      price: "5.95",
      available: false,
      active: true
    });
    expect(updateResponse.body.customizationGroups[0]).toMatchObject({
      id: group.id,
      name: "Milk options"
    });
    expect(updateResponse.body.customizationGroups[0].choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: oatMilk.id, name: "Oat Milk", priceAdjustment: "0.50", available: false }),
        expect.objectContaining({ name: "Almond Milk", priceAdjustment: "0.80", available: true })
      ])
    );
  });

  it("returns useful save errors for invalid input and missing items", async () => {
    const { agent } = await createLoggedInAgent();
    const existingMenu = await createTestMenuFixture();

    const invalidResponse = await agent.post("/menu/items").send({
      categoryId: existingMenu.categoryId,
      name: "Broken menu item",
      price: "4.00",
      customizationGroups: [
        {
          name: "Syrup",
          required: false,
          minSelections: 1,
          maxSelections: 1
        }
      ]
    });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body).toMatchObject({
      code: "BAD_REQUEST",
      message: "Request validation failed."
    });

    const missingResponse = await agent.patch("/menu/items/2f739a95-80cd-431a-8a0d-350e18d43601").send({
      categoryId: existingMenu.categoryId,
      name: "Missing",
      price: "4.00"
    });

    expect(missingResponse.status).toBe(404);
    expect(missingResponse.body).toMatchObject({
      code: "NOT_FOUND",
      message: "Menu item not found."
    });
  });

  it("requires a menu item to be unavailable and inactive before retirement", async () => {
    const { agent } = await createLoggedInAgent();
    const existingMenu = await createTestMenuFixture();

    const activeDeleteResponse = await agent.delete(`/menu/items/${existingMenu.menuItemId}`).send();

    expect(activeDeleteResponse.status).toBe(409);
    expect(activeDeleteResponse.body).toMatchObject({
      code: "CONFLICT",
      message: "Menu item must be unavailable and inactive before it can be deleted."
    });

    const disableResponse = await agent.patch(`/menu/items/${existingMenu.menuItemId}`).send({
      categoryId: existingMenu.categoryId,
      name: "Retired Latte",
      description: "No longer offered",
      price: "4.50",
      available: false,
      active: false,
      customizationGroups: []
    });

    expect(disableResponse.status).toBe(200);

    const deleteResponse = await agent.delete(`/menu/items/${existingMenu.menuItemId}`).send();

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toMatchObject({
      id: existingMenu.menuItemId,
      active: false,
      available: false
    });

    const menuResponse = await agent.get("/menu/categories");

    expect(menuResponse.status).toBe(200);
    const visibleItemIds = menuResponse.body.categories.flatMap(
      (category: { menuItems: Array<{ id: string }> }) =>
        category.menuItems.map((item) => item.id)
    );
    expect(visibleItemIds).not.toContain(existingMenu.menuItemId);
  });
});
