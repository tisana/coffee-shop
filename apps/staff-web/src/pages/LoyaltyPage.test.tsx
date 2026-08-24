import "@testing-library/jest-dom/vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loyaltyCustomer,
  loyaltyPointsResponse,
  loyaltyRewardOptions,
} from "../test/loyaltyTestData";
import {
  createLoyaltyCustomer,
  getLoyaltyEarningRule,
  getLoyaltyExpirationPolicy,
  getLoyaltyPhoneRegion,
  getLoyaltyPoints,
  getLoyaltyRewards,
  searchLoyaltyCustomers,
} from "../services/loyaltyApi";
import { LoyaltyPage } from "./LoyaltyPage";

vi.mock("../services/loyaltyApi", () => ({
  createLoyaltyCustomer: vi.fn(),
  createLoyaltyReward: vi.fn(),
  getLoyaltyEarningRule: vi.fn(),
  getLoyaltyExpirationPolicy: vi.fn(),
  getLoyaltyPhoneRegion: vi.fn(),
  getLoyaltyPoints: vi.fn(),
  getLoyaltyRewards: vi.fn(),
  replaceLoyaltyEarningRule: vi.fn(),
  replaceLoyaltyExpirationPolicy: vi.fn(),
  searchLoyaltyCustomers: vi.fn(),
  updateLoyaltyCustomer: vi.fn(),
  updateLoyaltyReward: vi.fn(),
}));

