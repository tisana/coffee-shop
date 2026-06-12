import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app";

describe("Express app foundation", () => {
  async function getCsrfToken(agent: ReturnType<typeof request.agent>): Promise<string> {
    const response = await agent.get("/auth/csrf-token");

    expect(response.status).toBe(200);
    expect(response.body.csrfToken).toEqual(expect.any(String));

    return response.body.csrfToken as string;
  }

  it("responds to health checks", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("returns an auth error for a protected staff session route without a cookie", async () => {
    const response = await request(createApp()).get("/staff/session");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
  });

  it("rejects unsafe requests that do not include a CSRF token", async () => {
    const response = await request(createApp()).post("/auth/logout").send();

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: "FORBIDDEN",
      message: "Invalid or missing CSRF token."
    });
  });

  it("rate limits repeated login attempts before credential checks", async () => {
    const agent = request.agent(createApp());
    const csrfToken = await getCsrfToken(agent);
    let lastResponse: request.Response | undefined;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      lastResponse = await agent
        .post("/auth/login")
        .set("X-CSRF-Token", csrfToken)
        .send({
          username: "",
          password: ""
        });
    }

    expect(lastResponse?.status).toBe(429);
    expect(lastResponse?.body).toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: "Too many login attempts. Try again later."
    });
  });
});
