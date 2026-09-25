import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPositiveVnd,
  isNonNegativeVnd,
  addSafeIntegers,
  subtractSafeIntegers,
  walletDeltaForCorrection,
  walletDeltaForOriginal,
} from "../src/domain/money.js";
import { amountFromDb, deltaFromDb } from "../src/infrastructure/persistence/rows.js";

test("walletDeltaForOriginal: income tăng wallet, payment giảm wallet", () => {
  assert.equal(walletDeltaForOriginal("income", 100_000), 100_000);
  assert.equal(walletDeltaForOriginal("payment", 200_000), -200_000);
});

test("walletDeltaForCorrection: reversal đảo ngược effect của target", () => {
  // Reversal của income: tiền rời wallet.
  assert.equal(walletDeltaForCorrection("income", "reversal", 100_000, 100_000), -100_000);
  // Reversal của payment: tiền về wallet.
  assert.equal(walletDeltaForCorrection("payment", "reversal", 80_000, 80_000), 80_000);
});

test("walletDeltaForCorrection: replacement/adjustment là delta new - old theo sign type", () => {
  // Income 100 → 150: +50 vào wallet.
  assert.equal(walletDeltaForCorrection("income", "replacement", 150_000, 100_000), 50_000);
  // Income 100 → 60: -40 (cần đủ balance).
  assert.equal(walletDeltaForCorrection("income", "adjustment", 60_000, 100_000), -40_000);
  // Payment 80 → 100: thêm -20.
  assert.equal(walletDeltaForCorrection("payment", "replacement", 100_000, 80_000), -20_000);
  // Payment 80 → 50: +30 về wallet.
  assert.equal(walletDeltaForCorrection("payment", "adjustment", 50_000, 80_000), 30_000);
});

test("amount validation: positive vs non-negative VND", () => {
  assert.equal(isPositiveVnd(1), true);
  assert.equal(isPositiveVnd(0), false);
  assert.equal(isPositiveVnd(-1), false);
  assert.equal(isPositiveVnd(1.5), false);
  assert.equal(isPositiveVnd(Number.MAX_SAFE_INTEGER + 1), false);
  assert.equal(isPositiveVnd("100"), false);
  assert.equal(isNonNegativeVnd(0), true);
  assert.equal(isNonNegativeVnd(1), true);
  assert.equal(isNonNegativeVnd(-1), false);
});

test("safe arithmetic: accepts max-safe boundaries and rejects overflow", () => {
  const max = Number.MAX_SAFE_INTEGER;
  const min = Number.MIN_SAFE_INTEGER;
  assert.equal(addSafeIntegers(max - 1, 1), max);
  assert.equal(subtractSafeIntegers(min + 1, 1), min);
  assert.throws(() => addSafeIntegers(max, 1), RangeError);
  assert.throws(() => subtractSafeIntegers(min, 1), RangeError);
  assert.throws(() => addSafeIntegers(max + 1, 0), RangeError);
});

test("database integer parsing preserves exact max-safe limits", () => {
  assert.equal(amountFromDb("9007199254740991"), Number.MAX_SAFE_INTEGER);
  assert.equal(deltaFromDb("-9007199254740991"), Number.MIN_SAFE_INTEGER);
  assert.throws(() => amountFromDb("9007199254740992"), /safe integer range/);
  assert.throws(() => deltaFromDb("9007199254740991.1"), /safe integer range/);
});
