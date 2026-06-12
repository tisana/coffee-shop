export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private csrfToken?: string;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "/api";
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  async request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");

    if (isUnsafeMethod(init.method)) {
      headers.set("X-CSRF-Token", await this.getCsrfToken());
    }

    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers
    });

    if (!response.ok) {
      const body = await readJsonSafely(response);
      throw new ApiClientError(
        response.status,
        body?.message ?? `Request failed with status ${response.status}`,
        body?.code,
        body?.details
      );
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  }

  private async getCsrfToken(): Promise<string> {
    if (this.csrfToken) {
      return this.csrfToken;
    }

    const response = await this.fetcher(`${this.baseUrl}/auth/csrf-token`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new ApiClientError(response.status, "Unable to prepare request.");
    }

    const body = (await response.json()) as { csrfToken?: unknown };

    if (typeof body.csrfToken !== "string" || body.csrfToken.length === 0) {
      throw new ApiClientError(response.status, "CSRF token response was invalid.");
    }

    this.csrfToken = body.csrfToken;
    return this.csrfToken;
  }
}

export const apiClient = new ApiClient();

function isUnsafeMethod(method: string | undefined): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes((method ?? "GET").toUpperCase());
}

async function readJsonSafely(response: Response): Promise<
  | {
      code?: string;
      message?: string;
      details?: unknown;
    }
  | undefined
> {
  try {
    return (await response.json()) as { code?: string; message?: string; details?: unknown };
  } catch {
    return undefined;
  }
}
