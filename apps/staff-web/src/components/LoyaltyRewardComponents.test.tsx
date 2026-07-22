import "@testing-library/jest-dom/vitest";

import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";
import type { StaffUser } from "@coffee-shop/shared/domain/types";

import { LoyaltyRewardSettings } from "./LoyaltyRewardSettings";
import { LoyaltyRewardSelector } from "./LoyaltyRewardSelector";
import { OrderCreatedBanner } from "./OrderCreatedBanner";
import { OrderHistoryList } from "./OrderHistoryList";
import type { DraftBeverage } from "./OrderSummary";
import { QueueOrderCard } from "./QueueOrderCard";

const staff: StaffUser = {
  id: "staff-1",
  username: "barista",
  displayName: "Demo Barista",
  authorizationStatus: "authorized"
};

function loyaltyOrder(rewardStatus: "active" | "returned" = "active"): QueueOrder {
  return {
    id: "order-1",
    businessDate: "2026-07-01",
    dailyOrderNumber: 17,
    pickupName: "Ari",
    status: "in_progress",
    createdByStaffId: staff.id,
    assignedBaristaId: staff.id,
    assignedBaristaDisplayName: staff.displayName,
    total: "5.25",
    loyaltyRewardDiscountTotal: rewardStatus === "active" ? "5.25" : "0.00",
    payableTotal: rewardStatus === "active" ? "0.00" : "5.25",
    createdAt: "2026-07-01T09:00:00.000Z",
    queuedAt: "2026-07-01T09:01:00.000Z",
    inProgressAt: "2026-07-01T09:02:00.000Z",
    completedAt: null,
    pickedUpAt: null,
    cancelledAt: null,
    beverages: [
      {
        id: "beverage-1",
        orderId: "order-1",
        sourceMenuItemId: "menu-1",
        nameSnapshot: "Latte",
        quantity: 1,
        priceSnapshot: "5.25",
        selectedCustomizationsSnapshot: [],
        specialInstructions: null,
        status: "pending",
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null
      }
    ],
    loyalty: {
      customer: {
        id: "customer-1",
        name: "Ari Srisuk",
        phone: "081-234-5678",
        email: null,
        enrolledAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-01T08:00:00.000Z"
      },
      rewards: [
        {
          id: "redemption-1",
          name: "Free beverage",
          pointsCost: 10,
          benefitType: "free_beverage",
          targetDescription: "Latte",
          coveredAmount: "5.25",
          status: rewardStatus
        }
      ]
    }
  };
}

