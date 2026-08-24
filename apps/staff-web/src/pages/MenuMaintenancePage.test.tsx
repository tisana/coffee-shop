import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MenuItemInput } from "@coffee-shop/shared/contracts/api";
import type { MenuCategory, MenuItem } from "@coffee-shop/shared/domain/types";

import { ApiClientError } from "../services/apiClient";
import {
  createMenuItem,
  deleteMenuItem,
  getMenuMaintenanceCatalog,
  updateMenuItem,
} from "../services/menuApi";
import { MenuMaintenancePage } from "./MenuMaintenancePage";

vi.mock("../services/menuApi", () => ({
  createMenuItem: vi.fn(),
  deleteMenuItem: vi.fn(),
  getMenuMaintenanceCatalog: vi.fn(),
  updateMenuItem: vi.fn(),
}));

const CUSTOMIZATION_TEMPLATES_STORAGE_KEY =
  "coffee-shop.customizationTemplates.v1";

const latte: MenuItem = {
  id: "latte",
  categoryId: "coffee",
  name: "Latte",
  description: "Espresso with milk.",
  imageUrl: null,
  price: "4.50",
  available: true,
  active: true,
  displayOrder: 1,
  customizationGroups: [],
};

const americano: MenuItem = {
  id: "americano",
  categoryId: "coffee",
  name: "Americano",
  description: "Espresso and hot water.",
  imageUrl: null,
  price: "3.75",
  available: true,
  active: true,
  displayOrder: 2,
  customizationGroups: [],
};

const retiredMocha: MenuItem = {
  id: "retired-mocha",
  categoryId: "coffee",
  name: "Retired mocha",
  description: null,
  imageUrl: null,
  price: "5.00",
  available: false,
  active: false,
  displayOrder: 2,
  customizationGroups: [],
};

function catalog(menuItems: MenuItem[] = [latte]): MenuCategory[] {
  return [
    {
      id: "coffee",
      name: "Coffee",
      displayOrder: 1,
      active: true,
      menuItems,
    },
    {
      id: "tea",
      name: "Tea",
      displayOrder: 2,
      active: true,
      menuItems: [],
    },
  ];
}

async function renderLoadedPage(menuItems: MenuItem[] = [latte]) {
  vi.mocked(getMenuMaintenanceCatalog).mockResolvedValue({
    categories: catalog(menuItems),
  });
  render(<MenuMaintenancePage />);

  await screen.findByRole("button", { name: "Menu items" });
}

function menuItemInput(overrides: Partial<MenuItemInput> = {}): MenuItemInput {
  return {
    categoryId: "coffee",
    name: "Latte deluxe",
    description: "A richer latte.",
    imageUrl: "https://images.example.test/latte-deluxe.png",
    price: "5.25",
    available: false,
    active: true,
    customizationGroups: [],
    ...overrides,
  };
}

