import assert from 'node:assert/strict';
import test from 'node:test';
import { parseReceiptText, readReceiptDraft } from '../src/infrastructure/receipt-ocr.js';

const pngBase64 = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64');

test('receipt parsing finds a labeled total and returns a short draft only', () => {
  const result = parseReceiptText('Cửa hàng Sinh Viên\nCà phê sữa\nTổng thanh toán 45.000 VND');
  assert.deepEqual(result, { amountVnd: 45_000, description: 'Cửa hàng Sinh Viên' });
});

test('receipt OCR stays disabled without explicit server configuration', async () => {
  let wasCalled = false;
  await assert.rejects(
    readReceiptDraft('image/png', pngBase64, { enabled: false }, async () => {
      wasCalled = true;
      return new Response('{}');
    }),
    /RECEIPT_OCR_UNAVAILABLE/,
  );
  assert.equal(wasCalled, false);
});

test('receipt OCR validates the image MIME type and signature before provider call', async () => {
  let wasCalled = false;
  await assert.rejects(
    readReceiptDraft('image/jpeg', pngBase64, { enabled: true, apiKey: 'server-only' }, async () => {
      wasCalled = true;
      return new Response('{}');
    }),
    /RECEIPT_IMAGE_TYPE_INVALID/,
  );
  assert.equal(wasCalled, false);
});

test('receipt OCR sends the image server-side and exposes only reviewed fields', async () => {
  let requestHeaders = new Headers();
  let requestBody: unknown;
  const result = await readReceiptDraft('image/png', pngBase64, { enabled: true, apiKey: 'server-only' }, async (url, init) => {
    assert.equal(String(url), 'https://vision.googleapis.com/v1/images:annotate');
    requestHeaders = new Headers(init?.headers);
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      responses: [{ fullTextAnnotation: { text: 'Cửa hàng Sinh Viên\nTổng cộng 45.000 VND\nSDT 0912345678' } }],
    }));
  });

  assert.equal(requestHeaders.get('x-goog-api-key'), 'server-only');
  assert.deepEqual(requestBody, {
    requests: [{
      image: { content: pngBase64 },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
    }],
  });
  assert.deepEqual(result, { amountVnd: 45_000, description: 'Cửa hàng Sinh Viên' });
  assert.equal('fullTextAnnotation' in result, false);
});

test('receipt OCR rejects malformed provider data without returning raw provider errors', async () => {
  await assert.rejects(
    readReceiptDraft('image/png', pngBase64, { enabled: true, apiKey: 'server-only' }, async () => new Response('{broken json')),
    /RECEIPT_OCR_RESPONSE_INVALID/,
  );
});
