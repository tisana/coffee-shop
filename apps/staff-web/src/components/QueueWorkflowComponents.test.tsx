import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";
import type {
  BeverageStatus,
  OrderBeverage,
  StaffUser,
} from "@coffee-shop/shared/domain/types";

import { BeverageStatusControls } from "./BeverageStatusControls";
import { OrderCreatedBanner } from "./OrderCreatedBanner";
import { PickupCalloutPanel } from "./PickupCalloutPanel";
import { PickupConfirmationButton } from "./PickupConfirmationButton";
import { QueueConflictMessage } from "./QueueConflictMessage";
import { QueueOrderCard } from "./QueueOrderCard";

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

  return {
    id,
    businessDate: "2026-08-21",
    dailyOrderNumber: 42,
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
    beverages: [
      beverage(
        id,
        `${id}-beverage`,
        status === "completed" ? "completed" : "pending",
      ),
    ],
    loyalty: null,
    ...overrides,
  };
}

const customer = {
  id: "customer-1",
  name: "Ari Srisuk",
  phone: "081-234-5678",
  email: null,
  enrolledAt: "2026-08-01T08:00:00.000Z",
  updatedAt: "2026-08-01T08:00:00.000Z",
};

describe("queue workflow components", () => {
  it("shows each beverage status and only enables actions for pending beverages", () => {
    const onCancel = vi.fn();
    const onComplete = vi.fn();
    const pending = beverage("order-1", "pending-beverage", "pending");
    const { rerender } = render(
      <BeverageStatusControls
        beverage={pending}
        disabled
        onCancel={onCancel}
        onComplete={onComplete}
      />,
    );

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Complete Latte" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel Latte" })).toBeDisabled();

    rerender(
      <BeverageStatusControls
        beverage={pending}
        disabled={false}
        onCancel={onCancel}
        onComplete={onComplete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Complete Latte" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Latte" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <BeverageStatusControls
        beverage={beverage("order-1", "completed-beverage", "completed")}
        disabled={false}
        onCancel={onCancel}
        onComplete={onComplete}
      />,
    );
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Complete Latte" }),
    ).not.toBeInTheDocument();

    rerender(
      <BeverageStatusControls
        beverage={beverage("order-1", "cancelled-beverage", "cancelled")}
        disabled={false}
        onCancel={onCancel}
        onComplete={onComplete}
      />,
    );
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel Latte" }),
    ).not.toBeInTheDocument();
  });

  it("renders created and queued banner branches, including retry and reward cancellation", () => {
    const onQueue = vi.fn();
    const onCancelReward = vi.fn();
    const created = queueOrder("created", {
      id: "created-order",
      dailyOrderNumber: 51,
      pickupName: null,
      loyalty: {
        customer,
        rewards: [
          {
            id: "active-reward",
            name: "Free beverage",
            pointsCost: 10,
            benefitType: "free_beverage",
            targetDescription: "Latte",
            coveredAmount: "4.50",
            status: "active",
          },
          {
            id: "returned-reward",
            name: "Size upgrade",
            pointsCost: 5,
            benefitType: "size_upgrade",
            targetDescription: "Latte",
            coveredAmount: "0.75",
            status: "returned",
          },
        ],
      },
    });
    const { rerender } = render(
      <OrderCreatedBanner
        order={created}
        queueing={false}
        onQueue={onQueue}
        onCancelReward={onCancelReward}
      />,
    );

    expect(screen.getByText("Order created")).toBeInTheDocument();
    expect(
      screen.getByText("Order still needs to be sent to the brew queue."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Free beverage, Size upgrade (Returned)"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel Free beverage" }),
    );
    expect(onCancelReward).toHaveBeenCalledWith("active-reward");
    fireEvent.click(screen.getByRole("button", { name: "Retry queue" }));
    expect(onQueue).toHaveBeenCalledTimes(1);

    rerender(
      <OrderCreatedBanner
        order={created}
        queueing
        onQueue={onQueue}
        onCancelReward={onCancelReward}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Sending to queue" }),
    ).toBeDisabled();

    rerender(
      <OrderCreatedBanner
        order={queueOrder("queued", {
          dailyOrderNumber: 52,
          pickupName: "Mai",
        })}
        queueing={false}
        onQueue={onQueue}
        onCancelReward={onCancelReward}
      />,
    );
    expect(screen.getByText("Order queued")).toBeInTheDocument();
    expect(screen.getByText("Mai is in the brew queue.")).toBeInTheDocument();
    expect(screen.getByText("Queued")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry queue" }),
    ).not.toBeInTheDocument();
  });

  it("renders pickup callouts and confirmation button pending state", () => {
    const order = queueOrder("completed", {
      dailyOrderNumber: 61,
      pickupName: "Mai",
    });
    const onConfirmPickup = vi.fn();
    const { unmount } = render(
      <PickupConfirmationButton
        order={order}
        confirming={false}
        onConfirmPickup={onConfirmPickup}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm pickup for order #61" }),
    );
    expect(onConfirmPickup).toHaveBeenCalledWith(order.id);
    unmount();

    render(
      <PickupCalloutPanel
        order={queueOrder("completed", {
          dailyOrderNumber: 62,
          pickupName: null,
        })}
        confirming
        onConfirmPickup={onConfirmPickup}
      />,
    );
    expect(screen.getByText("Call #62 for pickup")).toBeInTheDocument();
    expect(screen.getByText("Walk-up order is ready")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirming pickup" }),
    ).toBeDisabled();
  });

  it("renders claim conflicts as an accessible status message", () => {
    render(
      <QueueConflictMessage message="Another barista claimed this order." />,
    );

    const message = screen.getByRole("status");
    expect(within(message).getByText("Claim conflict")).toBeInTheDocument();
    expect(
      within(message).getByText("Another barista claimed this order."),
    ).toBeInTheDocument();
  });

  it("renders order details, assignment variants, beverage actions, and ready guards", () => {
    const onClaim = vi.fn();
    const onCancelBeverage = vi.fn();
    const onCompleteBeverage = vi.fn();
    const onCompleteOrder = vi.fn();
    const detailedPending = beverage(
      "queued-order",
      "queued-beverage",
      "pending",
      {
        selectedCustomizationsSnapshot: [
          {
            groupName: "Milk",
            choices: [{ choiceName: "Oat milk", priceAdjustment: "0.50" }],
          },
        ],
        specialInstructions: "Extra hot",
      },
    );
    const queued = queueOrder("queued", {
      id: "queued-order",
      dailyOrderNumber: 71,
      pickupName: null,
      assignedBaristaId: null,
      beverages: [detailedPending],
    });
    const { rerender } = render(
      <QueueOrderCard
        order={queued}
        currentStaff={staff}
        claiming={false}
        onClaim={onClaim}
        onCancelBeverage={onCancelBeverage}
        onCompleteBeverage={onCompleteBeverage}
        onCompleteOrder={onCompleteOrder}
      />,
    );

    expect(screen.getByText("Walk-up order")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("Milk: Oat milk")).toBeInTheDocument();
    expect(screen.getByText("Note: Extra hot")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Claim order #71" }));
    expect(onClaim).toHaveBeenCalledWith("queued-order");

    const inProgress = queueOrder("in_progress", {
      id: "other-order",
      dailyOrderNumber: 72,
      assignedBaristaId: "other-staff-123456",
      assignedBaristaDisplayName: "Other Barista",
      beverages: [beverage("other-order", "other-beverage", "pending")],
    });
    rerender(
      <QueueOrderCard
        order={inProgress}
        currentStaff={staff}
        claiming={false}
        busyActionId={null}
        onClaim={onClaim}
        onCancelBeverage={onCancelBeverage}
        onCompleteBeverage={onCompleteBeverage}
        onCompleteOrder={onCompleteOrder}
      />,
    );
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Assigned to Other Barista")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Complete Latte" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Latte" }));
    expect(onCompleteBeverage).toHaveBeenCalledWith(
      "other-order",
      "other-beverage",
    );
    expect(onCancelBeverage).toHaveBeenCalledWith(
      "other-order",
      "other-beverage",
    );

    rerender(
      <QueueOrderCard
        order={inProgress}
        currentStaff={staff}
        claiming={false}
        busyActionId="other-beverage"
        onClaim={onClaim}
        onCancelBeverage={onCancelBeverage}
        onCompleteBeverage={onCompleteBeverage}
        onCompleteOrder={onCompleteOrder}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Complete Latte" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel Latte" })).toBeDisabled();

    const readyToComplete = queueOrder("in_progress", {
      id: "ready-order",
      dailyOrderNumber: 73,
      assignedBaristaId: staff.id,
      assignedBaristaDisplayName: null,
      beverages: [
        beverage("ready-order", "ready-beverage", "completed"),
        beverage("ready-order", "unavailable-beverage", "cancelled"),
      ],
    });
    rerender(
      <QueueOrderCard
        order={readyToComplete}
        currentStaff={staff}
        claiming={false}
        busyActionId={readyToComplete.id}
        onClaim={onClaim}
        onCompleteBeverage={onCompleteBeverage}
        onCompleteOrder={onCompleteOrder}
      />,
    );
    expect(screen.getByText("Assigned to Demo Barista")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Marking ready" }),
    ).toBeDisabled();

    rerender(
      <QueueOrderCard
        order={readyToComplete}
        currentStaff={staff}
        claiming={false}
        busyActionId={null}
        onClaim={onClaim}
        onCompleteBeverage={onCompleteBeverage}
        onCompleteOrder={onCompleteOrder}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Mark order #73 ready for pickup" }),
    );
    expect(onCompleteOrder).toHaveBeenCalledWith("ready-order");

    const completed = queueOrder("completed", {
      id: "completed-order",
      dailyOrderNumber: 74,
      assignedBaristaId: "outside-123456",
      assignedBaristaDisplayName: null,
    });
    rerender(
      <QueueOrderCard
        order={completed}
        currentStaff={staff}
        claiming={false}
        onClaim={onClaim}
      />,
    );
    expect(screen.getByText("Ready for pickup")).toBeInTheDocument();
    expect(screen.getByText("Assigned staff outside-")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Claim order/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Mark order/ }),
    ).not.toBeInTheDocument();
  });
});
