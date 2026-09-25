export interface AppErrorDetail {
    field?: string;
    code: string;
    message: string;
}
export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: AppErrorDetail[] | undefined;
    constructor(code: string, statusCode: number, message: string, details?: AppErrorDetail[] | undefined);
}
export declare function unauthorizedError(message?: string): AppError;
export declare function forbiddenError(message?: string): AppError;
export declare function notFoundError(message?: string): AppError;
export declare function conflictError(message: string): AppError;
export declare function validationError(details: AppErrorDetail[], message?: string): AppError;
export declare function csrfError(message?: string): AppError;
export declare function domainError(code: string, message: string, details?: AppErrorDetail[]): AppError;
export declare function accountDisabledError(message?: string): AppError;
export declare function idempotencyConflictError(message?: string): AppError;
export declare function rateLimitedError(message?: string): AppError;
export declare function internalError(message?: string): AppError;
export declare function isAppError(err: unknown): err is AppError;
