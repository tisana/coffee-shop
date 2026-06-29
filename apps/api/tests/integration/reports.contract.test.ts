import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const reportSession = vi.hoisted(() => ({
  token: "valid-report-session",
  staff: {
    id: "8a0d14e6-8e83-472a-9d54-595e0d8f30e1",
    username: "report-barista",
    displayName: "Report Barista",
    authorizationStatus: "authorized" as const
  }
}));

vi.mock("../../src/auth/sessions", async (importActual) => {
  const actual = await importActual<typeof import("../../src/auth/sessions")>();

  return {
    ...actual,
    getSessionCookie: vi.fn((request) => {
      const cookies = request.cookies as Record<string, string | undefined> | undefined;
      return cookies?.staff_session;
    }),
    lookupStaffSession: vi.fn(async (token: string) => {
      if (token !== reportSession.token) {
        return null;
      }

      return {
        id: reportSession.token,
        staff: reportSession.staff,
        expiresAt: new Date("2026-06-30T00:00:00.000Z")
      };
    })
  };
});

import { createApp } from "../../src/app";

const validMenuCategoryId = "1eb04d80-a0f4-4f9c-b936-cf25acbd6e85";
const validMenuItemId = "5b6eb8c6-9790-4ea5-bb5a-43c839f5d7b1";

function authorizedGet(path: "/reports/sales" | "/reports/orders") {
  return request(createApp()).get(path).set("Cookie", [`staff_session=${reportSession.token}`]);
}

describe("reports API foundation contract", () => {
  it("requires an authorized staff session for sales and supporting-order reports", async () => {
    const salesResponse = await request(createApp()).get("/reports/sales");
    const ordersResponse = await request(createApp()).get("/reports/orders");

    expect(salesResponse.status).toBe(401);
    expect(salesResponse.body).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Staff authorization required."
    });
    expect(ordersResponse.status).toBe(401);
    expect(ordersResponse.body).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Staff authorization required."
    });
  });

  it("validates shared report query parameters before planned sales responses", async () => {
    const response = await authorizedGet("/reports/sales").query({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "weekly",
      statuses: "completed,picked_up",
      menuCategoryId: validMenuCategoryId,
      menuItemId: validMenuItemId
    });

    expect(response.status).toBe(501);
    expect(response.body).toEqual({
      code: "NOT_IMPLEMENTED",
      message: "This route is planned for a later implementation phase."
    });
  });

  it("validates drill-down query parameters before planned supporting-order responses", async () => {
    const response = await authorizedGet("/reports/orders").query({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      period: "daily",
      statuses: "completed",
      periodKey: "2026-06-14",
      combinationKey: "latte:1|mocha:1",
      menuCategoryId: validMenuCategoryId,
      menuItemId: validMenuItemId
    });

    expect(response.status).toBe(501);
    expect(response.body).toEqual({
      code: "NOT_IMPLEMENTED",
      message: "This route is planned for a later implementation phase."
    });
  });

  it("rejects invalid report date ranges for both report routes", async () => {
    const salesResponse = await authorizedGet("/reports/sales").query({
      startDate: "2026-06-30",
      endDate: "2026-06-01"
    });
    const ordersResponse = await authorizedGet("/reports/orders").query({
      startDate: "2026-06-30",
      endDate: "2026-06-01"
    });

    expect(salesResponse.status).toBe(400);
    expect(salesResponse.body).toMatchObject({
      code: "BAD_REQUEST",
      message: "Request validation failed."
    });
    expect(salesResponse.body.details.fieldErrors.endDate).toContain(
      "endDate must be on or after startDate"
    );
    expect(ordersResponse.status).toBe(400);
    expect(ordersResponse.body.details.fieldErrors.endDate).toContain(
      "endDate must be on or after startDate"
    );
  });

  it("rejects unsupported period and status values", async () => {
    const response = await authorizedGet("/reports/sales").query({
      period: "quarterly",
      statuses: "completed,refunded"
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "BAD_REQUEST",
      message: "Request validation failed."
    });
    expect(response.body.details.fieldErrors.period).toBeDefined();
    expect(response.body.details.fieldErrors.statuses).toBeDefined();
  });
});
