import { describe, expect, it, vi } from "vitest";

import { ApiClient, ApiClientError } from "./apiClient";

function response(body: unknown, status = 200, json = true): Response {
  const payload = body === undefined ? null : json ? JSON.stringify(body) : String(body);
  return new Response(payload, { status });
}

function clientFor(fetcher: typeof fetch): ApiClient {
  return new ApiClient({ baseUrl: "/api", fetcher });
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("Expected request to reject.");
    },
    (error: unknown) => error
  );
}

describe("ApiClient", () => {
  it("sends a safe GET without requesting a CSRF token", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ categories: [] }));
    const client = clientFor(fetcher);

    await expect(
      client.request("/menu/categories", {
        method: "GET",
        headers: { "Content-Type": "application/vnd.coffee-shop+json" }
      })
    ).resolves.toEqual({ categories: [] });

    expect(fetcher).toHaveBeenCalledWith("/api/menu/categories", {
      credentials: "include",
      headers: expect.any(Headers),
      method: "GET"
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    const requestHeaders = new Headers(fetcher.mock.calls[0]?.[1]?.headers);
    expect(requestHeaders.get("Content-Type")).toBe("application/vnd.coffee-shop+json");
    expect(requestHeaders.has("X-CSRF-Token")).toBe(false);
  });

  it("fetches and caches a CSRF token for unsafe requests", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ csrfToken: "csrf-token-123" }))
      .mockResolvedValueOnce(response({ id: "order-1" }))
      .mockResolvedValueOnce(response({ id: "order-1", status: "queued" }));
    const client = clientFor(fetcher);

    await client.request("/orders", { method: "POST", body: '{"items":[]}' });
    await client.request("/orders/order-1", { method: "PATCH", body: '{"status":"queued"}' });

    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/auth/csrf-token",
      "/api/orders",
      "/api/orders/order-1"
    ]);
    expect(fetcher.mock.calls[0]?.[1]).toEqual({
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    const firstUnsafeHeaders = new Headers(fetcher.mock.calls[1]?.[1]?.headers);
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      body: '{"items":[]}',
      credentials: "include",
      method: "POST"
    });
    expect(firstUnsafeHeaders.get("X-CSRF-Token")).toBe("csrf-token-123");

    const secondUnsafeHeaders = new Headers(fetcher.mock.calls[2]?.[1]?.headers);
    expect(fetcher.mock.calls[2]?.[1]).toMatchObject({
      body: '{"status":"queued"}',
      credentials: "include",
      method: "PATCH"
    });
    expect(secondUnsafeHeaders.get("X-CSRF-Token")).toBe("csrf-token-123");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("resolves successful 204 responses to undefined", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(undefined, 204));
    const client = clientFor(fetcher);

    await expect(client.request("/auth/session")).resolves.toBeUndefined();
  });

  it("maps structured JSON errors to ApiClientError", async () => {
    const details = { currentStatus: "in_progress" };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response(
        {
          code: "ORDER_CONFLICT",
          message: "The order changed before this request completed.",
          details
        },
        409
      )
    );
    const client = clientFor(fetcher);

    const error = await rejectionOf(client.request("/orders/order-1"));

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 409,
      code: "ORDER_CONFLICT",
      message: "The order changed before this request completed.",
      details
    });
  });

  it("uses the documented fallback message for non-JSON errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response("Bad gateway", 502, false));
    const client = clientFor(fetcher);

    const error = await rejectionOf(client.request("/menu/categories"));

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 502,
      code: undefined,
      message: "Request failed with status 502",
      details: undefined
    });
  });

  it.each([
    {
      caseName: "failed",
      csrfResponse: response({ message: "Service unavailable" }, 503),
      expectedStatus: 503,
      expectedMessage: "Unable to prepare request."
    },
    {
      caseName: "malformed",
      csrfResponse: response({ csrfToken: "" }),
      expectedStatus: 200,
      expectedMessage: "CSRF token response was invalid."
    }
  ])(
    "prevents an unsafe application request when the CSRF response is $caseName",
    async ({ csrfResponse, expectedStatus, expectedMessage }) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(csrfResponse);
      const client = clientFor(fetcher);

      const error = await rejectionOf(
        client.request("/orders", { method: "POST", body: '{"items":[]}' })
      );

      expect(error).toBeInstanceOf(ApiClientError);
      expect(error).toMatchObject({ status: expectedStatus, message: expectedMessage });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledWith("/api/auth/csrf-token", {
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
    }
  );
});
