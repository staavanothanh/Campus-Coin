import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmountVnd, retryPayloadAfterTransactionFailure, serializeTransactionPayload, serializeWalletBaseline, shouldRetainTransactionPayload } from '../../src/web/amount-vnd.ts';

test('retains a transaction payload only after an ambiguous outcome', () => {
  assert.equal(shouldRetainTransactionPayload(undefined), true);
  assert.equal(shouldRetainTransactionPayload(408), true);
  assert.equal(shouldRetainTransactionPayload(500), true);
  assert.equal(shouldRetainTransactionPayload(429), false);
  assert.equal(shouldRetainTransactionPayload(400), false);
  assert.equal(shouldRetainTransactionPayload(422), false);
});

test('retains the original payload only when a failure can have an ambiguous commit outcome', () => {
  const payload = { amountVnd: 50_000, categoryId: '3' };
  assert.deepEqual(retryPayloadAfterTransactionFailure(payload, undefined), payload);
  assert.deepEqual(retryPayloadAfterTransactionFailure(payload, 408), payload);
  assert.deepEqual(retryPayloadAfterTransactionFailure(payload, 500), payload);
  assert.equal(retryPayloadAfterTransactionFailure(payload, 422), null);
  assert.equal(retryPayloadAfterTransactionFailure(payload, 403), null);
});

test('serializes ledger amount as a JSON integer and includes optional description', () => {
  const payload = serializeTransactionPayload({
    type: 'payment',
    amount: '125000',
    categoryId: '12',
    occurredAt: '2026-09-26T10:00:00.000Z',
    description: 'Lunch'
  });
  assert.deepEqual(payload, {
    type: 'payment',
    amountVnd: 125000,
    categoryId: '12',
    occurredAt: '2026-09-26T10:00:00.000Z',
    description: 'Lunch'
  });
  assert.equal(typeof payload?.amountVnd, 'number');
});

test('omits an empty optional description while requiring category ID', () => {
  const payload = serializeTransactionPayload({
    type: 'income',
    amount: '1',
    categoryId: '7',
    occurredAt: '2026-09-26T10:00:00.000Z',
    description: '  '
  });

  assert.deepEqual(payload, {
    type: 'income', amountVnd: 1, categoryId: '7', occurredAt: '2026-09-26T10:00:00.000Z'
  });
  assert.equal(serializeTransactionPayload({
    type: 'income', amount: '1', categoryId: '  ', occurredAt: '2026-09-26T10:00:00.000Z'
  }), null);
});

test('rejects transaction descriptions longer than the documented limit', () => {
  assert.equal(serializeTransactionPayload({
    type: 'payment', amount: '1', categoryId: '7', occurredAt: '2026-09-26T10:00:00.000Z', description: 'x'.repeat(501)
  }), null);
});

test('rejects non-decimal or unsafe category IDs', () => {
  for (const categoryId of ['', 'food', '0', '-1', '1.5', '9007199254740992']) {
    assert.equal(serializeTransactionPayload({
      type: 'income', amount: '1', categoryId, occurredAt: '2026-09-26T10:00:00.000Z'
    }), null);
  }
});

test('serializes a zero or positive safe-integer opening wallet balance', () => {
  assert.deepEqual(serializeWalletBaseline('0'), { initialBalanceVnd: 0 });
  assert.deepEqual(serializeWalletBaseline('125000'), { initialBalanceVnd: 125000 });
  assert.equal(serializeWalletBaseline('-1'), null);
  assert.equal(serializeWalletBaseline('9007199254740992'), null);
});

test('serializes positive decimal digits as safe integer VND', () => {
  assert.equal(parseAmountVnd('125000'), 125000);
  assert.equal(parseAmountVnd('9007199254740991'), Number.MAX_SAFE_INTEGER);
});

test('rejects values outside the positive safe-integer VND contract', () => {
  for (const input of ['', '0', '-1', '+1', '1.5', '1e3', ' 1', '9007199254740992', '１２３']) {
    assert.equal(parseAmountVnd(input), null, `expected ${JSON.stringify(input)} to be rejected`);
  }
});
