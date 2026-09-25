import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSqlFile } from "../datatest/sql-file.ts";

test("đọc header expect-error trong file SQL dùng CRLF", () => {
  const sql = "-- expect-error: append-only\r\n-- test ghi chú\r\nDELETE FROM ledger_transactions WHERE id = 1;\r\n";

  assert.deepEqual(parseSqlFile(sql), {
    expectError: "append-only",
    sql,
  });
});

test("file SQL không có header expect-error phải chạy thành công", () => {
  const sql = "-- fixture\nSELECT 1;\n";

  assert.deepEqual(parseSqlFile(sql), {
    expectError: null,
    sql,
  });
});
