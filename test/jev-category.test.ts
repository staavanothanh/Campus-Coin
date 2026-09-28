import assert from 'node:assert/strict';
import test from 'node:test';
import { suggestCategoryWithJev, type JevCategoryInput } from '../src/infrastructure/jev-category.js';

const input: JevCategoryInput = {
  transactionType: 'payment',
  description: 'Mua đồ ăn',
  candidates: [
    { id: 'food', label: 'Food' },
    { id: 'travel', label: 'Travel' },
  ],
  locale: 'vi',
};

function response(answer: unknown, status = 200) {
  return new Response(JSON.stringify({ answers: { category: answer } }), { status });
}

test('JEV stays off unless explicitly enabled with a server key', async () => {
  let requested = false;
  const result = await suggestCategoryWithJev(input, { enabled: false, apiKey: 'not-used' }, async () => {
    requested = true;
    return response({});
  });
  assert.equal(result.status, 'disabled');
  assert.equal(requested, false);
});

test('JEV returns only a high-confidence candidate from the provided set', async () => {
  const result = await suggestCategoryWithJev(input, { enabled: true, apiKey: 'server-only' }, async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { state: string; questions: unknown };
    assert.match(body.state, /Mua đồ ăn/);
    assert.ok(body.questions);
    return response({ type: 'choice', choice: 'category_1', confidence: 0.91, probabilities: { category_1: 0.91, category_2: 0.08, uncertain: 0.01 } });
  });
  assert.deepEqual(result, { status: 'suggested', categoryId: 'food', confidence: 0.91, reasonCode: null });
});

test('JEV redacts common identifiers and refuses a low-confidence choice', async () => {
  let sent = '';
  const result = await suggestCategoryWithJev({ ...input, description: 'Gọi 0912345678, email hip@example.com, mua 120.000đ ngày 27/09/2026, hóa đơn 120000' }, { enabled: true, apiKey: 'server-only' }, async (_url, init) => {
    sent = String(init?.body);
    return response({ type: 'choice', choice: 'category_1', confidence: 0.55, probabilities: { category_1: 0.55, category_2: 0.4, uncertain: 0.05 } });
  });
  assert.equal(sent.includes('0912345678'), false);
  assert.equal(sent.includes('hip@example.com'), false);
  assert.equal(sent.includes('120.000'), false);
  assert.equal(sent.includes('120000'), false);
  assert.equal(sent.includes('27/09/2026'), false);
  assert.equal(result.status, 'manual');
  assert.equal(result.categoryId, null);
  assert.equal(result.reasonCode, 'low_confidence');
});

test('JEV also redacts personal data from user-created category labels', async () => {
  let sent = '';
  await suggestCategoryWithJev({
    ...input,
    description: 'Mua đồ ăn',
    candidates: [
      { id: 'rent', label: 'Tiền nhà student@example.com 120000' },
      { id: 'food', label: 'Ăn uống' },
    ],
  }, { enabled: true, apiKey: 'server-only' }, async (_url, init) => {
    sent = String(init?.body);
    return response({ type: 'choice', choice: 'category_2', confidence: 0.9, probabilities: { category_1: 0.05, category_2: 0.9, uncertain: 0.05 } });
  });

  assert.equal(sent.includes('student@example.com'), false);
  assert.equal(sent.includes('120000'), false);
  assert.ok(sent.includes('Tiền nhà'));
});

test('JEV falls back on malformed response or provider failure', async () => {
  const malformed = await suggestCategoryWithJev(input, { enabled: true, apiKey: 'server-only' }, async () => response({ type: 'choice', choice: 'other', confidence: 0.99, probabilities: {} }));
  const unavailable = await suggestCategoryWithJev(input, { enabled: true, apiKey: 'server-only' }, async () => response({}, 429));
  assert.equal(malformed.status, 'unavailable');
  assert.equal(malformed.reasonCode, 'schema');
  assert.equal(unavailable.status, 'unavailable');
  assert.equal(unavailable.reasonCode, 'quota');
});

test('JEV cancels provider responses that exceed the byte limit while streaming', async () => {
  let cancelled = false;
  const responseBody = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(5_000));
    },
    cancel() {
      cancelled = true;
    },
  });

  const result = await suggestCategoryWithJev(
    input,
    { enabled: true, apiKey: 'server-only' },
    async () => new Response(responseBody),
  );

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reasonCode, 'schema');
  assert.equal(cancelled, true);
});
