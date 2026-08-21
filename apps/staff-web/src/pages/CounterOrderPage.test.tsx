import "@testing-library/jest-dom/vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  MenuCategory,
  OrderWithLoyalty,
} from "@coffee-shop/shared/domain/types";

import { ApiClientError } from "../services/apiClient";
import {
  createCounterOrder,
  getOrderTakingMenu,
  submitOrderToQueue,
} from "../services/ordersApi";
import {
  createLoyaltyCustomer,
  getLoyaltyEarningRule,
  getLoyaltyPhoneRegion,
  getLoyaltyPoints,
  getLoyaltyRewards,
  searchLoyaltyCustomers,
} from "../services/loyaltyApi";
import { CounterOrderPage } from "./CounterOrderPage";

vi.mock("../services/ordersApi", () => ({
  createCounterOrder: vi.fn(),
  getOrderTakingMenu: vi.fn(),
  submitOrderToQueue: vi.fn(),
}));

vi.mock("../services/loyaltyApi", () => ({
  createLoyaltyCustomer: vi.fn(),
  getLoyaltyEarningRule: vi.fn(),
  getLoyaltyPhoneRegion: vi.fn(),
  getLoyaltyPoints: vi.fn(),
  getLoyaltyRewards: vi.fn(),
  searchLoyaltyCustomers: vi.fn(),
}));

const categories: MenuCategory[] = [
  {
    id: "coffee",
    name: "Coffee",
    displayOrder: 1,
    active: true,
    menuItems: [
      {
        id: "latte",
        categoryId: "coffee",
        name: "Latte",
        description: "Espresso with milk.",
        imageUrl: null,
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
                id: "whole",
                customizationGroupId: "milk",
                name: "Whole milk",
                priceAdjustment: "0.00",
                available: true,
                active: true,
                displayOrder: 1,
              },
              {
                id: "oat",
                customizationGroupId: "milk",
                name: "Oat milk",
                priceAdjustment: "0.50",
                available: true,
                active: true,
                displayOrder: 2,
              },
            ],
          },
        ],
      },
      {
        id: "sold-out",
        categoryId: "coffee",
        name: "Sold out mocha",
        description: null,
        imageUrl: null,
        price: "5.00",
        available: false,
        active: true,
        displayOrder: 2,
        customizationGroups: [],
      },
    ],
  },
  {
    id: "tea",
    name: "Tea",
    displayOrder: 2,
    active: true,
    menuItems: [
      {
        id: "chai",
        categoryId: "tea",
        name: "Chai",
        description: "Spiced tea.",
        imageUrl: null,
        price: "3.25",
        available: true,
        active: true,
        displayOrder: 1,
        customizationGroups: [],
      },
    ],
  },
];

const customer = {
  id: "0a1b2c3d-4e5f-4000-8000-000000000001",
  name: "Ari Srisuk",
  phone: "081-234-5678",
  email: null,
  enrolledAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z",
};

function order(status: OrderWithLoyalty["status"]): OrderWithLoyalty {
  return {
    id: "order-1",
    businessDate: "2026-08-21",
    dailyOrderNumber: 42,
    pickupName: "Mai",
    status,
    createdByStaffId: "staff-1",
    assignedBaristaId: null,
    total: "10.00",
    createdAt: "2026-08-21T09:00:00.000Z",
    queuedAt: status === "queued" ? "2026-08-21T09:01:00.000Z" : null,
    inProgressAt: null,
    completedAt: null,
    pickedUpAt: null,
    cancelledAt: null,
    beverages: [],
    loyaltyRewardDiscountTotal: "0.00",
    payableTotal: "10.00",
    loyalty: null,
  };
}

async function renderLoadedPage() {
  render(<CounterOrderPage />);
  await screen.findByText("Sold out mocha");
}

async function addLatte(quantity = 1) {
  const page = screen.getByRole("region", { name: "Counter order" });
  const editor = within(page).getByTestId("beverage-editor");
  for (let index = 1; index < quantity; index += 1) {
    fireEvent.click(
      within(editor).getByRole("button", { name: "Increase quantity" }),
    );
  }
  fireEvent.click(within(editor).getByRole("radio", { name: /Oat milk/ }));
  fireEvent.change(within(editor).getByLabelText("Special instructions"), {
    target: { value: "Less foam" },
  });
  fireEvent.click(
    within(editor).getByRole("button", { name: "Customize & add" }),
  );
}

