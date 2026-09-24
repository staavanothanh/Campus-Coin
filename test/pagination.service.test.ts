import { test } from "node:test";
import assert from "node:assert/strict";
import { listTransactions } from "../src/application/ledger.service.ts";
import { listTransfers } from "../src/application/savings.service.ts";
import { DomainError } from "../src/domain/errors.ts";
import type { Db } from "../src/infrastructure/db/pool.ts";

const unusedDb = {
  query: async () => {
    throw new Error("database must not be accessed for invalid pagination");
  },
} as unknown as Db;

test("listTransactions rejects limits outside OpenAPI bounds before querying", async () => {
  for (const limit of [0, 101, 1.5, Number.NaN]) {
    await assert.rejects(
      listTransactions(unusedDb, 1, { limit }),
      (error: unknown) => error instanceof DomainError && error.code === "INVALID_INPUT",
    );
  }
});

test("listTransfers rejects limits outside OpenAPI bounds before querying", async () => {
  for (const limit of [0, 101, 1.5, Number.NaN]) {
    await assert.rejects(
      listTransfers(unusedDb, 1, undefined, limit),
      (error: unknown) => error instanceof DomainError && error.code === "INVALID_INPUT",
    );
  }
});
