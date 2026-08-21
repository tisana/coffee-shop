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
  QueueOrder,
  QueueOrdersResponse,
} from "@coffee-shop/shared/contracts/api";
import type {
  BeverageStatus,
  Order,
  OrderBeverage,
  StaffUser,
} from "@coffee-shop/shared/domain/types";

import { ApiClientError } from "../services/apiClient";
import {
  cancelBeverage,
  completeBeverage,
  completeOrder,
  confirmPickup,
} from "../services/fulfillmentApi";
import { claimQueueOrder, getQueueOrders } from "../services/queueApi";
import { BrewQueuePage } from "./BrewQueuePage";

vi.mock("../services/fulfillmentApi", () => ({
  cancelBeverage: vi.fn(),
  completeBeverage: vi.fn(),
  completeOrder: vi.fn(),
  confirmPickup: vi.fn(),
}));

vi.mock("../services/queueApi", () => ({
  claimQueueOrder: vi.fn(),
  getQueueOrders: vi.fn(),
}));

const staff: StaffUser = {
  id: "staff-1",
  username: "barista",
  displayName: "Demo Barista",
  authorizationStatus: "authorized",
};

function beverage(
  orderId: string,
  id: string,
  status: BeverageStatus,
  overrides: Partial<OrderBeverage> = {},
): OrderBeverage {
  return {
    id,
    orderId,
    sourceMenuItemId: `menu-${id}`,
    nameSnapshot: "Latte",
    quantity: 1,
    priceSnapshot: "4.50",
    selectedCustomizationsSnapshot: [],
    specialInstructions: null,
    status,
    completedAt: status === "completed" ? "2026-08-21T09:08:00.000Z" : null,
    cancelledAt: status === "cancelled" ? "2026-08-21T09:08:00.000Z" : null,
    cancellationReason: status === "cancelled" ? "Unavailable" : null,
    ...overrides,
  };
}

function queueOrder(
  status: QueueOrder["status"],
  overrides: Partial<QueueOrder> = {},
): QueueOrder {
  const id = overrides.id ?? `${status}-order`;
  const dailyOrderNumber = overrides.dailyOrderNumber ?? 1;
  const defaultBeverageStatus: BeverageStatus =
    status === "completed" ? "completed" : "pending";

  return {
    id,
    businessDate: "2026-08-21",
    dailyOrderNumber,
    pickupName: "Ari",
    status,
    createdByStaffId: staff.id,
    assignedBaristaId: status === "in_progress" ? staff.id : null,
    assignedBaristaDisplayName:
      status === "in_progress" ? staff.displayName : null,
    total: "4.50",
    loyaltyRewardDiscountTotal: "0.00",
    payableTotal: "4.50",
    createdAt: "2026-08-21T09:00:00.000Z",
    queuedAt: "2026-08-21T09:01:00.000Z",
    inProgressAt:
      status === "in_progress" || status === "completed"
        ? "2026-08-21T09:02:00.000Z"
        : null,
    completedAt: status === "completed" ? "2026-08-21T09:08:00.000Z" : null,
    pickedUpAt: null,
    cancelledAt: null,
    beverages: [beverage(id, `${id}-beverage`, defaultBeverageStatus)],
    loyalty: null,
    ...overrides,
  };
}

