import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoyaltyProgramSettings } from "./LoyaltyProgramSettings";
import { LoyaltyCustomerProfile } from "./LoyaltyCustomerProfile";
import { loyaltyCustomer, loyaltyExpirationPolicy, loyaltyPointsResponse } from "../test/loyaltyTestData";

describe("loyalty expiration components", () => {
  it("saves a calendar-month expiration policy and explains its active cutoff", async () => {
    const onSaveExpiration = vi.fn().mockResolvedValue(loyaltyExpirationPolicy());
    render(<LoyaltyProgramSettings rule={null} onSave={vi.fn()} expirationPolicy={null} onSaveExpiration={onSaveExpiration} />);

    fireEvent.click(screen.getByRole("radio", { name: "Expire points" }));
    fireEvent.change(screen.getByLabelText("Expiration months"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Save expiration policy" }));

    expect(onSaveExpiration).toHaveBeenCalledWith({ enabled: true, expirationMonths: 3 });
    expect(await screen.findByText("Points earned in July 2026 remain valid through October 31, 2026.")).toBeInTheDocument();
  });

  it("renders expired totals and expiration dates distinctly in customer history", () => {
    render(<LoyaltyCustomerProfile customer={loyaltyCustomer()} onSave={vi.fn()} points={loyaltyPointsResponse({ summary: { available: 0, expired: 2 }, history: [{ id: "expired-1", eventType: "expired", pointsDelta: -2, reason: "Points expired.", businessDate: "2026-11-01", expirationBusinessDate: "2026-10-31", orderId: null, orderLabel: null, rewardName: null, occurredAt: "2026-11-01T00:00:00.000Z" }] })} />);

    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("Expires: 2026-10-31");
    expect(screen.getByText("-2 points")).toBeInTheDocument();
  });
});
