import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertAuthSecrets } from '../src/features/auth/config.js';

const VALID_SECRETS = {
  OTP_SECRET: 'o'.repeat(32),
  SESSION_SECRET: 's'.repeat(32),
  AUTH_RATE_LIMIT_SECRET: 'r'.repeat(32),
};

test('auth secret validation rejects missing or shorter-than-32-byte values', () => {
  for (const name of ['OTP_SECRET', 'SESSION_SECRET', 'AUTH_RATE_LIMIT_SECRET'] as const) {
    assert.throws(() => assertAuthSecrets({ ...VALID_SECRETS, [name]: undefined }));
    assert.throws(() => assertAuthSecrets({ ...VALID_SECRETS, [name]: 'x'.repeat(31) }));
  }
});

test('auth secret validation accepts 32 UTF-8 bytes', () => {
  assert.doesNotThrow(() => assertAuthSecrets(VALID_SECRETS));
  assert.doesNotThrow(() => assertAuthSecrets({
    ...VALID_SECRETS,
    OTP_SECRET: 'é'.repeat(16),
  }));
  assert.throws(() => assertAuthSecrets({
    ...VALID_SECRETS,
    OTP_SECRET: `${'é'.repeat(15)}a`,
  }));
});
