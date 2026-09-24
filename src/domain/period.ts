import { createHmac, timingSafeEqual } from "node:crypto";

// Kỳ nghiệp vụ theo Asia/Ho_Chi_Minh (ADR-0005, DOMAIN-MODEL §1).
// Việt Nam không dùng DST; HCMC = UTC+7 cố định. Nếu policy DST thay đổi,
// phải thay module này bằng Temporal/ICU thay vì sửa từng query.

export const HCMC_TIMEZONE = "Asia/Ho_Chi_Minh";
export const HCMC_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Kiểm tra month key dạng YYYY-MM (half-open kỳ HCMC). */
export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

/** month key (HCMC) ứng với một UTC instant. */
export function monthKeyOf(utcMs: number): string {
  if (!Number.isSafeInteger(utcMs)) throw new Error("invalid UTC timestamp");
  const localMs = utcMs + HCMC_UTC_OFFSET_MS;
  if (!Number.isSafeInteger(localMs)) throw new Error("invalid UTC timestamp");
  const local = new Date(localMs);
  if (!Number.isFinite(local.getTime())) throw new Error("invalid UTC timestamp");
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Month key hiện tại theo HCMC. */
export function currentMonthKey(nowMs: number = Date.now()): string {
  return monthKeyOf(nowMs);
}

/**
 * Nửa-khoảng UTC của một tháng HCMC: [start, end).
 * 2026-09 → [2026-08-31T17:00:00Z, 2026-09-30T17:00:00Z).
 */
export function monthRangeUtc(monthKey: string): { startUtcMs: number; endExclusiveUtcMs: number } {
  const match = MONTH_PATTERN.exec(monthKey);
  if (match === null) {
    throw new Error(`invalid month key: ${monthKey}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]); // 1-12
  const startUtcMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - HCMC_UTC_OFFSET_MS;
  const endUtcMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - HCMC_UTC_OFFSET_MS;
  return { startUtcMs, endExclusiveUtcMs: endUtcMs };
}

const CURSOR_VERSION = 1;
export const MAX_CURSOR_LENGTH = 512;
export const MIN_PAGE_LIMIT = 1;
export const MAX_PAGE_LIMIT = 100;

export function isPageLimit(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_PAGE_LIMIT && value <= MAX_PAGE_LIMIT;
}

export function encodeCursor(id: number, signingKey: string): string {
  assertSigningKey(signingKey);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("invalid cursor");
  const payload = Buffer.from(JSON.stringify({ v: CURSOR_VERSION, id }), "utf8").toString("base64url");
  const signedValue = `v${CURSOR_VERSION}.${payload}`;
  const signature = createHmac("sha256", signingKey).update(signedValue).digest("base64url");
  const cursor = `${signedValue}.${signature}`;
  if (cursor.length > MAX_CURSOR_LENGTH) throw new Error("invalid cursor");
  return cursor;
}

export function decodeCursor(cursor: string, signingKey: string): number {
  assertSigningKey(signingKey);
  if (typeof cursor !== "string" || cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH) {
    throw new Error("invalid cursor");
  }
  const parts = cursor.split(".");
  if (parts.length !== 3) throw new Error("invalid cursor");
  const [version, payload, signature] = parts;
  if (version !== `v${CURSOR_VERSION}` || payload === undefined || signature === undefined) {
    throw new Error("invalid cursor");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(signature)) {
    throw new Error("invalid cursor");
  }
  const signedValue = `${version}.${payload}`;
  const expected = createHmac("sha256", signingKey).update(signedValue).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.toString("base64url") !== signature || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("invalid cursor");
  }
  let parsed: unknown;
  try {
    const payloadBytes = Buffer.from(payload, "base64url");
    if (payloadBytes.toString("base64url") !== payload) throw new Error("invalid cursor");
    parsed = JSON.parse(payloadBytes.toString("utf8"));
  } catch {
    throw new Error("invalid cursor");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("invalid cursor");
  }
  if (!("v" in parsed) || !("id" in parsed)) {
    throw new Error("invalid cursor");
  }
  const { v, id } = parsed;
  if (v !== CURSOR_VERSION || typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) {
    throw new Error("invalid cursor");
  }
  return id;
}

function assertSigningKey(signingKey: string): void {
  if (typeof signingKey !== "string" || Buffer.byteLength(signingKey, "utf8") < 32 || signingKey.trim() !== signingKey) {
    throw new Error("invalid cursor signing key");
  }
}
