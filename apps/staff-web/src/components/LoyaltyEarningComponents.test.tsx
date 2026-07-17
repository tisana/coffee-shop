import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LoyaltyCustomer } from "@coffee-shop/shared/domain/types";

import { LoyaltyProgramSettings } from "./LoyaltyProgramSettings";
import { LoyaltyCustomerProfile } from "./LoyaltyCustomerProfile";

const customer: LoyaltyCustomer = {
  id: "0a1b2c3d-4e5f-4000-8000-000000000001",
  name: "Ari Srisuk",
  phone: "081-234-5678",
  email: null,
  enrolledAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z"
};

describe("loyalty earning components", () => {
  it("saves an amount-based earning rule", async () => {
    const onSave = vi.fn().mockResolvedValue({
      id: "rule-1",
      earningType: "purchase_amount",
      amountThreshold: "10.00",
      beverageCountThreshold: null,
      pointsAwarded: 1,
      active: true,
      effectiveAt: "2026-07-01T09:00:00.000Z",
      retiredAt: null
    });

    render(<LoyaltyProgramSettings rule={null} onSave={onSave} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Purchase amount" }), { target: { value: "10.00" } });
    fireEvent.change(screen.getByLabelText("Points awarded"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save earning rule" }));

    expect(onSave).toHaveBeenCalledWith({ earningType: "purchase_amount", amountThreshold: "10.00", pointsAwarded: 1 });
    expect(await screen.findByText("Active: 1 point per $10.00 purchase amount.")).toBeInTheDocument();
  });

  it("renders point totals and order-labelled history on the customer profile", () => {
    render(
      <LoyaltyCustomerProfile
        customer={customer}
        onSave={vi.fn()}
        points={{
          customer,
          asOfBusinessDate: "2026-07-01",
          summary: { available: 2, lifetimeEarned: 2, redeemed: 0, returned: 0, expired: 0, adjusted: 0 },
          history: [{ id: "entry-1", eventType: "earned", pointsDelta: 2, reason: "Earned from order #17.", businessDate: "2026-07-01", expirationBusinessDate: null, orderId: "order-1", orderLabel: "2026-07-01 #17", rewardName: null, occurredAt: "2026-07-01T09:00:00.000Z" }]
        }}
      />
    );

    expect(screen.getByText("Available points")).toBeInTheDocument();
    expect(screen.getByText("+2 points")).toBeInTheDocument();
    expect(screen.getByText("Redeemed")).toBeInTheDocument();
    expect(screen.getByText("Returned")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01 #17")).toBeInTheDocument();
  });
});
