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
