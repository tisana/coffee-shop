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

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "/api";
    this.fetcher = options.fetcher ?? fetch;
  }

  async request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init.headers
      },
      ...init
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
}

export const apiClient = new ApiClient();

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
