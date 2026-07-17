import "@testing-library/jest-dom/vitest";

import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoyaltyRewardSettings } from "./LoyaltyRewardSettings";
import { LoyaltyRewardSelector } from "./LoyaltyRewardSelector";
import type { DraftBeverage } from "./OrderSummary";

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
});
