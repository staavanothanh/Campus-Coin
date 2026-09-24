import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createApiServer } from '../src/routes/api.js';
import { checkPassword, equalHash, hashOtp, hashPassword, newOtp } from '../src/features/auth/security.js';

process.env.OTP_SECRET = randomBytes(32).toString('hex');

test('OTP luôn gồm sáu chữ số', () => {
  for (let i = 0; i < 100; i++) assert.match(newOtp(), /^\d{6}$/);
});

test('OTP đăng ký không dùng lại được cho đặt lại mật khẩu', () => {
  const first = hashOtp('student@example.com', 'registration', '123456');
  const second = hashOtp('student@example.com', 'password_reset', '123456');
  assert.equal(equalHash(first, first), true);
  assert.equal(equalHash(first, second), false);
});

test('mật khẩu được băm với salt riêng và xác minh đúng', async () => {
  const first = await hashPassword('ExamplePassword123');
  const second = await hashPassword('ExamplePassword123');
  assert.notEqual(first.hash, second.hash);
  assert.equal(await checkPassword('ExamplePassword123', first.hash, first.salt), true);
  assert.equal(await checkPassword('WrongPassword123', first.hash, first.salt), false);
});

const server = createApiServer();
let baseUrl = '';
before(async () => {
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address();
  if (typeof address !== 'object' || !address) throw new Error('Server chưa chạy');
  baseUrl = `http://127.0.0.1:${address.port}`;
});
after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });

test('POST từ origin lạ bị chặn trước khi đọc dữ liệu', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { origin: 'https://example.invalid', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'a@example.com' })
  });
  assert.equal(response.status, 403);
  const result = await response.json();
  assert.equal(result.error.code, 'ORIGIN_INVALID');
});

test('gửi lại OTP chỉ chấp nhận mục đích đăng ký hoặc quên mật khẩu', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/resend-otp`, {
    method: 'POST',
    headers: { origin: 'http://127.0.0.1:5173', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'student@example.com', purpose: 'other' })
  });
  assert.equal(response.status, 422);
  const result = await response.json();
  assert.equal(result.error.code, 'VALIDATION_ERROR');
});

test('xác minh đăng ký cần mật khẩu trước khi truy vấn database', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/verify-registration`, {
    method: 'POST',
    headers: { origin: 'http://127.0.0.1:5173', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'student@example.com', otp: '123456', fullName: 'Student' })
  });
  assert.equal(response.status, 422);
  const result = await response.json();
  assert.equal(result.error.code, 'VALIDATION_ERROR');
});

test('đường dẫn không tồn tại trả 404', async () => {
  const response = await fetch(`${baseUrl}/api/v1/no-route`);
  assert.equal(response.status, 404);
});

test('health liveness không phụ thuộc cơ sở dữ liệu', async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  assert.equal(response.status, 200);
});

test('provider discovery báo Google đang tắt khi chưa cấu hình', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/providers`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { google: false } });
});

test('API không cho đọc OTP qua đường dẫn kiểm thử cũ', async () => {
  const response = await fetch(`${baseUrl}/api/v1/test/latest-otp?email=student@example.com`);
  assert.equal(response.status, 404);
});

test('đăng xuất lặp không phiên chỉ xóa cookie phiên', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { origin: 'http://127.0.0.1:5173', 'content-type': 'application/json' },
    body: '{}'
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') || '', /Max-Age=0/);
});

test('đọc wallet cần session hợp lệ', async () => {
  const response = await fetch(`${baseUrl}/api/v1/wallet`);
  assert.equal(response.status, 401);
  const result = await response.json();
  assert.equal(result.error.code, 'UNAUTHORIZED');
});

test('mutation domain thiếu session trả 401 trước khi đọc body hoặc truy cập database', async () => {
  const response = await fetch(`${baseUrl}/api/v1/wallet/baseline`, {
    method: 'POST',
    headers: { origin: 'http://127.0.0.1:5173', 'content-type': 'application/json' },
    body: JSON.stringify({ initialBalanceVnd: 10_000 }),
  });
  assert.equal(response.status, 401);
  const result = await response.json();
  assert.equal(result.error.code, 'UNAUTHORIZED');
});
