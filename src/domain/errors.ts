// Lỗi domain: code locale-neutral, ổn định (contract envelope); không chứa stack/raw payload.

export class DomainError extends Error {
  readonly code: string;
  // Gợi ý HTTP status cho API layer; không phải quyết định response cuối.
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
  }
}

export function invalidInput(message: string): DomainError {
  return new DomainError("INVALID_INPUT", message, 422);
}

export function walletAlreadyInitialized(): DomainError {
  return new DomainError("WALLET_ALREADY_INITIALIZED", "wallet already initialized", 409);
}

export function walletNotInitialized(): DomainError {
  return new DomainError("WALLET_NOT_INITIALIZED", "wallet not initialized", 422);
}

export function insufficientWalletBalance(): DomainError {
  return new DomainError("INSUFFICIENT_WALLET_BALANCE", "insufficient wallet balance", 422);
}

export function insufficientSavingsBalance(): DomainError {
  return new DomainError("INSUFFICIENT_SAVINGS_BALANCE", "insufficient savings balance", 422);
}

export function categoryNotFound(): DomainError {
  return new DomainError("CATEGORY_NOT_FOUND", "category not found", 422);
}

export function categoryTypeMismatch(): DomainError {
  return new DomainError("CATEGORY_TYPE_MISMATCH", "category does not match transaction type", 422);
}

export function categoryDisabled(): DomainError {
  return new DomainError("CATEGORY_DISABLED", "category is disabled or retired", 422);
}

export function correctionTargetNotFound(): DomainError {
  return new DomainError("CORRECTION_TARGET_NOT_FOUND", "transaction not found", 404);
}

export function correctionNotAllowed(message: string): DomainError {
  return new DomainError("CORRECTION_NOT_ALLOWED", message, 422);
}

export function idempotencyConflict(): DomainError {
  return new DomainError("IDEMPOTENCY_CONFLICT", "idempotency key already used with different body", 409);
}

export function notFound(): DomainError {
  return new DomainError("NOT_FOUND", "resource not found", 404);
}

export function forbidden(): DomainError {
  return new DomainError("FORBIDDEN", "forbidden", 403);
}