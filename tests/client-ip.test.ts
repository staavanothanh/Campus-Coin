import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getClientIp } from '../src/routes/client-ip.ts';

test('ignores a forged X-Forwarded-For header from an untrusted peer', () => {
  const ip = getClientIp('203.0.113.10', '198.51.100.99', true, ['192.0.2.10']);

  assert.equal(ip, '203.0.113.10');
});

test('uses the client address after walking back through configured proxies', () => {
  const ip = getClientIp(
    '192.0.2.10',
    '198.51.100.25, 192.0.2.20',
    true,
    ['192.0.2.10', '192.0.2.20'],
  );

  assert.equal(ip, '198.51.100.25');
});

test('ignores the forwarded header when proxy trust is off or missing', () => {
  assert.equal(getClientIp('203.0.113.10', '198.51.100.99', false, ['203.0.113.10']), '203.0.113.10');
  assert.equal(getClientIp('203.0.113.10', '198.51.100.99', true, []), '203.0.113.10');
});

test('rejects a malformed forwarded chain and normalizes mapped IPv4 peers', () => {
  assert.equal(getClientIp('192.0.2.10', 'not-an-ip', true, ['192.0.2.10']), '192.0.2.10');
  assert.equal(getClientIp('::ffff:127.0.0.1', '198.51.100.25', true, ['127.0.0.1']), '198.51.100.25');
});