function pickedUpOrder(order: QueueOrder): Order {
  return {
    ...order,
    status: "picked_up",
    pickedUpAt: "2026-08-21T09:10:00.000Z",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("BrewQueuePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getQueueOrders).mockResolvedValue({ orders: [] });
  });

  it("shows loading and then renders waiting, in-progress, and pickup sections", async () => {
    let resolveQueue!: (response: QueueOrdersResponse) => void;
    vi.mocked(getQueueOrders).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveQueue = resolve;
        }),
    );

    const waiting = queueOrder("queued", {
      id: "waiting-order",
      dailyOrderNumber: 11,
      pickupName: "Nok",
      createdAt: "2026-08-21T09:00:00.000Z",
      queuedAt: "2026-08-21T09:01:00.000Z",
      inProgressAt: null,
      completedAt: null,
      beverages: [beverage("waiting-order", "waiting-beverage", "pending")],
    });
    const inProgress = queueOrder("in_progress", {
      id: "brewing-order",
      dailyOrderNumber: 22,
      pickupName: "Beam",
      createdAt: "2026-08-21T09:03:00.000Z",
      queuedAt: "2026-08-21T09:04:00.000Z",
      inProgressAt: "2026-08-21T09:05:00.000Z",
      completedAt: null,
      beverages: [beverage("brewing-order", "brewing-beverage", "pending")],
    });
    const ready = queueOrder("completed", {
      id: "ready-order",
      dailyOrderNumber: 33,
      pickupName: "Mai",
      createdAt: "2026-08-21T09:06:00.000Z",
      queuedAt: "2026-08-21T09:07:00.000Z",
      inProgressAt: "2026-08-21T09:08:00.000Z",
      completedAt: "2026-08-21T09:09:00.000Z",
      beverages: [beverage("ready-order", "ready-beverage", "completed")],
    });

    render(<BrewQueuePage staff={staff} />);
    const page = screen.getByRole("region", { name: "Brew queue" });
    expect(within(page).getByText("Loading brew queue.")).toBeInTheDocument();

    resolveQueue({ orders: [waiting, inProgress, ready] });

    const waitingSection = await within(page).findByRole("region", {
      name: "Waiting",
    });
    const inProgressSection = await within(page).findByRole("region", {
      name: "In progress",
    });
    const pickupSection = await within(page).findByRole("region", {
      name: "Ready for pickup",
    });

    expect(
      within(waitingSection).getByRole("heading", { name: "Waiting" }),
    ).toBeInTheDocument();
    expect(within(waitingSection).getByText("#11")).toBeInTheDocument();
    expect(
      within(waitingSection).getByRole("button", { name: "Claim order #11" }),
    ).toBeInTheDocument();
    expect(
      within(inProgressSection).getByRole("heading", { name: "In progress" }),
    ).toBeInTheDocument();
    expect(within(inProgressSection).getByText("#22")).toBeInTheDocument();
    expect(within(pickupSection).getByText("Mai is ready")).toBeInTheDocument();
    expect(
      within(pickupSection).getByRole("button", {
        name: "Confirm pickup for order #33",
      }),
    ).toBeInTheDocument();
  });

  it("shows empty text for the waiting and in-progress columns when there are no active orders", async () => {
    render(<BrewQueuePage staff={staff} />);

    const page = screen.getByRole("region", { name: "Brew queue" });
    const waitingSection = await within(page).findByRole("region", {
      name: "Waiting",
    });
    const inProgressSection = await within(page).findByRole("region", {
      name: "In progress",
    });

    expect(
      within(waitingSection).getByText("No waiting orders."),
    ).toBeInTheDocument();
    expect(
      within(inProgressSection).getByText("No orders in progress."),
    ).toBeInTheDocument();
    expect(
      within(page).queryByRole("region", { name: "Ready for pickup" }),
    ).not.toBeInTheDocument();
  });

  it("claims, completes, marks ready, and confirms pickup with refreshed state", async () => {
    const waiting = queueOrder("queued", {
      id: "workflow-order",
      dailyOrderNumber: 101,
      pickupName: "Nok",
      beverages: [beverage("workflow-order", "workflow-beverage", "pending")],
    });
    const claimed = queueOrder("in_progress", {
      id: waiting.id,
      dailyOrderNumber: waiting.dailyOrderNumber,
      pickupName: waiting.pickupName,
      assignedBaristaId: staff.id,
      assignedBaristaDisplayName: staff.displayName,
      beverages: [beverage("workflow-order", "workflow-beverage", "pending")],
    });
    const beverageCompleted = queueOrder("in_progress", {
      id: waiting.id,
      dailyOrderNumber: waiting.dailyOrderNumber,
      pickupName: waiting.pickupName,
      assignedBaristaId: staff.id,
      assignedBaristaDisplayName: staff.displayName,
      beverages: [beverage("workflow-order", "workflow-beverage", "completed")],
    });
    const ready = queueOrder("completed", {
      id: waiting.id,
      dailyOrderNumber: waiting.dailyOrderNumber,
      pickupName: waiting.pickupName,
      assignedBaristaId: staff.id,
      assignedBaristaDisplayName: staff.displayName,
      beverages: [beverage("workflow-order", "workflow-beverage", "completed")],
    });

    vi.mocked(getQueueOrders).mockResolvedValue({ orders: [waiting] });
    vi.mocked(claimQueueOrder).mockResolvedValue(claimed);
    vi.mocked(completeBeverage).mockResolvedValue(beverageCompleted);
    vi.mocked(completeOrder).mockResolvedValue(ready);
    vi.mocked(confirmPickup).mockResolvedValue(pickedUpOrder(ready));

    render(<BrewQueuePage staff={staff} />);

    const page = screen.getByRole("region", { name: "Brew queue" });
    const waitingSection = await within(page).findByRole("region", {
      name: "Waiting",
    });
    fireEvent.click(
      within(waitingSection).getByRole("button", { name: "Claim order #101" }),
    );

    await waitFor(() =>
      expect(claimQueueOrder).toHaveBeenCalledWith("workflow-order"),
    );
    const inProgressSection = await within(page).findByRole("region", {
      name: "In progress",
    });
    fireEvent.click(
      within(inProgressSection).getByRole("button", { name: "Complete Latte" }),
    );

    await waitFor(() =>
      expect(completeBeverage).toHaveBeenCalledWith(
        "workflow-order",
        "workflow-beverage",
      ),
    );
    const refreshedInProgress = await within(page).findByRole("region", {
      name: "In progress",
    });
    expect(
      within(refreshedInProgress).getByText("Completed"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(refreshedInProgress).getByRole("button", {
        name: "Mark order #101 ready for pickup",
      }),
    );

    await waitFor(() =>
      expect(completeOrder).toHaveBeenCalledWith("workflow-order"),
    );
    const pickupSection = await within(page).findByRole("region", {
      name: "Ready for pickup",
    });
    fireEvent.click(
      within(pickupSection).getByRole("button", {
        name: "Confirm pickup for order #101",
      }),
    );

    await waitFor(() =>
      expect(confirmPickup).toHaveBeenCalledWith("workflow-order"),
    );
    expect(
      await screen.findByText("Pickup confirmed for #101."),
    ).toBeInTheDocument();
    expect(
      within(page).queryByRole("region", { name: "Ready for pickup" }),
    ).not.toBeInTheDocument();
  });

  it("cancels a beverage and refreshes its status in the in-progress card", async () => {
    const inProgress = queueOrder("in_progress", {
      id: "cancel-order",
      dailyOrderNumber: 202,
      beverages: [beverage("cancel-order", "cancel-beverage", "pending")],
    });
    const cancelled = queueOrder("in_progress", {
      id: "cancel-order",
      dailyOrderNumber: 202,
      beverages: [beverage("cancel-order", "cancel-beverage", "cancelled")],
    });
    vi.mocked(getQueueOrders).mockResolvedValue({ orders: [inProgress] });
    vi.mocked(cancelBeverage).mockResolvedValue(cancelled);

    render(<BrewQueuePage staff={staff} />);

    const page = screen.getByRole("region", { name: "Brew queue" });
    const section = await within(page).findByRole("region", {
      name: "In progress",
    });
    fireEvent.click(
      within(section).getByRole("button", { name: "Cancel Latte" }),
    );

    await waitFor(() =>
      expect(cancelBeverage).toHaveBeenCalledWith(
        "cancel-order",
        "cancel-beverage",
        "Unavailable",
      ),
    );
    expect(await within(section).findByText("Cancelled")).toBeInTheDocument();
  });

  it("protects a pending claim button from duplicate requests", async () => {
    const waiting = queueOrder("queued", {
      id: "pending-claim-order",
      dailyOrderNumber: 303,
    });
    const claimed = queueOrder("in_progress", {
      id: waiting.id,
      dailyOrderNumber: waiting.dailyOrderNumber,
      assignedBaristaId: staff.id,
      assignedBaristaDisplayName: staff.displayName,
    });
    const claim = deferred<QueueOrder>();
    vi.mocked(getQueueOrders).mockResolvedValue({ orders: [waiting] });
    vi.mocked(claimQueueOrder).mockReturnValue(claim.promise);

    render(<BrewQueuePage staff={staff} />);
    const page = screen.getByRole("region", { name: "Brew queue" });
    const section = await within(page).findByRole("region", {
      name: "Waiting",
    });
    fireEvent.click(
      within(section).getByRole("button", { name: "Claim order #303" }),
    );

    const pendingButton = within(section).getByRole("button", {
      name: "Claiming",
    });
    expect(pendingButton).toBeDisabled();
    fireEvent.click(pendingButton);
    expect(claimQueueOrder).toHaveBeenCalledTimes(1);

    claim.resolve(claimed);
    await waitFor(() => {
      const inProgressRegion = screen.getByRole("region", {
        name: "In progress",
      });
      const claimedCard = within(inProgressRegion).getByRole("article");

      expect(within(claimedCard).getByText("#303")).toBeInTheDocument();
      expect(
        within(claimedCard).getByRole("button", { name: "Complete Latte" }),
      ).toBeEnabled();
    });
  });

  it("protects a pending beverage action from duplicate requests", async () => {
    const inProgress = queueOrder("in_progress", {
      id: "pending-beverage-order",
      dailyOrderNumber: 404,
      beverages: [
        beverage("pending-beverage-order", "pending-beverage", "pending"),
      ],
    });
    const completed = queueOrder("in_progress", {
      id: inProgress.id,
      dailyOrderNumber: inProgress.dailyOrderNumber,
      beverages: [
        beverage("pending-beverage-order", "pending-beverage", "completed"),
      ],
    });
    const completion = deferred<QueueOrder>();
    vi.mocked(getQueueOrders).mockResolvedValue({ orders: [inProgress] });
    vi.mocked(completeBeverage).mockReturnValue(completion.promise);

    render(<BrewQueuePage staff={staff} />);
    const page = screen.getByRole("region", { name: "Brew queue" });
    const section = await within(page).findByRole("region", {
      name: "In progress",
    });
    const completeButton = within(section).getByRole("button", {
      name: "Complete Latte",
    });
    fireEvent.click(completeButton);

    expect(completeButton).toBeDisabled();
    fireEvent.click(completeButton);
    expect(completeBeverage).toHaveBeenCalledTimes(1);

    completion.resolve(completed);
    await waitFor(() =>
      expect(within(section).getByText("Completed")).toBeInTheDocument(),
    );
  });

  it("reports queue loading failures", async () => {
    vi.mocked(getQueueOrders).mockRejectedValue(
      new ApiClientError(503, "Queue service is unavailable."),
    );

    render(<BrewQueuePage staff={staff} />);

    expect(
      await screen.findByText("Queue service is unavailable."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Loading brew queue.")).not.toBeInTheDocument();
  });

  it("shows a conflict message for a rejected claim", async () => {
    const waiting = queueOrder("queued", {
      id: "conflict-order",
      dailyOrderNumber: 505,
    });
    vi.mocked(getQueueOrders).mockResolvedValue({ orders: [waiting] });
    vi.mocked(claimQueueOrder).mockRejectedValue(
      new ApiClientError(409, "Another barista claimed this order."),
    );

    render(<BrewQueuePage staff={staff} />);
    const page = screen.getByRole("region", { name: "Brew queue" });
    const section = await within(page).findByRole("region", {
      name: "Waiting",
    });
    fireEvent.click(
      within(section).getByRole("button", { name: "Claim order #505" }),
    );

    const conflict = await screen.findByRole("status");
    expect(within(conflict).getByText("Claim conflict")).toBeInTheDocument();
    expect(
      within(conflict).getByText("Another barista claimed this order."),
    ).toBeInTheDocument();
  });

  it("reports a non-conflict failure when marking an order ready", async () => {
    const readyToComplete = queueOrder("in_progress", {
      id: "ready-failure-order",
      dailyOrderNumber: 606,
      beverages: [
        beverage("ready-failure-order", "completed-beverage", "completed"),
        beverage("ready-failure-order", "cancelled-beverage", "cancelled"),
      ],
    });
    vi.mocked(getQueueOrders).mockResolvedValue({ orders: [readyToComplete] });
    vi.mocked(completeOrder).mockRejectedValue(
      new ApiClientError(422, "Order cannot be marked ready yet."),
    );

    render(<BrewQueuePage staff={staff} />);
    const page = screen.getByRole("region", { name: "Brew queue" });
    const section = await within(page).findByRole("region", {
      name: "In progress",
    });
    fireEvent.click(
      within(section).getByRole("button", {
        name: "Mark order #606 ready for pickup",
      }),
    );

    expect(
      await screen.findByText("Order cannot be marked ready yet."),
    ).toBeInTheDocument();
  });
});