describe("LoyaltyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLoyaltyPhoneRegion).mockResolvedValue({ region: "TH" });
    vi.mocked(getLoyaltyEarningRule).mockResolvedValue(null);
    vi.mocked(getLoyaltyExpirationPolicy).mockResolvedValue(null);
    vi.mocked(getLoyaltyRewards).mockResolvedValue([]);
  });

  it("shows the initial empty profile state before a customer is selected", () => {
    render(<LoyaltyPage />);

    const page = screen.getByRole("region", { name: "Loyalty" });
    expect(
      within(page).getByText("Select a customer to view the profile.", {
        exact: true,
      }),
    ).toBeInTheDocument();
    expect(
      within(page).queryByRole("region", { name: "Customer profile" }),
    ).not.toBeInTheDocument();
  });

  it("registers a customer through the page boundary and opens the profile", async () => {
    const customer = loyaltyCustomer({
      name: "Nok Prasert",
      phone: "082-555-0188",
      email: "nok@example.test",
    });
    vi.mocked(createLoyaltyCustomer).mockResolvedValue(customer);
    vi.mocked(getLoyaltyPoints).mockResolvedValue(
      loyaltyPointsResponse({ customer }),
    );

    render(<LoyaltyPage />);

    const page = screen.getByRole("region", { name: "Loyalty" });
    const lookup = within(page).getByRole("region", {
      name: "Customer lookup",
    });
    fireEvent.click(
      within(lookup).getByRole("button", { name: "Register customer" }),
    );
    fireEvent.change(within(lookup).getByLabelText("Customer name"), {
      target: { value: customer.name },
    });
    fireEvent.change(within(lookup).getByLabelText("Phone number"), {
      target: { value: customer.phone },
    });
    fireEvent.change(within(lookup).getByLabelText("Email address"), {
      target: { value: customer.email },
    });
    fireEvent.click(
      within(lookup).getByRole("button", { name: "Save customer" }),
    );

    await waitFor(() => {
      expect(createLoyaltyCustomer).toHaveBeenCalledWith({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      });
    });
    expect(
      await within(page).findByRole("region", { name: "Customer profile" }),
    ).toBeInTheDocument();
    expect(
      within(page).getByRole("heading", { name: customer.name }),
    ).toBeInTheDocument();
  });

  it("searches for a customer and renders the populated profile, points history, and rewards", async () => {
    const customer = loyaltyCustomer({ email: "ari@example.test" });
    vi.mocked(searchLoyaltyCustomers).mockResolvedValue([customer]);
    vi.mocked(getLoyaltyPoints).mockResolvedValue(
      loyaltyPointsResponse({ customer }),
    );
    vi.mocked(getLoyaltyRewards).mockResolvedValue(loyaltyRewardOptions());

    render(<LoyaltyPage />);

    const page = screen.getByRole("region", { name: "Loyalty" });
    const lookup = within(page).getByRole("region", {
      name: "Customer lookup",
    });
    fireEvent.change(within(lookup).getByLabelText("Search customers"), {
      target: { value: customer.name },
    });

    const selectCustomer = await within(lookup).findByRole("button", {
      name: `Select ${customer.name}`,
    });
    fireEvent.click(selectCustomer);

    const profile = await within(page).findByRole("region", {
      name: "Customer profile",
    });
    expect(
      within(profile).getByRole("heading", { name: customer.name }),
    ).toBeInTheDocument();
    expect(within(profile).getByText(customer.phone)).toBeInTheDocument();
    expect(within(profile).getByText("ari@example.test")).toBeInTheDocument();

    await waitFor(() => {
      expect(getLoyaltyPoints).toHaveBeenCalledWith(customer.id);
    });
    const pointHistory = within(profile).getByRole("region", {
      name: "Point history",
    });
    expect(
      within(pointHistory).getByText("Available points"),
    ).toBeInTheDocument();
    expect(within(pointHistory).getByText("+12 points")).toBeInTheDocument();
    expect(
      within(pointHistory).getByText(/2026-07-01 #17 \| Earned from order #17/),
    ).toBeInTheDocument();

    const rewards = within(page).getByRole("region", {
      name: "Reward settings",
    });
    const rewardList = within(rewards).getByRole("list");
    expect(
      within(rewardList).getByText("Free beverage", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(rewardList).getByText("Size upgrade", { exact: true }),
    ).toBeInTheDocument();
  });

  it("shows an empty search and removes stale points after a later customer lookup fails", async () => {
    const firstCustomer = loyaltyCustomer();
    const secondCustomer = loyaltyCustomer({
      id: "0a1b2c3d-4e5f-4000-8000-000000000002",
      name: "Mali Chen",
      phone: "089-876-5432",
      email: "mali@example.test",
    });
    vi.mocked(searchLoyaltyCustomers)
      .mockResolvedValueOnce([firstCustomer])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([secondCustomer]);
    vi.mocked(getLoyaltyPoints)
      .mockResolvedValueOnce(loyaltyPointsResponse({ customer: firstCustomer }))
      .mockRejectedValueOnce(new Error("Unable to load loyalty points."));

    render(<LoyaltyPage />);

    const page = screen.getByRole("region", { name: "Loyalty" });
    const lookup = within(page).getByRole("region", {
      name: "Customer lookup",
    });
    const search = within(lookup).getByLabelText("Search customers");

    fireEvent.change(search, { target: { value: firstCustomer.name } });
    fireEvent.click(
      await within(lookup).findByRole("button", {
        name: `Select ${firstCustomer.name}`,
      }),
    );
    const firstProfile = await within(page).findByRole("region", {
      name: "Customer profile",
    });
    await within(firstProfile).findByRole("region", { name: "Point history" });

    fireEvent.change(search, { target: { value: "Unknown customer" } });
    expect(
      await within(lookup).findByText("No customers match that lookup."),
    ).toBeInTheDocument();

    fireEvent.change(search, { target: { value: secondCustomer.name } });
    fireEvent.click(
      await within(lookup).findByRole("button", {
        name: `Select ${secondCustomer.name}`,
      }),
    );

    const secondProfile = await within(page).findByRole("region", {
      name: "Customer profile",
    });
    await waitFor(() => {
      expect(getLoyaltyPoints).toHaveBeenLastCalledWith(secondCustomer.id);
      expect(
        within(secondProfile).queryByRole("region", { name: "Point history" }),
      ).not.toBeInTheDocument();
    });
    expect(
      within(secondProfile).queryByText("+12 points"),
    ).not.toBeInTheDocument();
    expect(
      within(page).queryByRole("heading", { name: firstCustomer.name }),
    ).not.toBeInTheDocument();
    expect(
      within(secondProfile).getByRole("heading", { name: secondCustomer.name }),
    ).toBeInTheDocument();
  });
});
