// Chuyển row MySQL → domain value: BIGINT có thể về number (safe) hoặc string khi vượt 2^53.

export function idFromDb(value: unknown): number {
  return safeNumber(value, "id", false);
}

export function amountFromDb(value: unknown): number {
  return safeNumber(value, "amount", false);
}

/**
 * Delta tài khoản (income − payment, hoặc ngược lại theo phép tính) là giá trị CÓ DẤU,
 * khác amount gốc luôn dương. Ví dụ opening balance của tháng sau một kỳ chi nhiều hơn thu:
 * deltaBefore = −300000, vẫn hợp lệ vì wallet.available_balance phải >= 0 sau khi cộng initial.
 */
export function deltaFromDb(value: unknown): number {
  return safeNumber(value, "delta", true);
}

function safeNumber(value: unknown, label: string, allowNegative: boolean): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : typeof value === "bigint" ? Number(value) : NaN;
  if (!Number.isSafeInteger(n) || (!allowNegative && n < 0)) {
    throw new Error(`db ${label} out of safe integer range`);
  }
  return n;
}

export function isoFromDb(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new Error("invalid db timestamp");
    return d.toISOString();
  }
  throw new Error("invalid db timestamp");
}