describe("MenuMaintenancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading, populated, empty, and rejected menu states", async () => {
    let resolveCatalog!: (value: { categories: MenuCategory[] }) => void;
    vi.mocked(getMenuMaintenanceCatalog).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCatalog = resolve;
        }),
    );

    const { unmount } = render(<MenuMaintenancePage />);
    expect(screen.getByText("Loading menu.")).toBeInTheDocument();

    resolveCatalog({ categories: catalog() });
    expect(
      await screen.findByRole("button", { name: /Edit Latte/ }),
    ).toBeInTheDocument();

    unmount();
    vi.mocked(getMenuMaintenanceCatalog).mockResolvedValueOnce({
      categories: [],
    });
    render(<MenuMaintenancePage />);
    expect(await screen.findByText("No menu items found.")).toBeInTheDocument();

    cleanup();
    vi.mocked(getMenuMaintenanceCatalog).mockRejectedValueOnce(
      new ApiClientError(503, "Menu catalog is unavailable."),
    );
    render(<MenuMaintenancePage />);
    expect(
      await screen.findByText("Menu catalog is unavailable."),
    ).toBeInTheDocument();
  });

  it("selects another item, edits it, and sends the exact update payload", async () => {
    const input = menuItemInput();
    const updatedItem: MenuItem = {
      ...americano,
      categoryId: input.categoryId ?? americano.categoryId,
      name: input.name ?? americano.name,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      price: input.price ?? americano.price,
      available: input.available ?? americano.available,
      active: input.active ?? americano.active,
      customizationGroups: [],
    };
    vi.mocked(updateMenuItem).mockResolvedValue(updatedItem);
    await renderLoadedPage([latte, americano]);

    expect(
      screen.getByRole("region", { name: "Latte editor" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Edit Americano/ }));
    const editor = screen.getByRole("region", { name: "Americano editor" });
    fireEvent.change(within(editor).getByLabelText("Item name"), {
      target: { value: input.name },
    });
    fireEvent.change(within(editor).getByLabelText("Description"), {
      target: { value: input.description! },
    });
    fireEvent.change(within(editor).getByLabelText("Image URL"), {
      target: { value: input.imageUrl! },
    });
    fireEvent.change(within(editor).getByLabelText("Price"), {
      target: { value: input.price },
    });
    fireEvent.click(within(editor).getByLabelText("Available for new orders"));
    fireEvent.click(
      within(editor).getByRole("button", { name: "Save menu item" }),
    );

    await waitFor(() => {
      expect(updateMenuItem).toHaveBeenCalledWith("americano", input);
    });
    expect(
      await screen.findByText(
        "Latte deluxe saved. Future counter orders will use the updated menu.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Latte deluxe editor" }),
    ).toBeInTheDocument();
  });

  it("creates a new item in the draft's selected category", async () => {
    const input = menuItemInput({
      categoryId: "tea",
      name: "Iced tea",
      description: null,
      imageUrl: null,
      price: "3.50",
      available: true,
      active: true,
    });
    const createdItem: MenuItem = {
      ...latte,
      id: "iced-tea",
      categoryId: input.categoryId ?? "tea",
      name: input.name ?? "Iced tea",
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      price: input.price ?? "3.50",
      available: input.available ?? true,
      active: input.active ?? true,
      displayOrder: 1,
      customizationGroups: [],
    };
    vi.mocked(createMenuItem).mockResolvedValue(createdItem);
    await renderLoadedPage();

    fireEvent.click(screen.getByRole("button", { name: "Add menu item" }));
    const editor = screen.getByRole("region", { name: "New menu item editor" });
    fireEvent.change(within(editor).getByLabelText("Category"), {
      target: { value: "tea" },
    });
    fireEvent.change(within(editor).getByLabelText("Item name"), {
      target: { value: input.name },
    });
    fireEvent.change(within(editor).getByLabelText("Price"), {
      target: { value: input.price },
    });
    fireEvent.click(
      within(editor).getByRole("button", { name: "Create menu item" }),
    );

    await waitFor(() => {
      expect(createMenuItem).toHaveBeenCalledWith(input);
    });
    expect(
      await screen.findByText("Iced tea added to the menu."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Edit Iced tea/ }),
    ).toBeInTheDocument();
  });

  it("shows the category-required error instead of creating a draft when the catalog is empty", async () => {
    vi.mocked(getMenuMaintenanceCatalog).mockResolvedValue({ categories: [] });
    render(<MenuMaintenancePage />);
    await screen.findByText("No menu items found.");

    fireEvent.click(screen.getByRole("button", { name: "Add menu item" }));

    expect(
      screen.getByText("Create a menu category before adding menu items."),
    ).toBeInTheDocument();
    expect(createMenuItem).not.toHaveBeenCalled();
  });

  it("deletes an eligible item only after the real editor confirmation", async () => {
    vi.mocked(deleteMenuItem).mockResolvedValue(retiredMocha);
    await renderLoadedPage([retiredMocha]);

    const editor = screen.getByRole("region", { name: "Retired mocha editor" });
    fireEvent.click(
      within(editor).getByRole("button", { name: "Delete menu item" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Delete Retired mocha" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel delete" }));
    expect(deleteMenuItem).not.toHaveBeenCalled();

    fireEvent.click(
      within(editor).getByRole("button", { name: "Delete menu item" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(deleteMenuItem).toHaveBeenCalledWith("retired-mocha");
    });
    expect(
      await screen.findByText("Retired mocha removed from future menus."),
    ).toBeInTheDocument();
    expect(screen.getByText("No menu items found.")).toBeInTheDocument();
  });

  it("switches between menu items and the persisted customization-template state", async () => {
    window.localStorage.setItem(
      CUSTOMIZATION_TEMPLATES_STORAGE_KEY,
      JSON.stringify([
        {
          id: "stored-milk",
          label: "Stored milk",
          groups: [
            {
              name: "Milk",
              required: true,
              minSelections: 1,
              maxSelections: 1,
              displayOrder: 1,
              active: true,
              choices: [
                {
                  name: "Oat milk",
                  priceAdjustment: "0.50",
                  available: true,
                  displayOrder: 1,
                  active: true,
                },
              ],
            },
          ],
        },
      ]),
    );
    await renderLoadedPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Customization templates" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Customization templates" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Edit Stored milk/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Stored milk template editor" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Menu items" }));
    expect(
      await screen.findByRole("button", { name: /Edit Latte/ }),
    ).toBeInTheDocument();
  });
});
