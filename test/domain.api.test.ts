import assert from 'node:assert/strict';
import test from 'node:test';
import { domainApi } from '../src/features/domain/domain.api.ts';

test('khởi tạo ví gửi Idempotency-Key và dùng response authoritative của API', async () => {
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  let requestHeaders = new Headers();
  let requestBody: unknown;

  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestHeaders = new Headers(init?.headers);
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ data: {
        walletId: 'wallet-1',
        initialized: true,
        initialBalanceVnd: 15000,
        availableBalanceVnd: 15000,
        currency: 'VND',
        updatedAt: '2026-09-27T04:15:00.000Z',
      } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    },
  });

  try {
    const wallet = await domainApi.initializeWallet(15000, 'stable-request-key');
    assert.equal(requestHeaders.get('Idempotency-Key'), 'stable-request-key');
    assert.deepEqual(requestBody, { initialBalanceVnd: 15000 });
    assert.equal(wallet.availableBalanceVnd, 15000);
  } finally {
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch);
  }
});

test('lịch sử giữ cursor phân trang do API trả về', async () => {
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async () => new Response(JSON.stringify({
      data: [{ id: 'transaction-1', type: 'payment', amountVnd: 12000 }],
      meta: { cursor: 'next-page', hasNext: true },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  });

  try {
    const page = await domainApi.getTransactions();
    assert.equal(page.data[0]?.id, 'transaction-1');
    assert.equal(page.meta.cursor, 'next-page');
    assert.equal(page.meta.hasNext, true);
  } finally {
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch);
  }
});
