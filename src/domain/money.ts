// Miền tiền bất biến (ADR-0005, docs/DOMAIN-MODEL.md) — chỉ dùng ở server/domain.
// - Amount là số nguyên VND dương; không floating point, không số âm biểu diễn hướng.
// - Hướng được biểu diễn bằng type (income/payment) và role (original/reversal/adjustment/replacement).

export type TransactionType = "income" | "payment";
export type CorrectionRole = "reversal" | "adjustment" | "replacement";
export type TransferDirection = "deposit" | "withdraw";
export type CategoryStatus = "active" | "disabled" | "retired";

export const TRANSACTION_TYPES = ["income", "payment"] as const;
export const CORRECTION_ROLES = ["reversal", "adjustment", "replacement"] as const;
export const TRANSFER_DIRECTIONS = ["deposit", "withdraw"] as const;
export const CATEGORY_STATUSES = ["active", "disabled", "retired"] as const;

/** Wallet effect sign của một row gốc: income làm tăng wallet, payment làm giảm. */
export function typeSign(type: TransactionType): 1 | -1 {
  return type === "income" ? 1 : -1;
}

/** Effect lên wallet của row original: income +amount, payment -amount. */
export function walletDeltaForOriginal(type: TransactionType, amountVnd: number): number {
  return typeSign(type) * amountVnd;
}

/**
 * Effect lên wallet khi tạo correction lên một target original.
 * - reversal: đảo ngược effect của target (income -old, payment +old) — DOMAIN-MODEL §3.
 * - adjustment/replacement: row mới thay thế effect target → sign * (new - old).
 * Đây là "default" hiện tại; policy report month của correction đang chờ Team Leader
 * (xem docs/contracts/API-REVIEW.md — correction timestamp/report semantics chưa chốt).
 */
export function walletDeltaForCorrection(
  targetType: TransactionType,
  role: CorrectionRole,
  newAmountVnd: number,
  targetAmountVnd: number,
): number {
  const sign = typeSign(targetType);
  if (role === "reversal") return -sign * targetAmountVnd;
  return sign * (newAmountVnd - targetAmountVnd);
}

/** Kiểm tra amount là số nguyên dương VND an toàn (a < 2^53). */
export function isPositiveVnd(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= Number.MAX_SAFE_INTEGER
  );
}

export function isNonNegativeVnd(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER
  );
}

export function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === "string" && TRANSACTION_TYPES.includes(value as TransactionType);
}

export function isCorrectionRole(value: unknown): value is CorrectionRole {
  return typeof value === "string" && CORRECTION_ROLES.includes(value as CorrectionRole);
}

export function isTransferDirection(value: unknown): value is TransferDirection {
  return typeof value === "string" && TRANSFER_DIRECTIONS.includes(value as TransferDirection);
}

export function isCategoryStatus(value: unknown): value is CategoryStatus {
  return typeof value === "string" && CATEGORY_STATUSES.includes(value as CategoryStatus);
}