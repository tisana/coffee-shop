import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoyaltyRewardSettings } from "./LoyaltyRewardSettings";

describe("loyalty reward settings", () => {
  it("creates a reward with an immutable benefit type and retires active rewards", async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: "reward-1", name: "Free beverage", pointsCost: 10, benefitType: "free_beverage", benefitDescription: "One beverage free", active: true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" });
    const onRetire = vi.fn().mockResolvedValue(undefined);
    render(<LoyaltyRewardSettings rewards={[{ id: "reward-1", name: "Free beverage", pointsCost: 10, benefitType: "free_beverage", benefitDescription: "One beverage free", active: true, effectiveAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }]} onCreate={onCreate} onRetire={onRetire} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Size upgrade" } });
    fireEvent.change(screen.getByLabelText("Points cost"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Upgrade one size" } });
    fireEvent.click(screen.getByRole("button", { name: "Add reward" }));
    expect(onCreate).toHaveBeenCalledWith({ name: "Size upgrade", pointsCost: 5, benefitType: "free_beverage", benefitDescription: "Upgrade one size" });
    fireEvent.click(screen.getByRole("button", { name: "Retire" }));
    expect(onRetire).toHaveBeenCalledWith("reward-1");
  });
});
