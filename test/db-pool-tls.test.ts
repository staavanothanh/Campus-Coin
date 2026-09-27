import { test } from "node:test";
import assert from "node:assert/strict";
import { closePool, getPool } from "../src/infrastructure/db/pool.ts";
import { DbEnvError, type DbEnv } from "../src/infrastructure/db/env.ts";

const disabledEnv: DbEnv = {
  host: "localhost",
  port: 3306,
  database: "campus_coin",
  user: "cc_runtime",
  password: "test-placeholder",
  sslMode: "disabled",
  caPath: undefined,
  caCertificate: undefined,
  connectionLimit: 1,
  migrateUser: undefined,
  migratePassword: undefined,
};

test("getPool validates disabled TLS even for an explicitly supplied DbEnv", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercel = process.env.VERCEL;
  try {
    for (const scenario of [
      { host: "db.example.com", nodeEnv: "test", vercel: undefined },
      { host: "localhost", nodeEnv: "production", vercel: undefined },
      { host: "127.0.0.1", nodeEnv: "test", vercel: "1" },
      { host: "::1", nodeEnv: "test", vercel: "true" },
    ]) {
      process.env.NODE_ENV = scenario.nodeEnv;
      if (scenario.vercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = scenario.vercel;
      assert.throws(() => getPool({ ...disabledEnv, host: scenario.host }), DbEnvError);
      await closePool();
    }

    process.env.NODE_ENV = "test";
    delete process.env.VERCEL;
    assert.doesNotThrow(() => getPool(disabledEnv));
  } finally {
    await closePool();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  }
});

test("getPool rejects an unknown runtime SSL mode without creating a cleartext pool", async () => {
  assert.throws(() => getPool({ ...disabledEnv, sslMode: "invalid" as DbEnv["sslMode"] }), DbEnvError);
  await closePool();
});

test("failed TLS pool initialization does not cache invalid DB config", async () => {
  const invalidEnv: DbEnv = {
    ...disabledEnv,
    sslMode: "verify-ca",
    caCertificate: undefined,
  };
  const original = {
    CAMPUS_COIN_DB_HOST: process.env.CAMPUS_COIN_DB_HOST,
    CAMPUS_COIN_DB_NAME: process.env.CAMPUS_COIN_DB_NAME,
    CAMPUS_COIN_DB_PASSWORD: process.env.CAMPUS_COIN_DB_PASSWORD,
    CAMPUS_COIN_DB_SSL: process.env.CAMPUS_COIN_DB_SSL,
    CAMPUS_COIN_DB_USER: process.env.CAMPUS_COIN_DB_USER,
    CAMPUS_COIN_DB_CA_PATH: process.env.CAMPUS_COIN_DB_CA_PATH,
    CAMPUS_COIN_DB_CA_BASE64: process.env.CAMPUS_COIN_DB_CA_BASE64,
  };
  try {
    assert.throws(() => getPool(invalidEnv), DbEnvError);
    process.env.CAMPUS_COIN_DB_HOST = disabledEnv.host;
    process.env.CAMPUS_COIN_DB_NAME = disabledEnv.database;
    process.env.CAMPUS_COIN_DB_PASSWORD = disabledEnv.password;
    process.env.CAMPUS_COIN_DB_SSL = "disabled";
    process.env.CAMPUS_COIN_DB_USER = disabledEnv.user;
    delete process.env.CAMPUS_COIN_DB_CA_PATH;
    delete process.env.CAMPUS_COIN_DB_CA_BASE64;
    assert.doesNotThrow(() => getPool());
  } finally {
    await closePool();
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
