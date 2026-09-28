import { rootCertificates } from "node:tls";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
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
test("readDbEnv: disposable loopback test may use an empty database password", () => {
  const env = {
    ...baseEnv(),
    CAMPUS_COIN_DB_HOST: "127.0.0.1",
    CAMPUS_COIN_DB_PASSWORD: "",
    CAMPUS_COIN_TEST_DB: "1",
  };
  assert.equal(readDbEnv(env).password, "");
  assert.throws(() => readDbEnv({ ...env, CAMPUS_COIN_TEST_DB: undefined }), DbEnvError);
  assert.throws(() => readDbEnv({ ...env, CAMPUS_COIN_DB_HOST: "db.example.com" }), DbEnvError);
});

test("readDbEnv: port và connection limit ngoài dải → lỗi", () => {
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_PORT: "0" }), DbEnvError);
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_PORT: "70000" }), DbEnvError);
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_PORT: "abc" }), DbEnvError);
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_CONNECTION_LIMIT: "99" }), DbEnvError);
});
test("readDbEnv: verify-ca requires a readable, parseable PEM certificate", () => {
  assert.throws(() => readDbEnv({
    ...baseEnv(),
    CAMPUS_COIN_DB_SSL: "verify-ca",
    CAMPUS_COIN_DB_CA_PATH: "./missing-ca.pem",
  }), { name: "DbEnvError", message: /CAMPUS_COIN_DB_CA_PATH.*readable CA certificate/ });

  const directory = mkdtempSync(path.join(os.tmpdir(), "campus-coin-ca-"));
  const caPath = path.join(directory, "ca.pem");
  const pem = rootCertificates[0]!;
  try {
    writeFileSync(caPath, pem);
    const env = readDbEnv({
      ...baseEnv(),
      CAMPUS_COIN_DB_SSL: "verify-ca",
      CAMPUS_COIN_DB_CA_PATH: caPath,
    });
    assert.equal(env.caPath, caPath);
    assert.equal(env.caCertificate, pem);

    writeFileSync(caPath, "-----BEGIN CERTIFICATE-----\nZmFrZQ==\n-----END CERTIFICATE-----");
    assert.throws(() => readDbEnv({
      ...baseEnv(),
      CAMPUS_COIN_DB_SSL: "verify-ca",
      CAMPUS_COIN_DB_CA_PATH: caPath,
    }), { name: "DbEnvError", message: /CAMPUS_COIN_DB_CA_PATH.*valid PEM certificates/ });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("readDbEnv: verify-ca cũng nhận PEM base64 cho môi trường serverless", () => {
  const pem = rootCertificates[0]!;
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
  const malformedCa = Buffer.from("-----BEGIN CERTIFICATE-----\nZmFrZQ==\n-----END CERTIFICATE-----").toString("base64");
  assert.throws(() => readDbEnv({
    ...baseEnv(),
    CAMPUS_COIN_DB_SSL: "verify-ca",
    CAMPUS_COIN_DB_CA_BASE64: malformedCa,
  }), { name: "DbEnvError", message: /CAMPUS_COIN_DB_CA_BASE64.*valid PEM certificates/ });
});


test("readDbEnv: disabled TLS is restricted to non-production loopback development", () => {
  assert.equal(readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_HOST: "localhost", CAMPUS_COIN_DB_SSL: "disabled" }).sslMode, "disabled");
  assert.throws(() => readDbEnv({ ...baseEnv(), CAMPUS_COIN_DB_SSL: "disabled" }), DbEnvError);
  assert.throws(() => readDbEnv({
    ...baseEnv(), CAMPUS_COIN_DB_HOST: "127.0.0.1", CAMPUS_COIN_DB_SSL: "disabled", NODE_ENV: "production",
  }), DbEnvError);
  assert.throws(() => readDbEnv({
    ...baseEnv(), CAMPUS_COIN_DB_HOST: "127.0.0.1", CAMPUS_COIN_DB_SSL: "disabled", VERCEL: "1",
  }), DbEnvError);
  assert.throws(() => readDbEnv({
    ...baseEnv(), CAMPUS_COIN_DB_HOST: "localhost", CAMPUS_COIN_DB_SSL: "disabled", VERCEL: "true",
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
