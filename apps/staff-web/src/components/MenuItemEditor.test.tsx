import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MenuCategory, MenuItem } from "@coffee-shop/shared/domain/types";

import { MenuItemEditor, type CustomizationTemplate } from "./MenuItemEditor";

const categories: MenuCategory[] = [
  {
    id: "coffee",
    name: "Coffee",
    displayOrder: 1,
    active: true,
    menuItems: [],
  },
  { id: "tea", name: "Tea", displayOrder: 2, active: true, menuItems: [] },
];

const item: MenuItem = {
  id: "latte",
  categoryId: "coffee",
  name: "Latte",
  description: "Espresso and milk",
  imageUrl: "https://images.example.test/latte.png",
  price: "4.50",
  available: true,
  active: true,
  displayOrder: 1,
  customizationGroups: [
    {
      id: "milk",
      menuItemId: "latte",
      name: "Milk",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      displayOrder: 1,
      active: true,
      choices: [
        {
          id: "oat",
          customizationGroupId: "milk",
          name: "Oat milk",
          priceAdjustment: "0.50",
          available: true,
          displayOrder: 1,
          active: true,
        },
      ],
    },
  ],
};

const template: CustomizationTemplate = {
  id: "template:syrups",
  label: "Syrups",
  groups: [
    {
      name: "Syrup",
      required: false,
      minSelections: 0,
      maxSelections: 2,
      displayOrder: 1,
      active: true,
      choices: [
        {
          name: "Vanilla",
          priceAdjustment: "0.50",
          available: true,
          displayOrder: 1,
          active: true,
        },
      ],
    },
  ],
};

describe("MenuItemEditor", () => {
  it("initializes an existing item with its fields and image preview", () => {
    render(
      <MenuItemEditor
        item={item}
        categories={categories}
        customizationTemplates={[]}
        saving={false}
        onSave={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Latte editor" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toHaveValue("coffee");
    expect(screen.getByLabelText("Item name")).toHaveValue("Latte");
    expect(screen.getAllByLabelText("Price")[0]).toHaveValue("4.50");
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Espresso and milk",
    );
    expect(screen.getByLabelText("Image URL")).toHaveValue(
      "https://images.example.test/latte.png",
    );
    expect(screen.getByLabelText("Menu image preview")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Milk" })).toBeInTheDocument();
  });

  it("emits edited fields, selected category, and copied template groups when saved", () => {
    const onSave = vi.fn();
    const onCategoryChange = vi.fn();
    render(
      <MenuItemEditor
        item={item}
        categories={categories}
        customizationTemplates={[template]}
        saving={false}
        onSave={onSave}
        onCategoryChange={onCategoryChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "tea" },
    });
    fireEvent.change(screen.getByLabelText("Item name"), {
      target: { value: "Iced latte" },
    });
    fireEvent.change(screen.getAllByLabelText("Price")[0]!, {
      target: { value: "5.25" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText("Image URL"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.click(screen.getByLabelText("Available for new orders"));
    fireEvent.click(screen.getByLabelText("Active on staff menu"));
    fireEvent.change(screen.getByLabelText("Customization template"), {
      target: { value: "template:syrups" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save menu item" }));

    expect(onCategoryChange).toHaveBeenCalledWith("tea");
    expect(onSave).toHaveBeenCalledWith("latte", {
      categoryId: "tea",
      name: "Iced latte",
      description: null,
      imageUrl: "javascript:alert(1)",
      price: "5.25",
      available: false,
      active: false,
      customizationGroups: template.groups,
    });
    expect(
      screen.queryByLabelText("Menu image preview"),
    ).not.toBeInTheDocument();
  });

  it("resets fields when the selected item changes and labels a new item as create", () => {
    const { rerender } = render(
      <MenuItemEditor
        item={item}
        categories={categories}
        customizationTemplates={[]}
        saving={false}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Item name"), {
      target: { value: "Changed" },
    });

    const newItem: MenuItem = {
      ...item,
      id: "new-item",
      categoryId: "tea",
      name: "",
      description: null,
      imageUrl: null,
      price: "0.00",
      customizationGroups: [],
    };
    rerender(
      <MenuItemEditor
        item={newItem}
        categories={categories}
        customizationTemplates={[]}
        isNew
        saving={false}
        onSave={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "New menu item editor" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toHaveValue("tea");
    expect(screen.getByLabelText("Item name")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Create menu item" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Delete menu item" }),
    ).not.toBeInTheDocument();
  });

  it("requires an unavailable inactive saved item before confirming deletion", () => {
    const onDelete = vi.fn();
    const { rerender } = render(
      <MenuItemEditor
        item={item}
        categories={categories}
        customizationTemplates={[]}
        saving={false}
        onSave={vi.fn()}
        onDelete={onDelete}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Delete menu item" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Turn off order availability and staff-menu visibility, then save before deleting.",
      ),
    ).toBeInTheDocument();

    rerender(
      <MenuItemEditor
        item={{ ...item, available: false, active: false }}
        categories={categories}
        customizationTemplates={[]}
        saving={false}
        onSave={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete menu item" }));
    expect(
      screen.getByRole("dialog", { name: "Delete Latte" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel delete" }));
    expect(
      screen.queryByRole("dialog", { name: "Delete Latte" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete menu item" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onDelete).toHaveBeenCalledWith("latte");
  });

  it("disables save and deletion controls while saving or deleting", () => {
    const { rerender } = render(
      <MenuItemEditor
        item={{ ...item, available: false, active: false }}
        categories={categories}
        customizationTemplates={[]}
        saving
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Saving" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Delete menu item" }),
    ).toBeDisabled();

    rerender(
      <MenuItemEditor
        item={{ ...item, available: false, active: false }}
        categories={categories}
        customizationTemplates={[]}
        saving={false}
        deleting
        onSave={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Save menu item" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deleting" })).toBeDisabled();
  });
});
