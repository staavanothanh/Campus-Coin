import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('API startup reports unreadable verify-ca file without waiting on MySQL', () => {
  const caPath = path.join(os.tmpdir(), `missing-campus-coin-ca-${process.pid}.pem`);
  const env = {
    ...process.env,
    OTP_SECRET: 'o'.repeat(32),
    SESSION_SECRET: 's'.repeat(32),
    AUTH_RATE_LIMIT_SECRET: 'r'.repeat(32),
    CLIENT_ORIGIN: 'http://127.0.0.1:5173',
    SMTP_HOST: '127.0.0.1',
    SMTP_USER: 'test-user',
    SMTP_PASS: 'test-password',
    EMAIL_FROM: 'test@example.invalid',
    CAMPUS_COIN_DB_HOST: '127.0.0.1',
    CAMPUS_COIN_DB_PORT: '3306',
    CAMPUS_COIN_DB_NAME: 'campus_coin_local',
    CAMPUS_COIN_DB_USER: 'test-user',
    CAMPUS_COIN_DB_PASSWORD: 'test-password',
    CAMPUS_COIN_DB_SSL: 'verify-ca',
    CAMPUS_COIN_DB_CA_PATH: caPath,
    CAMPUS_COIN_DB_CA_BASE64: '',
  };
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/local-server.ts'], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    timeout: 15_000,
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /CAMPUS_COIN_DB_CA_PATH.*readable CA certificate/);
  assert.doesNotMatch(result.stderr, /Timed out waiting for/);
  assert.doesNotMatch(result.stderr, new RegExp(caPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
