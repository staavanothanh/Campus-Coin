import { test } from "node:test";
import assert from "node:assert/strict";
import { DbEnvError, migrationCreds, readCursorSigningKey, readDbEnv, ServerEnvError } from "../src/infrastructure/db/env.ts";

function baseEnv(): NodeJS.ProcessEnv {
  return {
    CAMPUS_COIN_DB_HOST: "db.example.com",
    CAMPUS_COIN_DB_NAME: "campus_coin",
    CAMPUS_COIN_DB_USER: "cc_runtime",
    CAMPUS_COIN_DB_PASSWORD: "secret-placeholder",
  };
}

test("readDbEnv: defaults khi chỉ set bắt buộc", () => {
  const env = readDbEnv(baseEnv());
  assert.equal(env.port, 3306);
  assert.equal(env.sslMode, "required");
  assert.equal(env.connectionLimit, 5);
  assert.equal(env.migrateUser, undefined);
});

test("readDbEnv: permits empty password only for explicit loopback MySQL tests", () => {
  const localTest = readDbEnv({
    ...baseEnv(),
    CAMPUS_COIN_DB_HOST: "127.0.0.1",
    CAMPUS_COIN_DB_PASSWORD: "",
    CAMPUS_COIN_TEST_DB: "1",
  });
  assert.equal(localTest.password, "");
  assert.throws(
    () => readDbEnv({
      ...baseEnv(),
      CAMPUS_COIN_DB_HOST: "db.example.invalid",
      CAMPUS_COIN_DB_PASSWORD: "",
      CAMPUS_COIN_TEST_DB: "1",
    }),
    (error: unknown) => error instanceof DbEnvError && error.message.includes("CAMPUS_COIN_DB_PASSWORD"),
  );
});

test("readDbEnv: thiếu biến bắt buộc → fail closed", () => {
  for (const missing of ["CAMPUS_COIN_DB_HOST", "CAMPUS_COIN_DB_NAME", "CAMPUS_COIN_DB_USER", "CAMPUS_COIN_DB_PASSWORD"]) {
    const env = { ...baseEnv(), [missing]: undefined };
    assert.throws(() => readDbEnv(env), DbEnvError, missing);
  }
});

test("readDbEnv: port và connection limit ngoài dải → lỗi", () => {
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_PORT: "0" }), DbEnvError);
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_PORT: "70000" }), DbEnvError);
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_PORT: "abc" }), DbEnvError);
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_CONNECTION_LIMIT: "99" }), DbEnvError);
});

test("readDbEnv: ssl mode không hợp lệ và verify-ca thiếu CA → lỗi", () => {
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_SSL: "sometimes" }), DbEnvError);
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_SSL: "verify-ca" }), DbEnvError);
  const ok = readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_SSL: "verify-ca", CAMPUS_COIN_DB_CA_PATH: "/tmp/ca.pem" });
  assert.equal(ok.sslMode, "verify-ca");
  assert.equal(ok.caPath, "/tmp/ca.pem");
});

test("migrationCreds: ưu tiên migrate role, fallback runtime role", () => {
  const withMigrate = readDbEnv({
    ...baseEnv(),
    CAMPUS_COIN_DB_MIGRATE_USER: "cc_migrate",
    CAMPUS_COIN_DB_MIGRATE_PASSWORD: "mig-secret",
  });
  assert.deepEqual(migrationCreds(withMigrate), { user: "cc_migrate", password: "mig-secret" });
  const runtimeOnly = readDbEnv(baseEnv());
  assert.deepEqual(migrationCreds(runtimeOnly), { user: "cc_runtime", password: "secret-placeholder" });
});

test("readCursorSigningKey: requires a sufficiently long unpadded environment value", () => {
  const key = "test-only-cursor-signing-key-with-32-bytes-minimum";
  assert.equal(readCursorSigningKey({ CAMPUS_COIN_CURSOR_SIGNING_KEY: key }), key);
  assert.throws(() => readCursorSigningKey({}), ServerEnvError);
  assert.throws(() => readCursorSigningKey({ CAMPUS_COIN_CURSOR_SIGNING_KEY: "too-short" }), ServerEnvError);
  assert.throws(() => readCursorSigningKey({ CAMPUS_COIN_CURSOR_SIGNING_KEY: `${key} ` }), ServerEnvError);
});