describe("CounterOrderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.mocked(getOrderTakingMenu).mockResolvedValue({ categories });
    vi.mocked(getLoyaltyPhoneRegion).mockResolvedValue({ region: "TH" });
    vi.mocked(getLoyaltyRewards).mockResolvedValue([]);
    vi.mocked(getLoyaltyEarningRule).mockResolvedValue(null);
    vi.mocked(searchLoyaltyCustomers).mockResolvedValue([]);
    vi.mocked(createLoyaltyCustomer).mockResolvedValue(customer);
  });

  it("shows loading, menu failure, and an empty menu state", async () => {
    let resolveMenu!: (value: { categories: MenuCategory[] }) => void;
    vi.mocked(getOrderTakingMenu).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMenu = resolve;
        }),
    );
    const { unmount } = render(<CounterOrderPage />);

    expect(screen.getByText("Loading menu.")).toBeInTheDocument();
    resolveMenu({ categories: [] });
    await waitFor(() =>
      expect(screen.queryByText("Loading menu.")).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId("beverage-editor")).not.toBeInTheDocument();

    unmount();
    vi.mocked(getOrderTakingMenu).mockRejectedValue(
      new ApiClientError(500, "Menu is unavailable."),
    );
    render(<CounterOrderPage />);
    expect(await screen.findByText("Menu is unavailable.")).toBeInTheDocument();
  });

  it("filters categories and prevents selecting unavailable menu items", async () => {
    await renderLoadedPage();
    const page = screen.getByRole("region", { name: "Counter order" });
    const menu = within(page).getByRole("region", { name: "All categories" });

    expect(
      within(menu).getByRole("button", { name: /Sold out mocha/ }),
    ).toBeDisabled();
    fireEvent.click(within(menu).getByRole("button", { name: "Tea" }));
    expect(
      within(menu).getByRole("button", { name: /Chai/ }),
    ).toBeInTheDocument();
    expect(
      within(menu).queryByRole("button", { name: /Latte/ }),
    ).not.toBeInTheDocument();
  });

  it("adds multiple draft lines, changes quantity, and removes a line", async () => {
    await renderLoadedPage();
    await addLatte(2);
    const page = screen.getByRole("region", { name: "Counter order" });
    const menu = within(page).getByRole("region", { name: "All categories" });
    fireEvent.click(within(menu).getByRole("button", { name: "Tea" }));
    fireEvent.click(within(menu).getByRole("button", { name: /Chai/ }));
    fireEvent.click(
      within(page).getByRole("button", { name: "Customize & add" }),
    );

    const summary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(within(summary).getByText("2x Latte")).toBeInTheDocument();
    expect(within(summary).getByText("1x Chai")).toBeInTheDocument();
    fireEvent.click(
      within(summary).getAllByRole("button", { name: "Remove" })[0]!,
    );
    expect(within(summary).queryByText("2x Latte")).not.toBeInTheDocument();
    expect(within(summary).getByText("1x Chai")).toBeInTheDocument();
  });

  it("creates and queues the exact counter-order payload", async () => {
    vi.mocked(createCounterOrder).mockResolvedValue(order("created"));
    vi.mocked(submitOrderToQueue).mockResolvedValue(order("queued"));
    await renderLoadedPage();
    const page = screen.getByRole("region", { name: "Counter order" });
    fireEvent.change(within(page).getByLabelText("Pickup name"), {
      target: { value: "  Mai  " },
    });
    await addLatte(2);

    fireEvent.click(
      within(
        screen.getByRole("complementary", { name: "Order summary" }),
      ).getByRole("button", { name: "Create and queue order" }),
    );

    await waitFor(() => {
      expect(createCounterOrder).toHaveBeenCalledWith({
        pickupName: "Mai",
        beverages: [
          {
            menuItemId: "latte",
            quantity: 2,
            selectedCustomizations: [
              { customizationGroupId: "milk", customizationChoiceIds: ["oat"] },
            ],
            specialInstructions: "Less foam",
          },
        ],
      });
      expect(submitOrderToQueue).toHaveBeenCalledWith("order-1");
    });
    expect(await screen.findByText("Order queued")).toBeInTheDocument();
  });

  it("retains drafts when order creation or queueing fails", async () => {
    vi.mocked(createCounterOrder).mockRejectedValueOnce(
      new ApiClientError(500, "Order failed."),
    );
    await renderLoadedPage();
    await addLatte();
    const submit = within(
      screen.getByRole("complementary", { name: "Order summary" }),
    ).getByRole("button", { name: "Create and queue order" });
    fireEvent.click(submit);
    expect(await screen.findByText("Order failed.")).toBeInTheDocument();
    expect(screen.getByText("1x Latte")).toBeInTheDocument();

    vi.mocked(createCounterOrder).mockResolvedValue(order("created"));
    vi.mocked(submitOrderToQueue).mockRejectedValue(
      new ApiClientError(503, "Queue failed."),
    );
    fireEvent.click(submit);
    expect(await screen.findByText("Queue failed.")).toBeInTheDocument();
    expect(screen.getByText("1x Latte")).toBeInTheDocument();
  });

  it("keeps a draft order when loyalty points cannot be loaded", async () => {
    vi.mocked(searchLoyaltyCustomers).mockResolvedValue([customer]);
    vi.mocked(getLoyaltyPoints).mockRejectedValue(
      new Error("Points are unavailable."),
    );
    await renderLoadedPage();
    await addLatte();
    const lookup = screen.getByRole("region", { name: "Customer lookup" });
    fireEvent.change(within(lookup).getByLabelText("Search customers"), {
      target: { value: customer.name },
    });
    fireEvent.click(
      await within(lookup).findByRole("button", {
        name: `Select ${customer.name}`,
      }),
    );

    await waitFor(() =>
      expect(getLoyaltyPoints).toHaveBeenCalledWith(customer.id),
    );
    expect(
      within(lookup).getByText(`Selected: ${customer.name}`),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("complementary", { name: "Order summary" }),
      ).getByText("1x Latte"),
    ).toBeInTheDocument();
  });
});
