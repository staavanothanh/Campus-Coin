/**
 * Typed error thrown by API request helpers.
 * Provides semantic accessors for common HTTP error categories
 * defined in the OpenAPI contract.
 */
export class ApiRequestError extends Error {
    status;
    apiError;
    retryAfter;
    constructor(status, apiError, retryAfter = null) {
        super(apiError?.message ?? `HTTP_${status}`);
        this.status = status;
        this.apiError = apiError;
        this.retryAfter = retryAfter;
        this.name = 'ApiRequestError';
    }
    get isUnauthorized() { return this.status === 401; }
    get isAccountDisabled() { return this.status === 403 && this.apiError?.code === 'ACCOUNT_DISABLED'; }
    get isCsrfError() { return this.status === 403 && this.apiError?.code === 'CSRF_ERROR'; }
    get isForbidden() { return this.status === 403; }
    get isNotFound() { return this.status === 404; }
    get isIdempotencyConflict() { return this.status === 409 && this.apiError?.code === 'IDEMPOTENCY_CONFLICT'; }
    get isConflict() { return this.status === 409; }
    get isValidationError() { return this.status === 422; }
    get isRateLimited() { return this.status === 429; }
    get isServerError() { return this.status >= 500; }
}
/** Handler called when any API request receives 401. */
let onUnauthorized = null;
/** Register a callback invoked on 401 from any API request. */
export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}
async function parseErrorBody(response) {
    try {
        const body = await response.json();
        return body.error ?? null;
    }
    catch {
        return null;
    }
}
/**
 * Low-level fetch wrapper: adds credentials, checks status, parses errors.
 * Returns the Response on success; throws ApiRequestError on failure.
 */
async function rawRequest(path, options = {}) {
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
        throw new ApiRequestError(response.status, apiError, retryHeader ? parseInt(retryHeader, 10) : null);
    }
    return response;
}
// --- Typed request helpers ---
/** GET that unwraps { data: T } envelope. */
export async function apiGet(path) {
    const response = await rawRequest(path);
    if (response.status === 204)
        return undefined;
    const body = await response.json();
    return body.data;
}
/** GET that returns { data: T[], meta: PageMeta } for paginated endpoints. */
export async function apiGetPaged(path) {
    const response = await rawRequest(path);
    return await response.json();
}
/** POST that unwraps { data: T } envelope. */
export async function apiPost(path, body, headers = {}) {
    const response = await rawRequest(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
    });
    if (response.status === 204)
        return undefined;
    const result = await response.json();
    return result.data;
}
/** PATCH that unwraps { data: T } envelope. */
export async function apiPatch(path, body, headers = {}) {
    const response = await rawRequest(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
    });
    if (response.status === 204)
        return undefined;
    const result = await response.json();
    return result.data;
}
/** PUT that unwraps { data: T } envelope. */
export async function apiPut(path, body, headers = {}) {
    const response = await rawRequest(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
    });
    if (response.status === 204)
        return undefined;
    const result = await response.json();
    return result.data;
}
//# sourceMappingURL=api-client.js.map