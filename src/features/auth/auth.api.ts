export interface User {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  role: string;
}

interface ApiResult<T> {
  data?: T;
  error?: { code: string; message: string };
}

let csrfToken = '';
type ApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiRequestOptions {
  method: ApiHttpMethod;
  body?: object;
}

export class ApiError extends Error {
  status: number;
  code: string;
  retryAfterSeconds: number | undefined;

  constructor(status: number, code: string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function request<T>(path: string, requestOptions: ApiRequestOptions = { method: 'GET' }): Promise<T> {
  const options: RequestInit = { method: requestOptions.method, credentials: 'include' };
  const headers: Record<string, string> = {};
  if (requestOptions.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(requestOptions.body);
  }
  if (requestOptions.method !== 'GET' && csrfToken) headers['x-csrf-token'] = csrfToken;
  if (Object.keys(headers).length > 0) options.headers = headers;
  const response = await fetch(`/api/v1${path}`, options);
  let result: ApiResult<T>;
  try {
    result = await response.json() as ApiResult<T>;
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'Invalid server response');
  }
  if (!response.ok || !result.data) {
    const retryAfter = Number(response.headers.get('Retry-After'));
    throw new ApiError(
      response.status,
      result.error?.code || 'INTERNAL_ERROR',
      result.error?.message || 'Request failed',
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    );
  }
  if (path === '/auth/logout') csrfToken = '';
  else if (path === '/auth/login' || path === '/auth/session') {
    const token = (result.data as { csrfToken?: string }).csrfToken;
    if (token) csrfToken = token;
  }
  return result.data;
}

export async function api<T>(path: string, body?: object, method?: ApiHttpMethod): Promise<T> {
  const resolvedMethod = method ?? (body === undefined ? 'GET' : 'POST');
  return request<T>(path, {
    method: resolvedMethod,
    ...(body === undefined ? {} : { body }),
  });
}
