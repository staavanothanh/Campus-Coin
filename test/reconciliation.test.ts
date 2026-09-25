import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileFinancialProjections } from "../src/application/reconciliation.service.js";
import type { Db } from "../src/infrastructure/db/pool.js";

function dbWithRows(rows: Array<Record<string, number | string | null>>): Db {
  return {
    query: async (_sql: string, params?: unknown[]) => {
      const after = Number(params?.[0] ?? 0);
      const limit = Number(params?.[1] ?? 251);
      const page = rows.filter((row) => Number(row["userId"]) > after).slice(0, limit);
      return [page, []];
    },
  } as unknown as Db;
}

test("projection reconciliation uses exact integer arithmetic and reports clean state", async () => {
  const result = await reconcileFinancialProjections(dbWithRows([
    {
      userId: 1,
      initialBalanceVnd: "9007199254740000",
      availableBalanceVnd: "9007199254740025",
      savingsBalanceVnd: "125",
      effectiveLedgerDeltaVnd: "40",
      savingsWalletDeltaVnd: "-15",
      expectedSavingsBalanceVnd: "125",
    },
  ]));

  assert.deepEqual(result, {
    checkedUsers: 1,
    walletMismatches: 0,
    savingsMismatches: 0,
    isConsistent: true,
  });
});

test("projection reconciliation fails closed on wallet or savings drift", async () => {
  const result = await reconcileFinancialProjections(dbWithRows([
    {
      userId: 2,
      initialBalanceVnd: 100,
      availableBalanceVnd: 999,
      savingsBalanceVnd: 11,
      effectiveLedgerDeltaVnd: 0,
      savingsWalletDeltaVnd: 0,
      expectedSavingsBalanceVnd: 10,
    },
    {
      userId: 3,
      initialBalanceVnd: 100,
      availableBalanceVnd: 100,
      savingsBalanceVnd: null,
      effectiveLedgerDeltaVnd: 0,
      savingsWalletDeltaVnd: 0,
      expectedSavingsBalanceVnd: 0,
    },
  ]));

  assert.deepEqual(result, {
    checkedUsers: 2,
    walletMismatches: 1,
    savingsMismatches: 2,
    isConsistent: false,
  });
});
