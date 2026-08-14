import "@testing-library/jest-dom/vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffUser } from "@coffee-shop/shared/domain/types";

import { ApiClientError } from "../services/apiClient";
import { getCurrentSession, login } from "../services/authApi";
import { LoginPage } from "./LoginPage";

vi.mock("../services/authApi", () => ({
  getCurrentSession: vi.fn(),
  login: vi.fn(),
}));

const staff: StaffUser = {
  id: "staff-1",
  username: "barista",
  displayName: "Demo Barista",
  authorizationStatus: "authorized",
};

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(login).mockResolvedValue(undefined);
    vi.mocked(getCurrentSession).mockResolvedValue(staff);
  });

  it("renders the service sign-in form and submits valid credentials", async () => {
    const onSessionStarted = vi.fn();

    render(<LoginPage onSessionStarted={onSessionStarted} />);

    const main = screen.getByRole("main");
    expect(
      within(main).getByRole("heading", { name: "Sign in for service" }),
    ).toBeInTheDocument();

    fireEvent.change(within(main).getByLabelText("Username"), {
      target: { value: "dana" },
    });
    fireEvent.change(within(main).getByLabelText("Password"), {
      target: { value: "espresso-pass" },
    });
    fireEvent.click(within(main).getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        username: "dana",
        password: "espresso-pass",
      });
      expect(getCurrentSession).toHaveBeenCalledTimes(1);
      expect(onSessionStarted).toHaveBeenCalledWith(staff);
    });
  });

  it("disables submission while login is pending and completes the session callback", async () => {
    const onSessionStarted = vi.fn();
    let resolveLogin: (() => void) | undefined;
    vi.mocked(login).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        }),
    );

    render(<LoginPage onSessionStarted={onSessionStarted} />);

    const main = screen.getByRole("main");
    const submit = within(main).getByRole("button", { name: "Sign in" });
    fireEvent.click(submit);

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent("Signing in");
    expect(getCurrentSession).not.toHaveBeenCalled();

    expect(resolveLogin).toBeDefined();
    resolveLogin?.();

    await waitFor(() => expect(onSessionStarted).toHaveBeenCalledWith(staff));
    expect(submit).not.toBeDisabled();
    expect(submit).toHaveTextContent("Sign in");
  });

  it("shows rejected login accessibly and restores the form controls", async () => {
    const onSessionStarted = vi.fn();
    vi.mocked(login).mockRejectedValueOnce(
      new ApiClientError(401, "Invalid staff credentials."),
    );

    render(<LoginPage onSessionStarted={onSessionStarted} />);

    const main = screen.getByRole("main");
    const submit = within(main).getByRole("button", { name: "Sign in" });
    fireEvent.click(submit);

    const error = await waitFor(() => {
      const errorParagraph = within(main)
        .getAllByRole("paragraph")
        .find(
          (paragraph) => paragraph.textContent === "Invalid staff credentials.",
        );
      if (!errorParagraph) {
        throw new Error("Rejected login error paragraph has not rendered.");
      }
      return errorParagraph;
    });
    expect(error).toHaveTextContent("Invalid staff credentials.");
    expect(error).toBeVisible();
    expect(submit).not.toBeDisabled();
    expect(submit).toHaveTextContent("Sign in");
    expect(onSessionStarted).not.toHaveBeenCalled();
    expect(getCurrentSession).not.toHaveBeenCalled();
  });
});
