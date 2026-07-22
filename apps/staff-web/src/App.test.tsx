import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, within } from "@testing-library/react";
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

vi.mock("./pages/LoyaltyPage", () => ({
  LoyaltyPage: () => <section aria-label="Loyalty page" />
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
    "Loyalty",
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

test("staff shell renders LoyaltyPage from the existing customer sidebar position", async () => {
  window.location.hash = "#loyalty";

  render(<App />);

  expect(await screen.findByLabelText("Loyalty page")).toBeInTheDocument();
});

test("loyalty navigation is keyboard focusable, labelled, and exposes the active route", async () => {
  window.location.hash = "#loyalty";

  render(<App />);

  const nav = await screen.findByLabelText("Staff navigation");
  const loyaltyLink = within(nav).getByRole("link", { name: "Loyalty" });
  loyaltyLink.focus();

  expect(loyaltyLink).toHaveFocus();
  expect(loyaltyLink).toHaveAttribute("href", "#loyalty");
  expect(loyaltyLink).toHaveAttribute("aria-current", "page");
  expect(screen.getByPlaceholderText("Search menu items, orders, customers...")).toHaveAccessibleName(
    "Search staff workspace"
  );
  expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
});

test("keeps loading and empty loyalty states inside the responsive staff workspace", async () => {
  let resolveSession: ((value: StaffUser) => void) | undefined;
  vi.mocked(getCurrentSession).mockReturnValue(
    new Promise<StaffUser>((resolve) => {
      resolveSession = resolve;
    })
  );
  window.location.hash = "#loyalty";
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

  const { container } = render(<App />);

  expect(screen.getByText("Loading staff session.")).toBeInTheDocument();
  resolveSession?.(staff);
  fireEvent(window, new Event("resize"));

  expect(await screen.findByLabelText("Loyalty page")).toBeInTheDocument();
  expect(container.querySelector(".app-shell")).toBeInTheDocument();
  expect(container.querySelector(".main-panel > .topbar + .workspace")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Toggle navigation" })).not.toBeInTheDocument();
});

test("counter loyalty entry remains reachable from the same labelled shell", async () => {
  window.location.hash = "#counter";

  render(<App />);

  expect(await screen.findByLabelText("Counter order page")).toBeInTheDocument();
  const counterLink = within(screen.getByLabelText("Staff navigation")).getByRole("link", {
    name: "Counter Order"
  });
  expect(counterLink).toHaveAttribute("aria-current", "page");
});
