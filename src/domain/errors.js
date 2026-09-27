// Stable, locale-neutral domain errors. HTTP status is a hint for the API adapter;
// the adapter owns its response envelope and final transport behavior.
export class DomainError extends Error {
  constructor(code, message, status) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.status = status
  }
}

export function invalidInput(message) {
  return new DomainError('INVALID_INPUT', message, 422)
}

export function amountOutOfRange() {
  return new DomainError('AMOUNT_OUT_OF_RANGE', 'amount exceeds the supported integer range', 422)
}

export function walletAlreadyInitialized() {
  return new DomainError('WALLET_ALREADY_INITIALIZED', 'wallet already initialized', 409)
}

export function walletNotInitialized() {
  return new DomainError('WALLET_NOT_INITIALIZED', 'wallet not initialized', 422)
}

export function insufficientWalletBalance() {
  return new DomainError('INSUFFICIENT_WALLET_BALANCE', 'insufficient wallet balance', 422)
}

export function insufficientSavingsBalance() {
  return new DomainError('INSUFFICIENT_SAVINGS_BALANCE', 'insufficient savings balance', 422)
}

export function categoryNotFound() {
  return new DomainError('CATEGORY_NOT_FOUND', 'category not found', 422)
}

export function categoryTypeMismatch() {
  return new DomainError('CATEGORY_TYPE_MISMATCH', 'category does not match transaction type', 422)
}

export function categoryDisabled() {
  return new DomainError('CATEGORY_DISABLED', 'category is disabled or retired', 422)
}

export function correctionTargetNotFound() {
  return new DomainError('CORRECTION_TARGET_NOT_FOUND', 'transaction not found', 404)
}

export function correctionNotAllowed(message) {
  return new DomainError('CORRECTION_NOT_ALLOWED', message, 422)
}

export function idempotencyConflict() {
  return new DomainError('IDEMPOTENCY_CONFLICT', 'idempotency key already used with different body', 409)
}

export function notFound() {
  return new DomainError('NOT_FOUND', 'resource not found', 404)
}

export function forbidden() {
  return new DomainError('FORBIDDEN', 'forbidden', 403)
}
