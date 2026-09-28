import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createVercelHandler } from '../api/v1/[...path].ts';

function request(method: string, url: string): IncomingMessage {
  return { method, url, headers: {} } as unknown as IncomingMessage;
}

function responseRecorder() {
  let statusCode: number | undefined;
  let headers: Record<string, string> = {};
  let body = '';
  const response = {
    writeHead(status: number, responseHeaders: Record<string, string>) {
      statusCode = status;
      headers = responseHeaders;
      return response;
    },
    end(content?: string) {
      body = content ?? '';
      return response;
    },
  } as unknown as ServerResponse;
  return {
    response,
    get statusCode() { return statusCode; },
    get headers() { return headers; },
    get body() { return body; },
  };
}

test('Vercel API fails closed when database schema is not ready', async () => {
  let routeCalled = false;
  const handler = createVercelHandler(
    async () => { throw new Error('private database detail'); },
    async () => { routeCalled = true; },
  );
  const response = responseRecorder();

  await handler(request('POST', '/api/v1/auth/login'), response.response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.headers['Cache-Control'], 'no-store, private');
  assert.equal(response.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(response.headers['X-Frame-Options'], 'DENY');
  assert.equal(response.headers['Referrer-Policy'], 'no-referrer');
  assert.deepEqual(JSON.parse(response.body), {
    error: { code: 'SERVICE_UNAVAILABLE', message: 'Hệ thống đang bận, vui lòng thử lại' },
  });
  assert.equal(response.body.includes('private database detail'), false);
  assert.equal(routeCalled, false);
});

test('Vercel liveness, readiness, and provider discovery reach their dedicated routes', async () => {
  let schemaChecks = 0;
  let routeCalls = 0;
  const handler = createVercelHandler(
    async () => { schemaChecks += 1; },
    async () => { routeCalls += 1; },
  );

  for (const path of ['/api/v1/health', '/api/v1/health/ready', '/api/v1/auth/providers']) {
    await handler(request('GET', path), responseRecorder().response);
  }

  assert.equal(schemaChecks, 0);
  assert.equal(routeCalls, 3);
});
