import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTransaction, listTransactions } from '../src/application/ledger.service.ts';
import type { Db } from '../src/infrastructure/db/pool.ts';

test('rejects a future actual transaction before opening a database connection', async () => {
  await assert.rejects(
    createTransaction({} as unknown as Db, {
      userId: 1,
      type: 'payment',
      amountVnd: 10_000,
      categoryId: 1,
      occurredAt: '2999-01-01T00:00:00.000Z',
      description: null,
      idempotencyKey: 'future-transaction-test',
      requestHash: 'future-transaction-test',
    }),
    /occurredAt cannot be in the future/,
  );
});

test('rejects dates without a strict ISO-8601 date-time before opening a database connection', async () => {
  for (const occurredAt of [
    '2026-09-27',
    '2026-02-30T12:00:00.000Z',
    '2026-09-27T12:00:00',
    '2026-09-27T12:00:00+24:00',
  ]) {
    await assert.rejects(
      createTransaction({} as unknown as Db, {
        userId: 1,
        type: 'payment',
        amountVnd: 10_000,
        categoryId: 1,
        occurredAt,
        description: null,
        idempotencyKey: `invalid-date-${occurredAt}`,
        requestHash: 'invalid-date-test',
      }),
      /occurredAt must be a valid ISO-8601 instant/,
    );
  }
});

test('rejects transaction precision beyond MySQL DATETIME(3) before opening a database connection', async () => {
  await assert.rejects(
    createTransaction({} as unknown as Db, {
      userId: 1,
      type: 'payment',
      amountVnd: 10_000,
      categoryId: 1,
      occurredAt: '2026-09-27T12:00:00.1234Z',
      description: null,
      idempotencyKey: 'excess-date-precision-test',
      requestHash: 'excess-date-precision-test',
    }),
    /at most three fractional digits/,
  );
});

test('rejects transaction years MySQL DATETIME cannot store before opening a database connection', async () => {
  for (const occurredAt of [
    '0999-12-31T23:59:59.000Z',
    '1000-01-01T00:00:00+00:01',
    '9999-12-31T23:59:59.999-00:01',
  ]) {
    await assert.rejects(
      createTransaction({} as unknown as Db, {
        userId: 1,
        type: 'payment',
        amountVnd: 10_000,
        categoryId: 1,
        occurredAt,
        description: null,
        idempotencyKey: `unsupported-transaction-year-${occurredAt}`,
        requestHash: 'unsupported-transaction-year-test',
      }),
      /outside the supported calendar range/,
    );
  }
});

test('transaction list accepts future filters and enforces MySQL DATETIME(3) bounds', async () => {
  const queryParams: unknown[][] = [];
  const db = {
    query: async (_sql: string, params: unknown[]) => {
      queryParams.push(params);
      return [[], undefined];
    },
  } as unknown as Db;
  const filterEnd = '2090-01-01t00:00:00z';

  const page = await listTransactions(db, 1, { limit: 10, to: filterEnd });

  assert.deepEqual(page.data, []);
  assert.equal(page.meta.hasNext, false);
  assert.ok(queryParams[0]?.some((value) => value instanceof Date && value.toISOString() === '2090-01-01T00:00:00.000Z'));

  await listTransactions(db, 1, { limit: 10, to: '9999-12-31T23:59:59.499Z' });
  await assert.rejects(
    listTransactions(db, 1, { limit: 10, to: '9999-12-31T23:59:59.500Z' }),
    /outside the supported calendar range/,
  );
  await assert.rejects(
    listTransactions(db, 1, { limit: 10, to: '2090-01-01T00:00:00.1234Z' }),
    /to supports at most three fractional digits/,
  );
});
