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
  const local = new Date(utcMs + HCMC_UTC_OFFSET_MS);
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

// --- Keyset cursor: opaque base64url(JSON {v, id}), validate schema khi decode. ---
// Cursor không ký HMAC ở giai đoạn này; mọi query luôn scope user_id ở server nên
// cursor bị sửa chỉ ảnh hưởng list của chính owner (không lộ dữ liệu chéo).
// API-REVIEW đề xuất signed cursor — sẽ gắn với secrets của lane A khi chốt.

const CURSOR_VERSION = 1;

export function encodeCursor(id: number): string {
  const json = JSON.stringify({ v: CURSOR_VERSION, id });
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
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