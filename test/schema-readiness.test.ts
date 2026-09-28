import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { evaluateSchemaReadiness } from '../src/infrastructure/db/readiness.ts';
import { scanMigrationDir } from '../src/infrastructure/db/migration-engine.ts';

const tableNames = [
  'schema_migrations', 'users', 'auth_identities', 'sessions', 'auth_credentials', 'email_otps', 'auth_rate_limits',
  'wallet_accounts', 'mutation_idempotency', 'ledger_transactions', 'categories', 'budgets',
  'savings_accounts', 'savings_transfers', 'issues', 'issue_events', 'audit_events',
  'cashflow_plans', 'cashflow_plan_status_events',
];
const columns = [
  { tableName: 'wallet_accounts', columnName: 'available_balance_vnd' },
  { tableName: 'ledger_transactions', columnName: 'user_id' },
  { tableName: 'ledger_transactions', columnName: 'amount_vnd' },
  { tableName: 'ledger_transactions', columnName: 'item_name' },
];

async function currentMigrations() {
  return scanMigrationDir(path.resolve(process.cwd(), 'db', 'migrations'));
}

test('schema readiness đạt khi migration, checksum và bảng auth/domain đều đúng', async () => {
  const expectedMigrations = await currentMigrations();
  const status = evaluateSchemaReadiness(
    expectedMigrations,
    expectedMigrations.map(({ version, checksum }) => ({ version, checksum })),
    tableNames,
    columns,
  );

  assert.equal(status.ready, true);
  assert.deepEqual(status.missingMigrations, []);
  assert.deepEqual(status.mismatchedMigrations, []);
  assert.deepEqual(status.unknownAppliedMigrations, []);
  assert.deepEqual(status.missingTables, []);
  assert.deepEqual(status.missingColumns, []);
});

test('schema readiness từ chối migration thiếu, checksum lệch hoặc thiếu bảng', async () => {
  const expectedMigrations = await currentMigrations();
  const appliedMigrations = expectedMigrations
    .filter(migration => migration.version !== '0013')
    .map(({ version, checksum }) => ({ version, checksum }));
  const changedChecksum = appliedMigrations.find(migration => migration.version === '0006');
  assert.ok(changedChecksum);
  changedChecksum.checksum = 'not-the-recorded-checksum';

  const status = evaluateSchemaReadiness(
    expectedMigrations,
    [...appliedMigrations, { version: '9999', checksum: 'unknown-migration' }],
    ['schema_migrations', 'users', 'sessions'],
    columns,
  );

  assert.equal(status.ready, false);
  assert.deepEqual(status.missingMigrations, ['0013']);
  assert.deepEqual(status.mismatchedMigrations, ['0006']);
  assert.deepEqual(status.unknownAppliedMigrations, ['9999']);
  assert.ok(status.missingTables.includes('auth_credentials'));
  assert.ok(status.missingTables.includes('email_otps'));
  assert.ok(status.missingTables.includes('auth_identities'));
  assert.ok(status.missingTables.includes('cashflow_plans'));
  assert.deepEqual(status.missingColumns, []);
});

test('schema readiness rejects a missing item_name column even when migration history matches', async () => {
  const expectedMigrations = await currentMigrations();
  const appliedMigrations = expectedMigrations.map(({ version, checksum }) => ({ version, checksum }));
  const status = evaluateSchemaReadiness(
    expectedMigrations,
    appliedMigrations,
    tableNames,
    columns.filter(column => column.columnName !== 'item_name'),
  );

  assert.equal(status.ready, false);
  assert.deepEqual(status.missingColumns, ['ledger_transactions.item_name']);
});

test('schema readiness rejects a missing wallet balance or ledger amount column', async () => {
  const expectedMigrations = await currentMigrations();
  const appliedMigrations = expectedMigrations.map(({ version, checksum }) => ({ version, checksum }));
  const availableColumns = columns.filter(column => column.columnName !== 'available_balance_vnd'
    && column.columnName !== 'amount_vnd');
  const status = evaluateSchemaReadiness(expectedMigrations, appliedMigrations, tableNames, availableColumns);

  assert.equal(status.ready, false);
  assert.deepEqual(status.missingColumns, [
    'wallet_accounts.available_balance_vnd',
    'ledger_transactions.amount_vnd',
  ]);
});

test('schema readiness rejects an unknown applied migration by itself', async () => {
  const expectedMigrations = await currentMigrations();
  const appliedMigrations = [
    ...expectedMigrations.map(({ version, checksum }) => ({ version, checksum })),
    { version: '9999', checksum: 'unknown-migration' },
  ];
  const status = evaluateSchemaReadiness(expectedMigrations, appliedMigrations, tableNames, columns);

  assert.equal(status.ready, false);
  assert.deepEqual(status.missingMigrations, []);
  assert.deepEqual(status.mismatchedMigrations, []);
  assert.deepEqual(status.unknownAppliedMigrations, ['9999']);
  assert.deepEqual(status.missingTables, []);
  assert.deepEqual(status.missingColumns, []);
});
