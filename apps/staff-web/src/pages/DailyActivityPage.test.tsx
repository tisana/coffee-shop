import "@testing-library/jest-dom/vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderWithLoyalty } from "@coffee-shop/shared/domain/types";

import { ApiClientError } from "../services/apiClient";
import { getOrderHistory } from "../services/historyApi";
import { DailyActivityPage } from "./DailyActivityPage";

vi.mock("../services/historyApi", () => ({
  getOrderHistory: vi.fn(),
}));

function historyOrder(
  overrides: Partial<OrderWithLoyalty> = {},
): OrderWithLoyalty {
  return {
    id: "order-history-1",
    businessDate: "2026-07-01",
    dailyOrderNumber: 42,
    pickupName: "Mali Chen",
    status: "completed",
    createdByStaffId: "staff-1",
    assignedBaristaId: "staff-1",
    assignedBaristaDisplayName: "Demo Barista",
    total: "10.50",
    createdAt: "2026-07-01T09:00:00.000Z",
    queuedAt: "2026-07-01T09:01:00.000Z",
    inProgressAt: "2026-07-01T09:05:00.000Z",
    completedAt: "2026-07-01T09:08:00.000Z",
    pickedUpAt: null,
    cancelledAt: null,
    beverages: [
      {
        id: "beverage-history-1",
        orderId: "order-history-1",
        sourceMenuItemId: "menu-latte",
        nameSnapshot: "Latte",
        quantity: 1,
        priceSnapshot: "10.50",
        selectedCustomizationsSnapshot: [],
        specialInstructions: "Less ice",
        status: "completed",
        completedAt: "2026-07-01T09:08:00.000Z",
        cancelledAt: null,
        cancellationReason: null,
      },
    ],
    loyaltyRewardDiscountTotal: "0.00",
    payableTotal: "10.50",
    loyalty: null,
    ...overrides,
  };
}

describe("DailyActivityPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrderHistory).mockResolvedValue({ orders: [] });
  });

  it("shows initial loading before rendering populated daily history", async () => {
    vi.mocked(getOrderHistory).mockResolvedValue({
      orders: [historyOrder()],
    });

    render(<DailyActivityPage />);

    const page = screen.getByRole("region", { name: "Daily activity" });
    expect(
      within(page).getByText("Loading daily activity."),
    ).toBeInTheDocument();

    const results = await within(page).findByLabelText("Order history results");
    const order = within(results).getByRole("article");
    expect(within(order).getByText("#42", { exact: true })).toBeInTheDocument();
    expect(
      within(order).getByRole("heading", { name: "Mali Chen" }),
    ).toBeInTheDocument();
    expect(
      within(order).getByText("Ready", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(order).getByText("$10.50", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(order).getByText("1x Latte", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(order).getByText("Note: Less ice", { exact: true }),
    ).toBeInTheDocument();
    expect(getOrderHistory).toHaveBeenCalledWith({});
  });

  it("reloads current-day history with daily order number, status, and pickup name filters", async () => {
    render(<DailyActivityPage />);

    const page = screen.getByRole("region", { name: "Daily activity" });
    await within(page).findByText("No current-day orders match those filters.");
    const filters = within(page)
      .getByLabelText("Daily order number")
      .closest("form") as HTMLFormElement;

    fireEvent.change(within(filters).getByLabelText("Daily order number"), {
      target: { value: "42" },
    });
    fireEvent.change(within(filters).getByLabelText("Status"), {
      target: { value: "completed" },
    });
    fireEvent.change(within(filters).getByLabelText("Pickup name"), {
      target: { value: "Mali Chen" },
    });
    fireEvent.click(
      within(filters).getByRole("button", { name: "Search history" }),
    );

    await waitFor(() => {
      expect(getOrderHistory).toHaveBeenLastCalledWith({
        dailyOrderNumber: 42,
        status: "completed",
        pickupName: "Mali Chen",
      });
    });
  });

  it("recovers from empty and rejected history states on a subsequent filter", async () => {
    const recoveredOrder = historyOrder({
      id: "order-history-recovered",
      dailyOrderNumber: 17,
      pickupName: "Ari Srisuk",
      status: "queued",
    });
    vi.mocked(getOrderHistory)
      .mockResolvedValueOnce({ orders: [] })
      .mockRejectedValueOnce(
        new ApiClientError(503, "Unable to load daily activity."),
      )
      .mockResolvedValueOnce({ orders: [recoveredOrder] });

    render(<DailyActivityPage />);

    const page = screen.getByRole("region", { name: "Daily activity" });
    await within(page).findByText("No current-day orders match those filters.");
    const filters = within(page)
      .getByLabelText("Daily order number")
      .closest("form") as HTMLFormElement;
    const pickupName = within(filters).getByLabelText("Pickup name");

    fireEvent.change(pickupName, { target: { value: "Unknown" } });
    fireEvent.click(
      within(filters).getByRole("button", { name: "Search history" }),
    );
    expect(
      await within(page).findByText("Unable to load daily activity."),
    ).toBeVisible();

    fireEvent.change(pickupName, { target: { value: "Ari Srisuk" } });
    fireEvent.click(
      within(filters).getByRole("button", { name: "Search history" }),
    );

    const results = await within(page).findByLabelText("Order history results");
    const order = within(results).getByRole("article");
    expect(within(order).getByText("#17", { exact: true })).toBeInTheDocument();
    expect(
      within(order).getByRole("heading", { name: "Ari Srisuk" }),
    ).toBeInTheDocument();
    expect(
      within(order).getByText("Waiting", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(page).queryByText("Unable to load daily activity."),
    ).not.toBeInTheDocument();
  });
});
