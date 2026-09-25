export interface AppErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: AppErrorDetail[]
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function unauthorizedError(message: string = 'Unauthorized'): AppError {
  return new AppError('UNAUTHORIZED', 401, message);
}

export function forbiddenError(message: string = 'Forbidden'): AppError {
  return new AppError('FORBIDDEN', 403, message);
}

export function notFoundError(message: string = 'Not Found'): AppError {
  return new AppError('NOT_FOUND', 404, message);
}

export function conflictError(message: string): AppError {
  return new AppError('CONFLICT', 409, message);
}

export function validationError(details: AppErrorDetail[], message: string = 'Validation Error'): AppError {
  return new AppError('VALIDATION_ERROR', 422, message, details);
}

export function csrfError(message: string = 'Invalid CSRF Token'): AppError {
  return new AppError('CSRF_ERROR', 403, message);
}

export function domainError(code: string, message: string, details?: AppErrorDetail[]): AppError {
  return new AppError(code, 422, message, details);
}

export function accountDisabledError(message: string = 'Account is disabled'): AppError {
  return new AppError('ACCOUNT_DISABLED', 403, message);
}

export function idempotencyConflictError(message: string = 'Idempotency Conflict'): AppError {
  return new AppError('IDEMPOTENCY_CONFLICT', 409, message);
}

export function rateLimitedError(message: string = 'Too Many Requests'): AppError {
  return new AppError('RATE_LIMITED', 429, message);
}

export function internalError(message: string = 'Internal Server Error'): AppError {
  return new AppError('INTERNAL_ERROR', 500, message);
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
