import { test } from "node:test";
import assert from "node:assert/strict";
import { currentMonthKey, decodeCursor, encodeCursor, monthKeyOf, monthRangeUtc } from "../src/domain/period.ts";

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

test("cursor: roundtrip và logic không đổi", () => {
  const cursor = encodeCursor(12345);
  assert.equal(decodeCursor(cursor), 12345);
});

test("cursor: input bị sửa hoặc sai schema bị từ chối", () => {
  const valid = encodeCursor(42);
  assert.throws(() => decodeCursor("not-base64url!"), /invalid cursor/);
  assert.throws(() => decodeCursor(valid.slice(0, -2)), /invalid cursor/); // cắt mất dữ liệu
  assert.throws(() => decodeCursor(encodeCursor(0)), /invalid cursor/);
  assert.throws(() => decodeCursor(encodeCursor(-5)), /invalid cursor/);
  const wrongVersion = Buffer.from(JSON.stringify({ v: 99, id: 7 }), "utf8").toString("base64url");
  assert.throws(() => decodeCursor(wrongVersion), /invalid cursor/);
  const floatId = Buffer.from(JSON.stringify({ v: 1, id: 1.5 }), "utf8").toString("base64url");
  assert.throws(() => decodeCursor(floatId), /invalid cursor/);
});