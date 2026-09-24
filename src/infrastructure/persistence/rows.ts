// Chuyển row MySQL → domain value: BIGINT có thể về number (safe) hoặc string khi vượt 2^53.

export function idFromDb(value: unknown): number {
  return safeNumber(value, "id");
}

export function amountFromDb(value: unknown): number {
  return safeNumber(value, "amount");
}

function safeNumber(value: unknown, label: string): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : typeof value === "bigint" ? Number(value) : NaN;
  if (!Number.isSafeInteger(n) || n < 0) {
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