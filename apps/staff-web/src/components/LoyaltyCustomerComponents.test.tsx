import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LoyaltyCustomer } from "@coffee-shop/shared/domain/types";

import { LoyaltyCustomerPicker } from "./LoyaltyCustomerPicker";
import { LoyaltyCustomerProfile } from "./LoyaltyCustomerProfile";

const customer: LoyaltyCustomer = {
  id: "0a1b2c3d-4e5f-4000-8000-000000000001",
  name: "Ari Srisuk",
  phone: "081-234-5678",
  email: null,
  enrolledAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z"
};

describe("loyalty customer staff components", () => {
  it("searches customers and registers a new customer without requiring email", async () => {
    const onSelect = vi.fn();
    const onRegister = vi.fn().mockResolvedValue(customer);
    const searchCustomers = vi.fn().mockResolvedValue([customer]);

    render(
      <LoyaltyCustomerPicker
        selectedCustomer={null}
        searchCustomers={searchCustomers}
        onSelect={onSelect}
        onClear={vi.fn()}
        onRegister={onRegister}
      />
    );

    fireEvent.change(screen.getByLabelText("Search customers"), { target: { value: "081" } });
    await screen.findByText("Ari Srisuk");
    fireEvent.click(screen.getByRole("button", { name: "Select Ari Srisuk" }));
    expect(onSelect).toHaveBeenCalledWith(customer);

    fireEvent.click(screen.getByRole("button", { name: "Register customer" }));
    fireEvent.change(screen.getByLabelText("Customer name"), { target: { value: "Nina" } });
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "081-234-5678" } });
    fireEvent.click(screen.getByRole("button", { name: "Save customer" }));

    expect(onRegister).toHaveBeenCalledWith({ name: "Nina", phone: "081-234-5678", email: null });
  });

  it("shows lookup loading and empty states, and clears a selected customer", async () => {
    const onClear = vi.fn();
    let resolveSearch!: (customers: LoyaltyCustomer[]) => void;
    const searchCustomers = vi.fn(
      () => new Promise<LoyaltyCustomer[]>((resolve) => { resolveSearch = resolve; })
    );

    render(
      <LoyaltyCustomerPicker
        selectedCustomer={customer}
        searchCustomers={searchCustomers}
        onSelect={vi.fn()}
        onClear={onClear}
        onRegister={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Search customers"), { target: { value: "Unknown" } });
    expect(await screen.findByText("Searching customers.")).toBeInTheDocument();
    resolveSearch!([]);
    expect(await screen.findByText("No customers match that lookup.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("edits the customer profile while retaining the existing customer id", async () => {
    const onSave = vi.fn().mockResolvedValue({ ...customer, phone: "082-234-5678" });

    render(<LoyaltyCustomerProfile customer={customer} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit customer" }));
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "082-234-5678" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSave).toHaveBeenCalledWith(customer.id, {
      name: "Ari Srisuk",
      phone: "082-234-5678",
      email: null
    });
  });

  it("keeps the edit form open and shows a phone conflict returned by the API", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Phone number already belongs to a customer."));

    render(<LoyaltyCustomerProfile customer={customer} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Phone number already belongs to a customer.")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
  });
});
