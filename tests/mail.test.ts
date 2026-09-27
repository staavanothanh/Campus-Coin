import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import { after, test } from 'node:test';
import { sendOtp } from '../src/infrastructure/mail.ts';

const smtpVariables = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'SMTP_TIMEOUT_MS', 'EMAIL_FROM'] as const;
const originalValues = new Map(smtpVariables.map(name => [name, process.env[name]]));
const openSockets = new Set<Socket>();
let connectionCount = 0;
const server = createServer(socket => {
  connectionCount += 1;
  openSockets.add(socket);
  socket.on('close', () => openSockets.delete(socket));
});
let port = 0;

test('SMTP timeout retry có giới hạn và không trả OTP trong lỗi', async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address !== 'object' || !address) throw new Error('SMTP test server did not start');
  port = address.port;

  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(port);
  process.env.SMTP_USER = 'test-user';
  process.env.SMTP_PASS = 'test-password';
  process.env.SMTP_SECURE = 'false';
  process.env.SMTP_TIMEOUT_MS = '1000';
  process.env.EMAIL_FROM = 'test@example.invalid';

  const startedAt = Date.now();
  await assert.rejects(
    sendOtp('student@example.invalid', '847261', 'registration'),
    error => {
      assert.equal((error as Error).message, 'SMTP delivery failed');
      assert.doesNotMatch((error as Error).message, /847261|test-password/);
      return true;
    },
  );

  assert.equal(connectionCount, 2, 'the mail adapter should make only two attempts');
  assert.ok(Date.now() - startedAt < 8_000, 'SMTP timeout and two attempts should stay bounded');
  const closeDeadline = Date.now() + 1_000;
  while (openSockets.size > 0 && Date.now() < closeDeadline) {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.equal(openSockets.size, 0, 'SMTP retry connections should close after timeout');
});

after(async () => {
  for (const socket of openSockets) socket.destroy();
  if (server.listening) {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
  for (const name of smtpVariables) {
    const originalValue = originalValues.get(name);
    if (originalValue === undefined) delete process.env[name];
    else process.env[name] = originalValue;
  }
});
