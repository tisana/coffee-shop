import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { StaffUser } from "@coffee-shop/shared/domain/types";

import { App } from "./App";
import { getCurrentSession, logout } from "./services/authApi";

vi.mock("./pages/CounterOrderPage", () => ({
  CounterOrderPage: () => <section aria-label="Counter order page" />
}));

vi.mock("./pages/BrewQueuePage", () => ({
  BrewQueuePage: () => <section aria-label="Orders page" />
}));

vi.mock("./pages/DailyActivityPage", () => ({
  DailyActivityPage: () => <section aria-label="History page" />
}));

vi.mock("./pages/LoginPage", () => ({
  LoginPage: () => <section aria-label="Login page" />
}));

vi.mock("./pages/MenuMaintenancePage", () => ({
  MenuMaintenancePage: () => <section aria-label="Menu page" />
}));

vi.mock("./pages/ReportsPage", () => ({
  ReportsPage: () => <section aria-label="Reports page" />
}));

vi.mock("./services/authApi", () => ({
  getCurrentSession: vi.fn(),
  logout: vi.fn()
}));

const staff: StaffUser = {
  id: "staff-1",
  username: "dana",
  displayName: "Dana Barista",
  authorizationStatus: "authorized"
};

beforeEach(() => {
  window.location.hash = "";
  vi.mocked(getCurrentSession).mockResolvedValue(staff);
  vi.mocked(logout).mockResolvedValue();
});

test("staff shell shows the requested navigation order without an unused top navigation toggle", async () => {
  render(<App />);

  const nav = await screen.findByLabelText("Staff navigation");
  expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual([
    "Counter Order",
    "Orders",
    "History",
    "Menu",
    "Reports",
    "Customers",
    "Staff",
    "Inventory",
    "Settings"
  ]);
  expect(screen.queryByRole("button", { name: "Toggle navigation" })).not.toBeInTheDocument();
});

test("staff shell renders ReportsPage from the existing reports sidebar route", async () => {
  window.location.hash = "#reports";

  render(<App />);

  expect(await screen.findByLabelText("Reports page")).toBeInTheDocument();
  expect(screen.queryByText("Planned")).not.toBeInTheDocument();
});
