import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createStaffSession, SESSION_TTL_MS, STAFF_SESSION_COOKIE } from "../../src/auth/sessions";
import { createApp } from "../../src/app";
import { db } from "../../src/storage/db";
import { staffUsers } from "../../src/storage/schema";
import { createTestStaff } from "./testFixtures";

function parseCookieAttributes(setCookie: string): Map<string, string | true> {
  const [, ...attributes] = setCookie.split(";").map((part) => part.trim());
  const parsed = new Map<string, string | true>();

  for (const attribute of attributes) {
    const [name, value] = attribute.split("=");
    if (!name) {
      continue;
    }
    parsed.set(name.toLowerCase(), value ?? true);
  }

  return parsed;
}

function getSetCookieHeaders(header: string | string[] | undefined): string[] {
  if (!header) {
    return [];
  }

  return Array.isArray(header) ? header : [header];
}

describe("Phase 8 auth security hardening", () => {
  async function getCsrfToken(agent: ReturnType<typeof request.agent>): Promise<string> {
    const response = await agent.get("/auth/csrf-token");

    expect(response.status).toBe(200);
    expect(response.body.csrfToken).toEqual(expect.any(String));

    return response.body.csrfToken as string;
  }

  it("sets the staff session cookie with http-only, same-site, max-age, and path constraints", async () => {
    const { staff, password } = await createTestStaff();
    const agent = request.agent(createApp());
    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .post("/auth/login")
      .set("X-CSRF-Token", csrfToken)
      .send({
        username: staff.username,
        password
      });

    expect(response.status).toBe(204);
    const sessionCookie = getSetCookieHeaders(response.headers["set-cookie"]).find((cookie) =>
      cookie.startsWith(`${STAFF_SESSION_COOKIE}=`)
    );

    expect(sessionCookie).toBeDefined();
    const attributes = parseCookieAttributes(sessionCookie as string);
    expect(attributes.get("httponly")).toBe(true);
    expect(attributes.get("samesite")).toBe("Lax");
    expect(attributes.get("path")).toBe("/");
    expect(Number(attributes.get("max-age"))).toBe(Math.floor(SESSION_TTL_MS / 1000));
  });

  it("rejects tampered or inactive staff sessions before route handlers run", async () => {
    const { staff } = await createTestStaff();
    const session = await createStaffSession(staff.id);

    await db
      .update(staffUsers)
      .set({ authorizationStatus: "inactive" })
      .where(eq(staffUsers.id, staff.id));

    const inactiveResponse = await request(createApp())
      .get("/staff/session")
      .set("Cookie", `${STAFF_SESSION_COOKIE}=${session.token}`);

    expect(inactiveResponse.status).toBe(401);
    expect(inactiveResponse.body).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Staff authorization required."
    });

    const tamperedResponse = await request(createApp())
      .get("/staff/session")
      .set("Cookie", `${STAFF_SESSION_COOKIE}=tampered-${session.token}`);

    expect(tamperedResponse.status).toBe(401);
    expect(tamperedResponse.body).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Staff authorization required."
    });
  });

  it("requires an authorized staff session for every loyalty read and mutation", async () => {
    const app = createApp();
    const anonymousAgent = request.agent(app);
    const csrfToken = await getCsrfToken(anonymousAgent);
    const customerId = "0a1b2c3d-4e5f-4000-8000-000000000001";
    const rewardId = "0a1b2c3d-4e5f-4000-8000-000000000005";
    const orderId = "0a1b2c3d-4e5f-4000-8000-000000000006";
    const redemptionId = "0a1b2c3d-4e5f-4000-8000-000000000008";
    const reads = [
      "/loyalty/phone-region",
      "/loyalty/customers?query=Ari",
      `/loyalty/customers/${customerId}`,
      `/loyalty/customers/${customerId}/points`,
      "/loyalty/config/earning-rule",
      "/loyalty/config/expiration-policy",
      "/loyalty/rewards"
    ];
    const mutations = [
      { method: "post", path: "/loyalty/customers" },
      { method: "patch", path: `/loyalty/customers/${customerId}` },
      { method: "put", path: "/loyalty/config/earning-rule" },
      { method: "put", path: "/loyalty/config/expiration-policy" },
      { method: "post", path: "/loyalty/rewards" },
      { method: "patch", path: `/loyalty/rewards/${rewardId}` },
      { method: "post", path: "/orders" },
      { method: "post", path: `/orders/${orderId}/loyalty-rewards/${redemptionId}/cancel` }
    ] as const;

    for (const path of reads) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(401);
      expect(response.body, path).toMatchObject({ code: "UNAUTHORIZED" });
    }

    for (const mutation of mutations) {
      const response = await anonymousAgent[mutation.method](mutation.path)
        .set("X-CSRF-Token", csrfToken)
        .send({});
      expect(response.status, `${mutation.method.toUpperCase()} ${mutation.path}`).toBe(401);
      expect(response.body, mutation.path).toMatchObject({ code: "UNAUTHORIZED" });
    }
  });

  it("requires a valid CSRF token for every authenticated loyalty mutation", async () => {
    const { staff, password } = await createTestStaff();
    const agent = request.agent(createApp());
    const csrfToken = await getCsrfToken(agent);
    await agent
      .post("/auth/login")
      .set("X-CSRF-Token", csrfToken)
      .send({ username: staff.username, password })
      .expect(204);

    const customerId = "0a1b2c3d-4e5f-4000-8000-000000000001";
    const rewardId = "0a1b2c3d-4e5f-4000-8000-000000000005";
    const orderId = "0a1b2c3d-4e5f-4000-8000-000000000006";
    const redemptionId = "0a1b2c3d-4e5f-4000-8000-000000000008";
    const mutations = [
      { method: "post", path: "/loyalty/customers" },
      { method: "patch", path: `/loyalty/customers/${customerId}` },
      { method: "put", path: "/loyalty/config/earning-rule" },
      { method: "put", path: "/loyalty/config/expiration-policy" },
      { method: "post", path: "/loyalty/rewards" },
      { method: "patch", path: `/loyalty/rewards/${rewardId}` },
      { method: "post", path: "/orders" },
      { method: "post", path: `/orders/${orderId}/loyalty-rewards/${redemptionId}/cancel` }
    ] as const;

    for (const mutation of mutations) {
      const response = await agent[mutation.method](mutation.path).send({});
      expect(response.status, `${mutation.method.toUpperCase()} ${mutation.path}`).toBe(403);
      expect(response.body, mutation.path).toMatchObject({
        code: "FORBIDDEN",
        message: "Invalid or missing CSRF token."
      });
    }
  });
});
