import assert from "node:assert/strict";
import { test } from "node:test";
import { assertIsolatedTestDatabase } from "../test/helpers/db-test-guard.ts";

test("yêu cầu bật cờ trước khi chạy test MySQL", () => {
  assert.throws(
    () => assertIsolatedTestDatabase({ CAMPUS_COIN_DB_NAME: "campus_coin_test_local" } as NodeJS.ProcessEnv),
    /CAMPUS_COIN_TEST_DB=1/,
  );
});

test("từ chối database dùng chung như defaultdb", () => {
  assert.throws(
    () => assertIsolatedTestDatabase({
      CAMPUS_COIN_TEST_DB: "1",
      CAMPUS_COIN_DB_NAME: "defaultdb",
    } as NodeJS.ProcessEnv),
    /Không dùng defaultdb/,
  );
});

test("chấp nhận tên database dành riêng cho kiểm thử", () => {
  assert.doesNotThrow(() => assertIsolatedTestDatabase({
    CAMPUS_COIN_TEST_DB: "1",
    CAMPUS_COIN_DB_NAME: "campus_coin_test_local",
  } as NodeJS.ProcessEnv));
});
