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
});
