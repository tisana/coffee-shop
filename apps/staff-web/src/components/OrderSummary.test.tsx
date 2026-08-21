import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MenuItem } from "@coffee-shop/shared/domain/types";

import { type DraftBeverage, OrderSummary } from "./OrderSummary";

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
};

const beverage: DraftBeverage = {
  id: "draft-latte",
  menuItem: latte,
  quantity: 2,
  selectedCustomizations: [
    { customizationGroupId: "milk", customizationChoiceIds: ["oat"] },
  ],
  specialInstructions: "Extra hot",
};

describe("OrderSummary", () => {
  it("shows the empty order prompt and disables submission", () => {
    render(
      <OrderSummary
        beverages={[]}
        submitting={false}
        onRemove={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const summary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(
      within(summary).getByText("Add beverages from the menu."),
    ).toBeInTheDocument();
    expect(
      within(summary).getByRole("button", { name: "Create and queue order" }),
    ).toBeDisabled();
    expect(within(summary).getByText("$0.00")).toBeInTheDocument();
  });

  it("shows line quantities, customization labels, and reward-adjusted totals", () => {
    render(
      <OrderSummary
        beverages={[beverage]}
        submitting={false}
        rewardPointsCost={10}
        rewardCoverage="2.00"
        onRemove={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const summary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(within(summary).getByText("2x Latte")).toBeInTheDocument();
    expect(within(summary).getAllByText("$10.00")).toHaveLength(2);
    expect(within(summary).getByText("Milk: Oat milk")).toBeInTheDocument();
    expect(within(summary).getByText("Note: Extra hot")).toBeInTheDocument();
    expect(
      within(summary).getByText("Reward coverage (10 pts)"),
    ).toBeInTheDocument();
    expect(within(summary).getByText("$8.00")).toBeInTheDocument();
  });

  it("removes the selected draft beverage", () => {
    const onRemove = vi.fn();
    render(
      <OrderSummary
        beverages={[beverage]}
        submitting={false}
        onRemove={onRemove}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(
      within(
        screen.getByRole("complementary", { name: "Order summary" }),
      ).getByRole("button", { name: "Remove" }),
    );

    expect(onRemove).toHaveBeenCalledWith("draft-latte");
  });

  it("submits populated orders and exposes the pending state", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <OrderSummary
        beverages={[beverage]}
        submitting={false}
        onRemove={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    const summary = screen.getByRole("complementary", {
      name: "Order summary",
    });

    fireEvent.click(
      within(summary).getByRole("button", { name: "Create and queue order" }),
    );
    expect(onSubmit).toHaveBeenCalledOnce();

    rerender(
      <OrderSummary
        beverages={[beverage]}
        submitting
        onRemove={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    expect(
      within(summary).getByRole("button", { name: "Creating and queueing" }),
    ).toBeDisabled();
  });
});
