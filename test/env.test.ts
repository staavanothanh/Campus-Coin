import { test } from "node:test";
import assert from "node:assert/strict";
import { DbEnvError, migrationCreds, readDbEnv } from "../src/infrastructure/db/env.ts";

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

test("readDbEnv: verify-ca cũng nhận PEM base64 cho môi trường serverless", () => {
  const pem = "-----BEGIN CERTIFICATE-----\nZmFrZQ==\n-----END CERTIFICATE-----";
  const caBase64 = Buffer.from(pem).toString("base64");
  const env = readDbEnv({
    ...baseEnv(),
    CAMPUS_COIN_DB_SSL: "verify-ca",
    CAMPUS_COIN_DB_CA_BASE64: caBase64,
  });
  assert.equal(env.caCertificate, pem);
  assert.throws(() => readDbEnv({
    ...baseEnv(),
    CAMPUS_COIN_DB_SSL: "verify-ca",
    CAMPUS_COIN_DB_CA_BASE64: "not-base64",
  }), DbEnvError);
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
