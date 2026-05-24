import { expect, test } from "@playwright/test";

test("staff maintains menu availability and customization choices", async ({ page }) => {
  let sessionActive = false;
  const categoryId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const icedCategoryId = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
  const menuItemId = "2d20d6c7-337e-4216-a900-b7dcdf4fc2eb";
  const createdMenuItemId = "b49c2d6c-35dc-49ad-b936-f946253ae8ec";
  const groupId = "8a7ea15d-9d7f-4d95-859d-5eb0c5a40f4f";
  const wholeMilkChoiceId = "91e6d2ab-5519-4a2d-b5f7-c8cf38b5a1f0";
  const oatMilkChoiceId = "cf760bd9-3a50-41ef-bf0e-713d52ea8569";
  const syrupGroupId = "ee4b6033-a4c2-4e4c-b717-3ad3dcfc44a2";
  const vanillaChoiceId = "fa3e1f47-ae42-4fd4-8765-069f6d926033";
  let deleteRequests = 0;
  let savedMenuItem = {
    id: menuItemId,
    categoryId,
    name: "Latte",
    description: "Espresso with steamed milk",
    imageUrl: "https://cdn.example.test/menu/latte.jpg",
    price: "4.50",
    available: true,
    active: true,
    displayOrder: 1,
    customizationGroups: [
      {
        id: groupId,
        menuItemId,
        name: "Milk",
        required: true,
        minSelections: 1,
        maxSelections: 1,
        displayOrder: 1,
        active: true,
        choices: [
          {
            id: wholeMilkChoiceId,
            customizationGroupId: groupId,
            name: "Whole Milk",
            priceAdjustment: "0.00",
            available: true,
            displayOrder: 1,
            active: true
          },
          {
            id: oatMilkChoiceId,
            customizationGroupId: groupId,
            name: "Oat Milk",
            priceAdjustment: "0.75",
            available: true,
            displayOrder: 2,
            active: true
          }
        ]
      }
    ]
  };
  let hotMenuItems = [savedMenuItem];
  let icedMenuItems: typeof hotMenuItems = [];

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");

    if (path === "/staff/session") {
      if (!sessionActive) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ code: "UNAUTHORIZED", message: "Staff authorization required." })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "5e2a85b5-30e5-4b37-9b7c-122229476d62",
          username: "barista",
          displayName: "Demo Barista",
          authorizationStatus: "authorized"
        })
      });
      return;
    }

    if (path === "/auth/login") {
      sessionActive = true;
      await route.fulfill({ status: 204 });
      return;
    }

    if (path === "/menu/categories" && route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          categories: [
            {
              id: categoryId,
              name: "Hot Coffee",
              displayOrder: 1,
              active: true,
              menuItems: hotMenuItems
            },
            {
              id: icedCategoryId,
              name: "Iced Coffee",
              displayOrder: 2,
              active: true,
              menuItems: icedMenuItems
            }
          ]
        })
      });
      return;
    }

    if (path === "/menu/items" && route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        categoryId: icedCategoryId,
        name: "Seasonal Mocha",
        imageUrl: "https://cdn.example.test/menu/seasonal-mocha.jpg",
        price: "6.25",
        available: true,
        active: true
      });
      expect(body.customizationGroups).toHaveLength(1);
      expect(body.customizationGroups[0]).toMatchObject({
        name: "Milk",
        required: true,
        minSelections: 1,
        maxSelections: 1
      });
      expect(body.customizationGroups[0].choices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Whole Milk", priceAdjustment: "0.00" }),
          expect.objectContaining({ name: "Oat Milk", priceAdjustment: "0.75" })
        ])
      );
      expect(body.customizationGroups[0].id).toBeUndefined();
      expect(body.customizationGroups[0].choices[0].id).toBeUndefined();

      const createdItem = {
        id: createdMenuItemId,
        categoryId: icedCategoryId,
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        price: body.price,
        available: body.available,
        active: body.active,
        displayOrder: 2,
        customizationGroups: [
          {
            id: syrupGroupId,
            menuItemId: createdMenuItemId,
            name: body.customizationGroups[0].name,
            required: body.customizationGroups[0].required,
            minSelections: body.customizationGroups[0].minSelections,
            maxSelections: body.customizationGroups[0].maxSelections,
            displayOrder: body.customizationGroups[0].displayOrder,
            active: body.customizationGroups[0].active,
            choices: [
              {
                id: vanillaChoiceId,
                customizationGroupId: syrupGroupId,
                name: body.customizationGroups[0].choices[0].name,
                priceAdjustment: body.customizationGroups[0].choices[0].priceAdjustment,
                available: body.customizationGroups[0].choices[0].available,
                displayOrder: body.customizationGroups[0].choices[0].displayOrder,
                active: body.customizationGroups[0].choices[0].active
              }
            ]
          }
        ]
      };

      icedMenuItems = [...icedMenuItems, createdItem];

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(createdItem)
      });
      return;
    }

    if (path === `/menu/items/${menuItemId}` && route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        categoryId,
        name: "Latte",
        available: false,
        active: true
      });
      expect(body.customizationGroups[0].choices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: oatMilkChoiceId, available: false })
        ])
      );

      savedMenuItem = {
        ...savedMenuItem,
        ...body,
        customizationGroups: [
          {
            ...savedMenuItem.customizationGroups[0],
            ...body.customizationGroups[0],
            choices: body.customizationGroups[0].choices
          }
        ]
      };
      hotMenuItems = hotMenuItems.map((item) => (item.id === menuItemId ? savedMenuItem : item));

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(savedMenuItem)
      });
      return;
    }

    if (path === `/menu/items/${createdMenuItemId}` && route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        categoryId: icedCategoryId,
        name: "Seasonal Mocha",
        imageUrl: "https://cdn.example.test/menu/seasonal-mocha.jpg",
        available: false,
        active: false
      });

      const updatedItem = {
        ...icedMenuItems.find((item) => item.id === createdMenuItemId),
        ...body,
        customizationGroups: body.customizationGroups
      };
      icedMenuItems = icedMenuItems.map((item) =>
        item.id === createdMenuItemId ? updatedItem : item
      );

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(updatedItem)
      });
      return;
    }

    if (path === `/menu/items/${createdMenuItemId}` && route.request().method() === "DELETE") {
      deleteRequests += 1;
      icedMenuItems = icedMenuItems.filter((item) => item.id !== createdMenuItemId);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: createdMenuItemId,
          categoryId: icedCategoryId,
          name: "Seasonal Mocha",
          description: "Dark chocolate and espresso",
          imageUrl: "https://cdn.example.test/menu/seasonal-mocha.jpg",
          price: "6.25",
          available: false,
          active: false,
          displayOrder: 2,
          customizationGroups: []
        })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", message: `Unhandled test route ${path}` })
    });
  });

  await page.goto("/#menu");
  await page.getByRole("button", { name: "Sign in" }).click();

  const startedAt = Date.now();
  await expect(page.getByRole("heading", { name: "Menu maintenance" })).toBeVisible();
  await page.getByRole("button", { name: "Edit Latte" }).click();
  await page.getByLabel("Available for new orders").uncheck();
  await page.getByLabel("Oat Milk available").uncheck();
  await page.getByRole("button", { name: "Save menu item" }).click();

  await expect(page.getByText("Latte saved. Future counter orders will use the updated menu.")).toBeVisible();
  await expect(page.getByLabel("Latte editor").getByText("Unavailable")).toBeVisible();
  await expect(page.getByLabel("Available for new orders")).not.toBeChecked();

  await page.getByRole("button", { name: "Add menu item" }).click();
  await page.getByLabel("Category").selectOption(icedCategoryId);
  await expect(page.getByRole("button", { name: "Edit New menu item Draft" })).toBeVisible();
  await page.getByLabel("Item name").fill("Seasonal Mocha");
  await page.getByLabel("Price").fill("6.25");
  await page.getByLabel("Description").fill("Dark chocolate and espresso");
  await page.getByLabel("Image URL").fill("https://cdn.example.test/menu/seasonal-mocha.jpg");
  await page.getByLabel("Customization template").selectOption("template:2d20d6c7-337e-4216-a900-b7dcdf4fc2eb");
  await expect(page.getByLabel("Group name")).toHaveValue("Milk");
  await expect(page.getByLabel("Choice name").first()).toHaveValue("Whole Milk");
  await page.getByRole("button", { name: "Create menu item" }).click();

  await expect(page.getByText("Seasonal Mocha added to the menu.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Iced Coffee" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Seasonal Mocha Available" })).toBeVisible();

  await expect(page.getByRole("button", { name: "Delete menu item" })).toBeDisabled();
  await page.getByLabel("Available for new orders").uncheck();
  await page.getByLabel("Active on staff menu").uncheck();
  await page.getByRole("button", { name: "Save menu item" }).click();
  await expect(page.getByText("Seasonal Mocha saved. Future counter orders will use the updated menu.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete menu item" })).toBeEnabled();

  await page.getByRole("button", { name: "Delete menu item" }).click();
  await expect(page.getByRole("dialog", { name: "Delete Seasonal Mocha" })).toBeVisible();
  expect(deleteRequests).toBe(0);
  await page.getByRole("button", { name: "Cancel delete" }).click();
  await expect(page.getByRole("dialog", { name: "Delete Seasonal Mocha" })).toHaveCount(0);

  await page.getByRole("button", { name: "Delete menu item" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByText("Seasonal Mocha removed from future menus.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Seasonal Mocha Available" })).toHaveCount(0);
  expect(deleteRequests).toBe(1);
  expect(Date.now() - startedAt).toBeLessThan(20_000);
});