describe("loyalty reward settings", () => {
  it("creates a reward with an immutable benefit type and retires active rewards", async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: "reward-1", name: "Free beverage", pointsCost: 10, benefitType: "free_beverage", benefitDescription: "One beverage free", active: true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" });
    const onRetire = vi.fn().mockResolvedValue(undefined);
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<LoyaltyRewardSettings rewards={[{ id: "reward-1", name: "Free beverage", pointsCost: 10, benefitType: "free_beverage", benefitDescription: "One beverage free", active: true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }]} onCreate={onCreate} onRetire={onRetire} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Size upgrade" } });
    fireEvent.change(screen.getByLabelText("Points cost"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Upgrade one size" } });
    fireEvent.click(screen.getByRole("button", { name: "Add reward" }));
    expect(onCreate).toHaveBeenCalledWith({ name: "Size upgrade", pointsCost: 5, benefitType: "free_beverage", benefitDescription: "Upgrade one size" });
    fireEvent.click(screen.getByRole("button", { name: "Retire" }));
    expect(onRetire).toHaveBeenCalledWith("reward-1");
  });

  it("edits only the mutable reward details", async () => {
    const onCreate = vi.fn();
    const onRetire = vi.fn();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<LoyaltyRewardSettings rewards={[{ id: "reward-1", name: "Free beverage", pointsCost: 10, benefitType: "free_beverage", benefitDescription: "One beverage free", active: true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }]} onCreate={onCreate} onRetire={onRetire} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Free beverage" }));
    fireEvent.change(screen.getByLabelText("Edit name"), { target: { value: "Free cold beverage" } });
    fireEvent.change(screen.getByLabelText("Edit points cost"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Edit description"), { target: { value: "One cold beverage free" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onUpdate).toHaveBeenCalledWith("reward-1", { name: "Free cold beverage", pointsCost: 12, benefitDescription: "One cold beverage free" });
    expect(screen.queryByLabelText("Edit benefit")).not.toBeInTheDocument();
  });

  it("requires an explicit positive-price size adjustment before selecting a size reward", () => {
    const beverage: DraftBeverage = {
      id: "draft-1",
      quantity: 1,
      selectedCustomizations: [{ customizationGroupId: "group-size", customizationChoiceIds: ["choice-large"] }],
      menuItem: {
        id: "menu-1", categoryId: "category-1", name: "Latte", description: null, imageUrl: null,
        price: "4.00", available: true, active: true, displayOrder: 1,
        customizationGroups: [{ id: "group-size", menuItemId: "menu-1", name: "Size", required: false, minSelections: 0, maxSelections: 1, displayOrder: 1, active: true, choices: [
          { id: "choice-large", customizationGroupId: "group-size", name: "Large", priceAdjustment: "0.75", available: true, active: true, displayOrder: 1 }
        ] }]
      }
    };
    const onChange = vi.fn();
    function Harness() {
      const [selections, setSelections] = useState<import("@coffee-shop/shared/contracts/api").LoyaltyRewardSelection[]>([]);
      return <LoyaltyRewardSelector beverages={[beverage]} availablePoints={5} selections={selections} onChange={(next) => { onChange(next); setSelections(next); }} rewards={[{ id: "reward-size", name: "Size upgrade", pointsCost: 5, benefitType: "size_upgrade", benefitDescription: "Upgrade size", active: true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }]} />;
    }
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("1x Latte"), { target: { value: "reward-size" } });
    expect(screen.getByLabelText("Size adjustment for Latte")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Size adjustment for Latte"), { target: { value: "choice-large" } });
    expect(onChange).toHaveBeenLastCalledWith([{ rewardOptionId: "reward-size", targetBeverageIndex: 0, targetCustomizationChoiceId: "choice-large" }]);
  });

  it("allows one affordable reward per beverage unit without stacking either unit", () => {
    const beverage: DraftBeverage = {
      id: "draft-2", quantity: 2, selectedCustomizations: [],
      menuItem: { id: "menu-2", categoryId: "category-1", name: "Americano", description: null, imageUrl: null, price: "3.00", available: true, active: true, displayOrder: 1, customizationGroups: [] }
    };
    const onChange = vi.fn();
    function Harness() {
      const [selections, setSelections] = useState<import("@coffee-shop/shared/contracts/api").LoyaltyRewardSelection[]>([]);
      return <LoyaltyRewardSelector beverages={[beverage]} availablePoints={10} selections={selections} onChange={(next) => { onChange(next); setSelections(next); }} rewards={[{ id: "reward-free", name: "Free beverage", pointsCost: 5, benefitType: "free_beverage", benefitDescription: "One beverage free", active: true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }]} />;
    }
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("2x Americano (unit 1)"), { target: { value: "reward-free" } });
    fireEvent.change(screen.getByLabelText("2x Americano (unit 2)"), { target: { value: "reward-free" } });
    expect(onChange).toHaveBeenLastCalledWith([
      { rewardOptionId: "reward-free", targetBeverageIndex: 0 },
      { rewardOptionId: "reward-free", targetBeverageIndex: 0 }
    ]);
  });

  it("explains the exact point shortfall and missing positive-price size target", () => {
    const beverage: DraftBeverage = {
      id: "draft-3",
      quantity: 1,
      selectedCustomizations: [],
      menuItem: {
        id: "menu-3",
        categoryId: "category-1",
        name: "Drip coffee",
        description: null,
        imageUrl: null,
        price: "3.00",
        available: true,
        active: true,
        displayOrder: 1,
        customizationGroups: []
      }
    };

    render(
      <LoyaltyRewardSelector
        beverages={[beverage]}
        availablePoints={2}
        selections={[]}
        onChange={vi.fn()}
        rewards={[
          { id: "reward-free", name: "Free beverage", pointsCost: 5, benefitType: "free_beverage", benefitDescription: "One beverage free", active: true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" },
          { id: "reward-size", name: "Size upgrade", pointsCost: 3, benefitType: "size_upgrade", benefitDescription: "Upgrade size", active: true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }
        ]}
      />
    );

    expect(screen.getByRole("option", { name: "Free beverage (5 pts)" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Size upgrade (3 pts)" })).toBeDisabled();
    expect(screen.getByText("Free beverage: 3 more points needed.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Size upgrade: 1 more point needed. Select a positive-price size adjustment first."
      )
    ).toBeInTheDocument();
  });

  it("shows reward snapshots across created, queue, and history surfaces", () => {
    const order = loyaltyOrder();
    const { container } = render(
      <>
        <OrderCreatedBanner order={{ ...order, status: "queued" }} queueing={false} onQueue={vi.fn()} onCancelReward={vi.fn()} />
        <QueueOrderCard order={order} currentStaff={staff} claiming={false} onClaim={vi.fn()} />
        <OrderHistoryList orders={[order]} />
      </>
    );

    expect(within(container.querySelector(".order-created-banner") as HTMLElement).getByText("Free beverage")).toBeInTheDocument();
    expect(within(container.querySelector(".queue-order-card") as HTMLElement).getByText("Free beverage: Latte | Payable $0.00")).toBeInTheDocument();
    expect(within(container.querySelector(".history-order") as HTMLElement).getByText("Free beverage (10 pts)")).toBeInTheDocument();
  });

  it("cancels only active rewards and labels returned rewards on every order surface", () => {
    const onCancelReward = vi.fn();
    const active = loyaltyOrder();
    const { container, rerender } = render(
      <OrderCreatedBanner order={{ ...active, status: "queued" }} queueing={false} onQueue={vi.fn()} onCancelReward={onCancelReward} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel Free beverage" }));
    expect(onCancelReward).toHaveBeenCalledWith("redemption-1");

    const returned = loyaltyOrder("returned");
    rerender(
      <>
        <OrderCreatedBanner order={{ ...returned, status: "queued" }} queueing={false} onQueue={vi.fn()} onCancelReward={onCancelReward} />
        <QueueOrderCard order={returned} currentStaff={staff} claiming={false} onClaim={vi.fn()} />
        <OrderHistoryList orders={[returned]} />
      </>
    );

    expect(screen.queryByRole("button", { name: "Cancel Free beverage" })).not.toBeInTheDocument();
    expect(within(container.querySelector(".order-created-banner") as HTMLElement).getByText("Free beverage (Returned)")).toBeInTheDocument();
    expect(within(container.querySelector(".queue-order-card") as HTMLElement).getByText("Free beverage (Returned): Latte | Payable $5.25")).toBeInTheDocument();
    expect(within(container.querySelector(".history-order") as HTMLElement).getByText("Free beverage (10 pts, Returned)")).toBeInTheDocument();
  });
});
