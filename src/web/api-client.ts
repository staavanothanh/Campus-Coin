import type { ApiError, PageMeta } from './types.js';

/**
 * Typed error thrown by API request helpers.
 * Provides semantic accessors for common HTTP error categories
 * defined in the OpenAPI contract.
 */
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiError: ApiError | null,
    public readonly retryAfter: number | null = null,
  ) {
    super(apiError?.message ?? `HTTP_${status}`);
    this.name = 'ApiRequestError';
  }

  get isUnauthorized(): boolean { return this.status === 401; }
  get isAccountDisabled(): boolean { return this.status === 403 && this.apiError?.code === 'ACCOUNT_DISABLED'; }
  get isCsrfError(): boolean { return this.status === 403 && this.apiError?.code === 'CSRF_ERROR'; }
  get isForbidden(): boolean { return this.status === 403; }
  get isNotFound(): boolean { return this.status === 404; }
  get isIdempotencyConflict(): boolean { return this.status === 409 && this.apiError?.code === 'IDEMPOTENCY_CONFLICT'; }
  get isConflict(): boolean { return this.status === 409; }
  get isValidationError(): boolean { return this.status === 422; }
  get isRateLimited(): boolean { return this.status === 429; }
  get isServerError(): boolean { return this.status >= 500; }
}

/** Handler called when any API request receives 401. */
let onUnauthorized: (() => void) | null = null;

/** Register a callback invoked on 401 from any API request. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

async function parseErrorBody(response: Response): Promise<ApiError | null> {
  try {
    const body = await response.json() as { error?: ApiError };
    return body.error ?? null;
  } catch {
    return null;
  }
}

/**
 * Low-level fetch wrapper: adds credentials, checks status, parses errors.
 * Returns the Response on success; throws ApiRequestError on failure.
 */
async function rawRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const apiError = await parseErrorBody(response);
    const retryHeader = response.headers.get('Retry-After');

    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }

    throw new ApiRequestError(
      response.status,
      apiError,
      retryHeader ? parseInt(retryHeader, 10) : null,
    );
  }

  return response;
}

// --- Typed request helpers ---

/** GET that unwraps { data: T } envelope. */
export async function apiGet<T>(path: string): Promise<T> {
  const response = await rawRequest(path);
  if (response.status === 204) return undefined as T;
  const body = await response.json() as { data: T };
  return body.data;
}

/** GET that returns { data: T[], meta: PageMeta } for paginated endpoints. */
export async function apiGetPaged<T>(path: string): Promise<{ data: T[]; meta: PageMeta }> {
  const response = await rawRequest(path);
  return await response.json() as { data: T[]; meta: PageMeta };
}

/** POST that unwraps { data: T } envelope. */
export async function apiPost<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await rawRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json() as { data: T };
  return result.data;
}

/** PATCH that unwraps { data: T } envelope. */
export async function apiPatch<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await rawRequest(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json() as { data: T };
  return result.data;
}

/** PUT that unwraps { data: T } envelope. */
export async function apiPut<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await rawRequest(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json() as { data: T };
  return result.data;
}
