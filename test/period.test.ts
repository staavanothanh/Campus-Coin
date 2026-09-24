import { test } from "node:test";
import assert from "node:assert/strict";
import {
  currentMonthKey,
  decodeCursor,
  encodeCursor,
  isPageLimit,
  MAX_CURSOR_LENGTH,
  monthKeyOf,
  monthRangeUtc,
} from "../src/domain/period.ts";

const CURSOR_TEST_KEY = "cursor-test-key-for-hmac-signature-32-bytes";

test("monthRangeUtc: nửa-khoảng UTC của tháng HCMC (UTC+7, không DST)", () => {
  const { startUtcMs, endExclusiveUtcMs } = monthRangeUtc("2026-09");
  assert.equal(new Date(startUtcMs).toISOString(), "2026-08-31T17:00:00.000Z");
  assert.equal(new Date(endExclusiveUtcMs).toISOString(), "2026-09-30T17:00:00.000Z");
});

test("monthRangeUtc: đầu năm và tháng 12", () => {
  const jan = monthRangeUtc("2026-01");
  const dec = monthRangeUtc("2025-12");
  assert.equal(new Date(jan.startUtcMs).toISOString(), "2025-12-31T17:00:00.000Z");
  assert.equal(new Date(dec.endExclusiveUtcMs).toISOString(), "2025-12-31T17:00:00.000Z");
});

test("monthRangeUtc: month key không hợp lệ bị từ chối", () => {
  assert.throws(() => monthRangeUtc("2026-13"), /invalid month/);
  assert.throws(() => monthRangeUtc("2026-1"), /invalid month/);
  assert.throws(() => monthRangeUtc("2026/09"), /invalid month/);
});

test("monthKeyOf: ranh giới tháng theo HCMC (UTC+7)", () => {
  // 2026-08-31T16:59Z = 23:59 HCMC 31/08 → tháng 08; 17:00Z = 00:00 HCMC 01/09 → tháng 09.
  assert.equal(monthKeyOf(Date.parse("2026-08-31T16:59:59.999Z")), "2026-08");
  assert.equal(monthKeyOf(Date.parse("2026-08-31T17:00:00.000Z")), "2026-09");
  // 2026-09-30T17:00Z = 00:00 HCMC 01/10 → tháng 10.
  assert.equal(monthKeyOf(Date.parse("2026-09-30T17:00:00.000Z")), "2026-10");
});

test("currentMonthKey theo một mốc cố định", () => {
  const fixed = Date.parse("2026-09-24T03:00:00.000Z"); // 10:00 HCMC
  assert.equal(currentMonthKey(fixed), "2026-09");
});

test("monthKeyOf rejects timestamps outside valid safe Date range", () => {
  assert.throws(() => monthKeyOf(Number.MAX_SAFE_INTEGER), /invalid UTC timestamp/);
  assert.throws(() => monthKeyOf(Number.MAX_SAFE_INTEGER + 1), /invalid UTC timestamp/);
});

test("cursor: versioned HMAC roundtrip and max safe id", () => {
  const cursor = encodeCursor(Number.MAX_SAFE_INTEGER, CURSOR_TEST_KEY);
  assert.match(cursor, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(decodeCursor(cursor, CURSOR_TEST_KEY), Number.MAX_SAFE_INTEGER);
});

test("cursor rejects tampering, malformed data, oversized input, and invalid keys", () => {
  const valid = encodeCursor(42, CURSOR_TEST_KEY);
  const [version, payload, signature] = valid.split(".");
  assert.ok(version && payload && signature);
  const changedPayload = Buffer.from(JSON.stringify({ v: 1, id: 43 }), "utf8").toString("base64url");
  assert.throws(() => decodeCursor(`${version}.${changedPayload}.${signature}`, CURSOR_TEST_KEY), /invalid cursor/);
  assert.throws(() => decodeCursor(`v2.${payload}.${signature}`, CURSOR_TEST_KEY), /invalid cursor/);
  assert.throws(() => decodeCursor("not-base64url!", CURSOR_TEST_KEY), /invalid cursor/);
  assert.throws(() => decodeCursor(valid.slice(0, -2), CURSOR_TEST_KEY), /invalid cursor/);
  assert.throws(() => decodeCursor("x".repeat(MAX_CURSOR_LENGTH + 1), CURSOR_TEST_KEY), /invalid cursor/);
  assert.throws(() => decodeCursor(valid, `${CURSOR_TEST_KEY}-different`), /invalid cursor/);
  assert.throws(() => decodeCursor(valid, "short"), /signing key/);
  assert.throws(() => encodeCursor(0, CURSOR_TEST_KEY), /invalid cursor/);
  assert.throws(() => encodeCursor(-5, CURSOR_TEST_KEY), /invalid cursor/);
  assert.throws(() => encodeCursor(Number.MAX_SAFE_INTEGER + 1, CURSOR_TEST_KEY), /invalid cursor/);
  assert.throws(() => decodeCursor(valid, ""), /signing key/);
});

test("page limits follow OpenAPI bounds", () => {
  assert.equal(isPageLimit(1), true);
  assert.equal(isPageLimit(100), true);
  for (const invalid of [0, 101, 1.5, Number.NaN, "20"]) assert.equal(isPageLimit(invalid), false);
});
