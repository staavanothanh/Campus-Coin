import type { ApiErrorPayload, Copy, PageMeta } from './types.js';

export class RequestError extends Error {
  status: number | undefined;
  code: string | undefined;
  details: ApiErrorPayload['details'] | undefined;

  constructor(message: string, status?: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
    this.code = payload?.code;
    this.details = payload?.details;
  }
}

type ApiEnvelope<T> = { data: T };
type PageEnvelope<T> = { data: T[]; meta: PageMeta };
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function isErrorPayload(value: unknown): value is { error: ApiErrorPayload } {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = value.error;
  return typeof error === 'object' && error !== null;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { credentials: 'include', ...options });
  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    const apiError = isErrorPayload(payload) ? payload.error : undefined;
    if (response.status === 401) unauthorizedHandler?.();
    throw new RequestError(
      apiError?.message ?? apiError?.code ?? `HTTP_${response.status}`,
      response.status,
      apiError
    );
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json() as ApiEnvelope<T>;
  return result.data;
}

export async function apiRequestPaged<T>(path: string): Promise<PageEnvelope<T>> {
  const response = await fetch(`/api/v1${path}`, { credentials: 'include' });
  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    const apiError = isErrorPayload(payload) ? payload.error : undefined;
    if (response.status === 401) unauthorizedHandler?.();
    throw new RequestError(apiError?.message ?? apiError?.code ?? `HTTP_${response.status}`, response.status, apiError);
  }
  return await response.json() as PageEnvelope<T>;
}

export function errorMessage(error: unknown, t: Copy): string {
  const requestFailed = t.requestFailed ?? 'Request failed';
  if (!(error instanceof RequestError)) return requestFailed;
  if (error.status === 401) return t.sessionExpired ?? 'Session expired';
  if (error.status === 403) return t.forbidden ?? 'Forbidden';
  if (error.code === 'VALIDATION_ERROR' || error.code === 'DOMAIN_VALIDATION_ERROR') return t.validationError ?? 'Invalid request';
  if (error.status !== undefined && error.status < 500) return error.message;
  return requestFailed;
}

