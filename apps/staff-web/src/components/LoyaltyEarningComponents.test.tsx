import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LoyaltyCustomer } from "@coffee-shop/shared/domain/types";

import { LoyaltyProgramSettings } from "./LoyaltyProgramSettings";
import { LoyaltyCustomerProfile } from "./LoyaltyCustomerProfile";
import { LoyaltyEarningEligibility } from "./LoyaltyEarningEligibility";

const customer: LoyaltyCustomer = {
  id: "0a1b2c3d-4e5f-4000-8000-000000000001",
  name: "Ari Srisuk",
  phone: "081-234-5678",
  email: null,
  enrolledAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z"
};

describe("loyalty earning components", () => {
  it("explains when no earning rule is active", () => {
    render(
      <LoyaltyEarningEligibility rule={null} eligibleAmount={25} eligibleBeverageCount={3} />
    );

    expect(
      screen.getByText("This customer will not earn points because no earning rule is active.")
    ).toBeInTheDocument();
  });

  it("shows the remaining amount or beverage quantity needed to earn points", () => {
    const { rerender } = render(
      <LoyaltyEarningEligibility
        rule={{ id: "rule-amount", earningType: "purchase_amount", amountThreshold: "10.00", beverageCountThreshold: null, pointsAwarded: 1, active: true, effectiveAt: "2026-07-01T00:00:00.000Z", retiredAt: null }}
        eligibleAmount={4.5}
        eligibleBeverageCount={2}
      />
    );
    expect(
      screen.getByText("Add $5.50 more eligible purchase amount to earn 1 point.")
    ).toBeInTheDocument();

    rerender(
      <LoyaltyEarningEligibility
        rule={{ id: "rule-beverage", earningType: "beverage_count", amountThreshold: null, beverageCountThreshold: 3, pointsAwarded: 2, active: true, effectiveAt: "2026-07-01T00:00:00.000Z", retiredAt: null }}
        eligibleAmount={4.5}
        eligibleBeverageCount={2}
      />
    );
    expect(
      screen.getByText("Add 1 more eligible beverage to earn 2 points.")
    ).toBeInTheDocument();
  });

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
    expect(screen.getByText("2026-07-01 #17 | Earned from order #17.")).toBeInTheDocument();
  });

  it("identifies redeemed and returned reward snapshots in point history", () => {
    render(
      <LoyaltyCustomerProfile
        customer={customer}
        onSave={vi.fn()}
        points={{
          customer,
          asOfBusinessDate: "2026-07-01",
          summary: { available: 10, lifetimeEarned: 10, redeemed: 5, returned: 5, expired: 0, adjusted: 0 },
          history: [
            {
              id: "redeemed-1",
              eventType: "redeemed",
              pointsDelta: -5,
              reason: "Redeemed the original reward snapshot.",
              businessDate: null,
              expirationBusinessDate: null,
              orderId: "order-1",
              orderLabel: "2026-07-01 #17",
              rewardName: "Free beverage",
              occurredAt: "2026-07-01T09:05:00.000Z"
            },
            {
              id: "returned-1",
              eventType: "returned",
              pointsDelta: 5,
              reason: "Returned after reward cancellation.",
              businessDate: "2026-07-01",
              expirationBusinessDate: "2026-10-31",
              orderId: "order-1",
              orderLabel: "2026-07-01 #17",
              rewardName: "Free beverage",
              occurredAt: "2026-07-01T09:15:00.000Z"
            }
          ]
        }}
      />
    );

    expect(
      screen.getByText("Free beverage | 2026-07-01 #17 | Redeemed the original reward snapshot.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Free beverage | 2026-07-01 #17 | Returned after reward cancellation. | Expires: 2026-10-31"
      )
    ).toBeInTheDocument();
  });
});
