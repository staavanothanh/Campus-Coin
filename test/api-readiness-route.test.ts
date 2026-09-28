import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createApiServer } from '../src/routes/api.ts';

async function withApiServer(
  checkSchema: () => Promise<void>,
  run: (baseUrl: string) => Promise<void>,
) {
  const server = createApiServer({ checkSchema });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
}

test('local readiness endpoint checks schema and returns a sanitized 503 when it is unavailable', async () => {
  let checks = 0;
  await withApiServer(async () => {
    checks += 1;
    throw new Error('private database detail');
  }, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/health/ready`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store, private');
    assert.equal(body.error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(JSON.stringify(body).includes('private database detail'), false);
    assert.equal(checks, 1);
  });
});

test('local schema-independent health and provider routes stay available when the schema is unavailable', async () => {
  let checks = 0;
  await withApiServer(async () => {
    checks += 1;
    throw new Error('private database detail');
  }, async baseUrl => {
    const health = await fetch(`${baseUrl}/api/v1/health`);
    const providers = await fetch(`${baseUrl}/api/v1/auth/providers`);
    const session = await fetch(`${baseUrl}/api/v1/auth/session`);

    assert.equal(health.status, 200);
    assert.equal(providers.status, 200);
    assert.equal(session.status, 503);
    assert.equal(checks, 1);
  });
});

test('local readiness endpoint returns pass only after schema check succeeds', async () => {
  let checks = 0;
  await withApiServer(async () => {
    checks += 1;
  }, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/health/ready`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.data.checks, { database: 'pass', schema: 'pass' });
    assert.equal(checks, 1);
  });
});
