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

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, body?: object): Promise<T> {
  const options: RequestInit = { method: body ? 'POST' : 'GET', credentials: 'include' };
  if (body) {
    options.headers = { 'Content-Type': 'application/json' };
    if (csrfToken) options.headers['x-csrf-token'] = csrfToken;
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`/api/v1${path}`, options);
  const result = await response.json() as ApiResult<T>;
  if (!response.ok || !result.data) {
    throw new ApiError(response.status, result.error?.code || 'INTERNAL_ERROR', result.error?.message || 'Request failed');
  }
  if (path === '/auth/logout') csrfToken = '';
  else if (path === '/auth/login' || path === '/auth/session') {
    const token = (result.data as { csrfToken?: string }).csrfToken;
    if (token) csrfToken = token;
  }
  return result.data;
}
