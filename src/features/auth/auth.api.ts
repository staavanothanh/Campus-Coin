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
  const response = await fetch(`/api/v1${path}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json', ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
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
