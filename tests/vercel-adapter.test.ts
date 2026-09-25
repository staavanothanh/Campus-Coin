import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import handler from '../api/v1/[...path].ts';

test('Vercel handler trả health API và header không cache', async () => {
  const server = createServer((request, response) => {
    void handler(request, response);
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address !== 'object' || !address) throw new Error('Test server did not start');

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store, private');
    assert.equal((await response.json()).data.status, 'pass');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});
