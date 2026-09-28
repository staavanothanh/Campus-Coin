import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_TRANSACTION_AMOUNT_VND, isTransactionAmountVnd } from '../../src/domain/money.ts';

test('accepts the income limit and rejects an amount above it', () => {
  assert.equal(MAX_TRANSACTION_AMOUNT_VND.income, 100_000_000);
  assert.equal(isTransactionAmountVnd('income', 100_000_000), true);
  assert.equal(isTransactionAmountVnd('income', 100_000_001), false);
});

test('accepts the payment limit and rejects an amount above it', () => {
  assert.equal(MAX_TRANSACTION_AMOUNT_VND.payment, 100_000_000_000);
  assert.equal(isTransactionAmountVnd('payment', 100_000_000_000), true);
  assert.equal(isTransactionAmountVnd('payment', 100_000_000_001), false);
});

test('rejects non-positive, fractional and unsafe transaction amounts', () => {
  assert.equal(isTransactionAmountVnd('income', 0), false);
  assert.equal(isTransactionAmountVnd('payment', 10.5), false);
  assert.equal(isTransactionAmountVnd('payment', Number.MAX_SAFE_INTEGER + 1), false);
});
