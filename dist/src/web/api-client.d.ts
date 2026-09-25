import type { ApiError, PageMeta } from './types.js';
/**
 * Typed error thrown by API request helpers.
 * Provides semantic accessors for common HTTP error categories
 * defined in the OpenAPI contract.
 */
export declare class ApiRequestError extends Error {
    readonly status: number;
    readonly apiError: ApiError | null;
    readonly retryAfter: number | null;
    constructor(status: number, apiError: ApiError | null, retryAfter?: number | null);
    get isUnauthorized(): boolean;
    get isAccountDisabled(): boolean;
    get isCsrfError(): boolean;
    get isForbidden(): boolean;
    get isNotFound(): boolean;
    get isIdempotencyConflict(): boolean;
    get isConflict(): boolean;
    get isValidationError(): boolean;
    get isRateLimited(): boolean;
    get isServerError(): boolean;
}
/** Register a callback invoked on 401 from any API request. */
export declare function setUnauthorizedHandler(handler: () => void): void;
/** GET that unwraps { data: T } envelope. */
export declare function apiGet<T>(path: string): Promise<T>;
/** GET that returns { data: T[], meta: PageMeta } for paginated endpoints. */
export declare function apiGetPaged<T>(path: string): Promise<{
    data: T[];
    meta: PageMeta;
}>;
/** POST that unwraps { data: T } envelope. */
export declare function apiPost<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>;
/** PATCH that unwraps { data: T } envelope. */
export declare function apiPatch<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>;
/** PUT that unwraps { data: T } envelope. */
export declare function apiPut<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>;
