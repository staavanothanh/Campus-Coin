import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateSchemaReadiness } from '../src/infrastructure/db/readiness.ts';

test('schema readiness đạt khi đủ migration và bảng auth/domain bắt buộc', () => {
  const status = evaluateSchemaReadiness(
    ['0001', '0002', '0003', '0004', '0005'],
    [
      'schema_migrations', 'users', 'auth_identities', 'sessions', 'auth_credentials', 'email_otps', 'auth_rate_limits',
      'wallet_accounts', 'mutation_idempotency', 'ledger_transactions', 'categories', 'budgets',
      'savings_accounts', 'savings_transfers', 'issues', 'issue_events', 'audit_events',
    ],
  );

  assert.equal(status.ready, true);
  assert.deepEqual(status.missingMigrations, []);
  assert.deepEqual(status.missingTables, []);
});

test('schema readiness không đạt khi thiếu migration hoặc bảng email auth', () => {
  const status = evaluateSchemaReadiness(['0001', '0002', '0003', '0004'], ['schema_migrations', 'users', 'sessions']);

  assert.equal(status.ready, false);
  assert.deepEqual(status.missingMigrations, ['0005']);
  assert.ok(status.missingTables.includes('auth_credentials'));
  assert.ok(status.missingTables.includes('email_otps'));
  assert.ok(status.missingTables.includes('auth_identities'));
});
