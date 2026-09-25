export class AppError extends Error {
    code;
    statusCode;
    details;
    constructor(code, statusCode, message, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
export function unauthorizedError(message = 'Unauthorized') {
    return new AppError('UNAUTHORIZED', 401, message);
}
export function forbiddenError(message = 'Forbidden') {
    return new AppError('FORBIDDEN', 403, message);
}
export function notFoundError(message = 'Not Found') {
    return new AppError('NOT_FOUND', 404, message);
}
export function conflictError(message) {
    return new AppError('CONFLICT', 409, message);
}
export function validationError(details, message = 'Validation Error') {
    return new AppError('VALIDATION_ERROR', 422, message, details);
}
export function csrfError(message = 'Invalid CSRF Token') {
    return new AppError('CSRF_ERROR', 403, message);
}
export function domainError(code, message, details) {
    return new AppError(code, 422, message, details);
}
export function accountDisabledError(message = 'Account is disabled') {
    return new AppError('ACCOUNT_DISABLED', 403, message);
}
export function idempotencyConflictError(message = 'Idempotency Conflict') {
    return new AppError('IDEMPOTENCY_CONFLICT', 409, message);
}
export function rateLimitedError(message = 'Too Many Requests') {
    return new AppError('RATE_LIMITED', 429, message);
}
export function internalError(message = 'Internal Server Error') {
    return new AppError('INTERNAL_ERROR', 500, message);
}
export function isAppError(err) {
    return err instanceof AppError;
}
//# sourceMappingURL=errors.js.map